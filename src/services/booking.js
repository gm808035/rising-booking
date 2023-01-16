const { Op, DatabaseError } = require("sequelize");
const {
  add,
  parse,
  differenceInMinutes,
  sub,
  startOfTomorrow,
  endOfTomorrow,
  format,
  formatISO,
} = require("date-fns");
const { utcToZonedTime, zonedTimeToUtc } = require("date-fns-tz");
const baseService = require("./baseService");
const { db, retryWithTransaction } = require("../lib/db");
const sqs = require("../lib/sqs");
const { createBookingRef } = require("../lib/booking");
const { getSessionId } = require("../lib/auth");
const dynamoDb = require("../lib/dynamodb");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { BookingSource } = require("./const");

const parseBookingForAPI = (booking) => ({
  booking_key: booking.reference,
  expires_at: add(new Date(), { minutes: 20 }).toISOString(),
});

const validate = (data) => {
  const errors = [];
  if (!data.booking_location?.booking_timestamp) {
    errors.push("booking start time required");
  }

  const isoStringRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
  if (
    data.booking_location?.booking_timestamp &&
    !isoStringRegex.test(data.booking_location?.booking_timestamp)
  ) {
    errors.push("booking start time must be an ISO String");
  }

  if (!data.booking_location?.box_id) {
    errors.push("box required");
  }

  if (!data.booking_location?.box_slot_id) {
    errors.push("box slot required");
  }

  if (!data.booking_location?.venue_id) {
    errors.push("venue required");
  }

  if (!data.booking_location?.booking_duration) {
    errors.push("duration required");
  }

  if (!data.booking_guests?.guests_no) {
    errors.push("number of guests required");
  }

  if (data.booking_notes && data.booking_notes.length > 255) {
    errors.push("booking notes cannot be more than 255 characters");
  }

  if (
    data.booking_guests?.guests_no < 1 ||
    data.booking_guests?.guests_no > 30
  ) {
    errors.push("number of guests must be between 1 and 30");
  }

  if (data.booking_packages && typeof data.booking_packages !== "string") {
    errors.push("packages must be a JSON string");
  }

  if (errors.length) {
    throw new ValidationError("000", errors.join("|"));
  }
};

const getSchedule = async (sequelize, venue, bookingTimestamp) => {
  const { OpenTime, Schedule, VenueSchedule } = await db(sequelize);

  const reqDate = formatISO(bookingTimestamp, { representation: "date" });

  const splitDate = reqDate.split("-");
  const date = new Date(
    splitDate[0],
    parseInt(splitDate[1], 10) - 1,
    splitDate[2]
  ).toISOString();

  const schedule = await Schedule.findAll({
    where: {
      appliedDates: sequelize.where(
        sequelize.fn(
          "JSON_SEARCH",
          sequelize.col("applied_dates"),
          sequelize.literal(`'all'`),
          sequelize.literal(`"${date}"`)
        ),
        {
          [Op.ne]: null,
        }
      ),
    },
    include: [
      {
        model: VenueSchedule,
        where: {
          venue_id: venue,
        },
      },
      {
        model: OpenTime,
      },
    ],
    order: [["date_of_apply", "DESC"]],
  });

  return schedule;
};

const upsertBooking = async ({
  sequelize,
  fields,
  reference = createBookingRef(),
  sessionId,
  update = false,
}) => {
  try {
    return await retryWithTransaction(sequelize, async (transaction) => {
      console.info("Upsert booking", fields);

      const { Venue, Box, BoxBooking, BoxSlot, BoxSlotLink, Price, Booking } =
        await db(sequelize);
      let booking;

      if (update) {
        booking = await Booking.findOne({
          where: {
            reference,
            sessionId,
          },
          include: [
            {
              model: Venue,
            },
            {
              model: BoxBooking,
            },
          ],
          transaction,
        });
        console.log("Booking found", JSON.stringify(booking));

        if (!booking) {
          throw new ValidationError("006");
        }
      } else {
        booking = Booking.build({
          reference,
          sessionId,
        });
      }

      if (fields.source) {
        booking.set("source", fields.source);
      }
      if (fields.booking_extras) {
        booking.set("extras", fields.booking_extras);
      }
      if (fields.booking_packages) {
        booking.set("packages", fields.booking_packages);
      }
      if (fields.booking_notes) {
        booking.set("notes", fields.booking_notes);
      }
      if (fields.booking_guests) {
        booking.set("guestsNo", fields.booking_guests.guests_no);
      }
      if (fields.booking_location) {
        const bookingTimestamp = new Date(
          fields.booking_location.booking_timestamp
        );

        const venue = await Venue.findByPk(fields.booking_location.venue_id, {
          include: [
            {
              model: Box,
              required: false,
              where: {
                id: fields.booking_location.box_id,
              },
            },
            {
              model: Box,
              required: false,
              where: {
                id: fields.booking_location.box_id,
              },
              include: {
                model: BoxSlot,
                required: false,
                where: {
                  id: fields.booking_location.box_slot_id,
                },
              },
            },
          ],
          transaction,
        });

        if (!venue) {
          throw new NotFoundError("001");
        }

        if (!venue.Boxes.length) {
          throw new NotFoundError("002");
        }

        if (!venue.Boxes[0].BoxSlots.length) {
          throw new NotFoundError("003");
        }

        const schedule = await getSchedule(
          sequelize,
          fields.booking_location.venue_id,
          bookingTimestamp
        );

        if (schedule.length === 0) {
          throw new NotFoundError("021");
        }

        const bookingStartTime = utcToZonedTime(
          new Date(fields.booking_location.booking_timestamp),
          venue.timezone
        );
        const bookingEndTime = add(new Date(bookingStartTime), {
          minutes: fields.booking_location.booking_duration,
        });

        const boxSlotStartTime = parse(
          venue.Boxes[0].BoxSlots[0].start,
          "HH:mm:ss",
          new Date(bookingStartTime)
        );

        const boxSlotBookingDifference = differenceInMinutes(
          boxSlotStartTime,
          bookingStartTime
        );

        if (boxSlotBookingDifference !== 0) {
          console.info({
            boxSlotBookingDifference,
            boxSlotStartTime,
            bookingStartTime,
          });
          throw new ValidationError("004");
        }

        const existingBooking = await Booking.findOne({
          where: {
            reference: { [Op.ne]: reference },
            venue_id: fields.booking_location.venue_id,
            start: {
              [Op.gte]: bookingStartTime,
            },
            end: {
              [Op.lte]: bookingEndTime,
            },
          },
          include: {
            model: BoxBooking,
            where: {
              box_id: fields.booking_location.box_id,
            },
          },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (existingBooking) {
          throw new ValidationError("005");
        }

        const priceType = await Price.findOne({
          where: {
            open_time_id: schedule[0].OpenTime.id,
            start: {
              [Op.lte]: format(
                utcToZonedTime(bookingTimestamp, venue.timezone),
                "HH:mm:ss"
              ),
            },
            end: {
              [Op.gte]: format(
                utcToZonedTime(bookingTimestamp, venue.timezone),
                "HH:mm:ss"
              ),
            },
          },
          transaction,
        });

        if (!priceType) {
          throw new ValidationError("010");
        }

        booking.set("start", bookingStartTime);
        booking.set("end", bookingEndTime);
        booking.set("boxSlotStart", boxSlotStartTime);

        const boxSlotEndTime = add(new Date(boxSlotStartTime), {
          minutes: fields.booking_location.booking_duration,
        });
        booking.set("boxSlotEnd", boxSlotEndTime);

        // save first to create it and then associate to venue...
        await booking.save({ transaction });
        await booking.setVenue(venue, { transaction });

        const boxBookings = [
          BoxBooking.create({ BoxId: venue.Boxes[0].id }, { transaction }),
        ];

        if (fields.booking_location.linked_box_slot_id) {
          const linkedBoxSlot = await BoxSlotLink.findOne({
            where: {
              id: fields.booking_location.linked_box_slot_id,
            },
            transaction,
          });

          if (!linkedBoxSlot) {
            throw new NotFoundError("011");
          }

          let boxSlotId;
          if (fields.booking_location.box_slot_id === linkedBoxSlot.BoxSlotId) {
            boxSlotId = linkedBoxSlot.linked_box_slot_id;
          } else if (
            fields.booking_location.box_slot_id ===
            linkedBoxSlot.linked_box_slot_id
          ) {
            boxSlotId = linkedBoxSlot.BoxSlotId;
          }

          const boxSlot = await BoxSlot.findByPk(boxSlotId, {
            include: Box,
            transaction,
          });
          if (!boxSlot) {
            throw new NotFoundError("003");
          }

          if (!boxSlot.Box) {
            throw new NotFoundError("002");
          }

          boxBookings.push(
            BoxBooking.create({ BoxId: boxSlot.Box.id }, { transaction })
          );
        }

        // calculates the price based on the amount of boxes assigned
        const price = Math.floor(
          priceType.price *
            (fields.booking_location.booking_duration / 60) *
            boxBookings.length
        );

        booking.set("price", price);

        const boxIds = await Promise.all(boxBookings);

        // ...and box
        await booking.setBoxBookings(boxIds, { transaction });
      }

      await booking.save({ transaction });

      return booking;
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      // deadlock will happen when bookings table is updated while trying to add new booking and failed all retries
      throw new ValidationError("005");
    }
    throw error;
  }
};

const createBooking = async (event) =>
  baseService(async (sequelize) => {
    const data = JSON.parse(event.body);

    validate(data);

    const booking = await upsertBooking({
      sequelize,
      sessionId: getSessionId(event),
      fields: { ...data, source: BookingSource.ONLINE },
    });

    return {
      body: parseBookingForAPI(booking),
    };
  });

const updateBooking = async (event) =>
  baseService(async (sequelize) => {
    const { bookingKey } = event.pathParameters;
    const data = JSON.parse(event.body);

    const booking = await upsertBooking({
      sequelize,
      reference: bookingKey,
      sessionId: getSessionId(event),
      fields: data,
      update: true,
    });

    if (data?.booking_extras) {
      await dynamoDb.updatePartialItem({ booking });
      await sqs.sendMessage({ type: "drinks-confirmation", booking });
    }

    return {
      body: parseBookingForAPI(booking),
    };
  });

const findBooking = async (sequelize, where) => {
  const { Booking, BoxBooking, Venue } = await db(sequelize);

  return Booking.findOne({
    where,
    include: [
      {
        model: Venue,
      },
      {
        model: BoxBooking,
      },
    ],
  });
};

const parseBooking = (booking = {}) => ({
  start: zonedTimeToUtc(booking.start, booking.Venue.timezone),
  end: zonedTimeToUtc(booking.end, booking.Venue.timezone),
  box_slot_start: booking.boxSlotStart
    ? zonedTimeToUtc(booking.boxSlotStart, booking.Venue.timezone)
    : null,
  box_slot_end: booking.boxSlotEnd
    ? zonedTimeToUtc(booking.boxSlotEnd, booking.Venue.timezone)
    : null,
  price: booking.price,
  reference: booking.reference,
  status: booking.status,
  source: booking.source,
  type: booking.type,
  extras: booking.extras,
  packages: booking.packages,
  notes: booking.notes,
  guests_no: booking.guestsNo,
  checkin_at: booking.checkinAt,
  box_ids: booking.BoxBookings.map(({ BoxId }) => BoxId).filter(Boolean),
});

const getBooking = async (event) =>
  baseService(async (sequelize) => {
    const { bookingKey } = event.pathParameters;

    const booking = await findBooking(sequelize, {
      reference: bookingKey,
      sessionId: getSessionId(event),
    });
    if (!booking) {
      throw new ValidationError("006");
    }

    return {
      body: parseBooking(booking),
    };
  });

const getBookingPrice = async (sessionId) =>
  baseService(async (sequelize) => {
    const booking = await findBooking(sequelize, {
      sessionId,
    });

    if (!booking) {
      console.error(`[getBookingPrice] no booking found for ${sessionId}`);
      return { body: null };
    }

    booking.set("status", "Payment in progress");

    await booking.save();

    return {
      body: parseBooking(booking),
    };
  });

const cancelBooking = async (sessionId) =>
  baseService(async (sequelize) => {
    const booking = await findBooking(sequelize, {
      sessionId,
    });

    if (!booking) {
      console.error(`[cancelBooking] no booking found for ${sessionId}`);
      return { body: null };
    }

    booking.set("status", "Cancelled");

    await booking.save();

    return {
      body: parseBooking(booking),
    };
  });

const confirmBooking = async (sessionId) =>
  baseService(async (sequelize) => {
    const booking = await findBooking(sequelize, {
      sessionId,
    });

    if (!booking) {
      console.error(`[confirmBooking] no booking found for ${sessionId}`);
      return { body: null };
    }

    const { OpenTime, Price } = await db(sequelize);

    const bookingTimestamp = zonedTimeToUtc(
      new Date(booking.start),
      booking.Venue.timezone
    );

    const schedule = await getSchedule(
      sequelize,
      booking.Venue.id,
      bookingTimestamp
    );

    if (schedule.length === 0) {
      throw new NotFoundError("021");
    }

    const priceType = await Price.findOne({
      where: {
        start: {
          [Op.lte]: format(
            utcToZonedTime(bookingTimestamp, booking.Venue.timezone),
            "HH:mm:ss"
          ),
        },
        end: {
          [Op.gte]: format(
            utcToZonedTime(bookingTimestamp, booking.Venue.timezone),
            "HH:mm:ss"
          ),
        },
      },
      include: {
        model: OpenTime,
        where: {
          id: schedule[0].OpenTime.id,
        },
      },
    });

    if (!priceType) {
      throw new ValidationError("010");
    }

    booking.set("status", "Paid");

    await booking.save();

    try {
      await dynamoDb.updateItem({ booking }, priceType.type);
    } catch (error) {
      console.error("[confirmBooking] failed to update dynamodb", error);
    }

    const type =
      booking.source === "walkin"
        ? "apollo-confirmation"
        : "booking-confirmation";

    await sqs.sendMessage({ type, booking });

    return {
      body: parseBooking(booking),
    };
  });

const clearReservedBookings = () =>
  baseService(async (sequelize) => {
    const { Booking } = await db(sequelize);
    const deletedBookings = await Booking.destroy({
      where: {
        status: {
          [Op.or]: {
            [Op.not]: "Paid",
            [Op.is]: null,
          },
        },
        type: {
          [Op.or]: {
            [Op.not]: "other",
            [Op.is]: null,
          },
        },
        [Op.or]: [
          {
            updatedAt: {
              [Op.lte]: sub(new Date(), { minutes: 20 }),
            },
          },
          {
            updatedAt: {
              [Op.lte]: sub(new Date(), { minutes: 5 }),
            },
            source: {
              [Op.eq]: "walkin",
            },
          },
        ],
      },
    });
    console.info({ deletedBookings });
    return { body: deletedBookings };
  });

const pushEmailReminders = () =>
  baseService(async (sequelize) => {
    const { Booking } = await db(sequelize);
    const where = {
      start: {
        [Op.gte]: startOfTomorrow(),
        [Op.lte]: endOfTomorrow(),
      },
      sessionId: {
        [Op.not]: null,
      },
      status: "Paid",
      type: "social",
    };
    const bookingsStartingTomorrow = await Booking.findAll({ where });
    const promises = bookingsStartingTomorrow.map((booking) =>
      // TODO candidate for SendMessageBatch but we need support on email service for processing multiple records,
      // currently only doing records[0]
      sqs.sendMessage({ type: "booking-reminder", booking })
    );

    await Promise.all(promises);

    console.info({ bookingsStartingTomorrow });
    return { body: bookingsStartingTomorrow };
  });

module.exports = {
  clearReservedBookings,
  createBooking,
  updateBooking,
  getBooking,
  getBookingPrice,
  cancelBooking,
  confirmBooking,
  pushEmailReminders,
  getSchedule,
};
