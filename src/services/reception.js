const { Op } = require("sequelize");
const { add, sub, isValid, differenceInMinutes } = require("date-fns");
const baseService = require("./baseService");
const { db } = require("../lib/db");
const { createBookingRef } = require("../lib/booking");
const { NotFoundError, ValidationError } = require("../lib/errors");
const dynamoDb = require("../lib/dynamodb");
const eventBridge = require("../lib/eventbridge");
const { getSessionId } = require("../lib/auth");
const { getVenueByCode } = require("./availability");
const { getSchedule } = require("./booking");
const defaultOpenTime = require("../lib/defaultOpenTime");
const { Cleanup } = require("./const");

const { EVENT_BUS_AUDIT } = process.env;

const parse = (booking) => {
  const boxSlotStart = booking.boxSlotStart ?? booking.start;
  const boxSlotEnd =
    booking.boxSlotEnd ??
    add(new Date(boxSlotStart), {
      minutes: differenceInMinutes(booking.end, booking.start),
    });

  return {
    booking_key: booking.reference,
    booking_start: booking.start,
    booking_box_slot_start: boxSlotStart,
    booking_players: booking.guestsNo,
    booking_end: booking.end,
    booking_box_slot_end: boxSlotEnd,
    booking_notes: booking.notes,
    booking_extras: booking.extras,
    booking_packages: booking.packages,
    booking_type: booking.type,
    booking_source: booking.source,
    booking_status: booking.status,
    booking_checkin_at: booking.checkinAt ?? null,
    booking_created_at: booking.createdAt,
    booking_updated_at: booking.updatedAt,
    box_ids: booking.BoxBookings.map(({ BoxId }) => BoxId),
    venue_id: booking.VenueId,
    session_id: booking.sessionId,
  };
};

const validateFilter = (data) => {
  const errors = [];
  if (!data.day) {
    errors.push("day required");
  }

  if (!isValid(new Date(data.day))) {
    errors.push("day is invalid date");
  }

  if (!data.venue_code) {
    errors.push("venue required");
  }

  if (data.cancelled && typeof data.cancelled !== "boolean") {
    errors.push("cancelled property needs to be true or false");
  }

  if (errors.length) {
    throw new ValidationError("000", errors.join("|"));
  }
};

const filter = async (event) =>
  baseService(async (sequelize) => {
    const data = JSON.parse(event.body);

    validateFilter(data);

    const { Booking, BoxBooking, Venue } = await db(sequelize);
    const venue = await Venue.findOne({
      where: {
        code: data.venue_code,
      },
    });

    if (!venue) {
      console.warn(
        `[receptionFilter] no venue found with code  ${data.venue_code}`
      );
      throw new NotFoundError("006");
    }

    const date = new Date(data.day);
    const where = {
      venue_id: venue.id,
      start: {
        [Op.gte]: date,
        [Op.lt]: add(new Date(date), { days: 1 }),
      },
    };

    if (data.from_timestamp) {
      where.updated_at = {
        [Op.gte]: new Date(data.from_timestamp),
      };
    }

    if (data.cancelled) {
      where.status = "Cancelled";
    }

    const bookings = await Booking.findAll({
      where,
      paranoid: !data.cancelled,
      include: BoxBooking,
    });

    return {
      body: { bookings: bookings.map(parse) },
    };
  });

const setBookingStart = (booking, start) => {
  const dateStart = new Date(start);
  booking.set(
    "start",
    sub(new Date(dateStart), {
      // :TODO should use CleanUp 10 min constant after global change
      minutes: dateStart.getMinutes() % Cleanup,
      seconds: dateStart.getSeconds(),
    })
  );
  booking.set(
    "boxSlotStart",
    sub(new Date(dateStart), {
      minutes: dateStart.getMinutes() % Cleanup,
      seconds: dateStart.getSeconds(),
    })
  );
  return booking;
};

const setBookingEnd = (booking, end) => {
  const dateEnd = new Date(end);

  if (dateEnd.getMinutes() === 59 && dateEnd.getHours() === 23) {
    booking.set(
      "end",
      sub(new Date(dateEnd), {
        seconds: dateEnd.getSeconds(),
      })
    );
    booking.set(
      "boxSlotEnd",
      sub(new Date(dateEnd), {
        seconds: dateEnd.getSeconds(),
      })
    );
  } else {
    booking.set(
      "end",
      sub(new Date(dateEnd), {
        // :TODO should use CleanUp 10 min constant after global change
        minutes: dateEnd.getMinutes() % Cleanup,
        seconds: dateEnd.getSeconds(),
      })
    );
    booking.set(
      "boxSlotEnd",
      sub(new Date(dateEnd), {
        minutes: dateEnd.getMinutes() % Cleanup,
        seconds: dateEnd.getSeconds(),
      })
    );
  }

  return booking;
};

const validateCreate = (data) => {
  const errors = [];
  if (!data.booking_location?.venue_id) {
    errors.push("venue_id required");
  }

  if (!data.booking_location?.box_id) {
    errors.push("box_id required");
  }

  if (!data.booking_location?.booking_start) {
    errors.push("booking_start required");
  }

  if (!isValid(new Date(data.booking_location?.booking_start))) {
    errors.push("booking_start is invalid date");
  }

  if (!data.booking_location?.booking_end) {
    errors.push("booking_end required");
  }

  if (!isValid(new Date(data.booking_location?.booking_end))) {
    errors.push("booking_end is invalid date");
  }

  if (errors.length) {
    throw new ValidationError("000", errors.join("|"));
  }
};

const create = async (event) =>
  baseService(async (sequelize) => {
    const data = JSON.parse(event.body);

    validateCreate(data);

    const {
      booking_session_id: sessionId,
      booking_location: {
        venue_id: venueId,
        box_id: boxId,
        booking_start: start,
        booking_end: end,
      } = {},
      booking_guests: { guests_no: guestsNo } = {},
      booking_notes: notes,
      booking_source: source,
      booking_type: type,
    } = data;

    const { Booking, BoxBooking } = await db(sequelize);

    const booking = Booking.build({
      reference: createBookingRef(),
      sessionId,
      source,
      type,
      notes,
      guestsNo,
      status: "Paid",
    });
    setBookingStart(booking, start);
    setBookingEnd(booking, end);

    try {
      const boxBooking = await BoxBooking.create({ BoxId: boxId });

      await booking.save();
      await booking.setVenue(venueId);
      await booking.setBoxBookings(boxBooking);
      await booking.save();
    } catch (error) {
      console.error("[receptionCreate]: Error when creating booking", error);
      throw new ValidationError("007");
    }

    const bookingById = await Booking.findByPk(booking.id, {
      include: BoxBooking,
    });

    return {
      body: parse(bookingById),
    };
  });

const update = async (event) =>
  baseService(async (sequelize) => {
    const { bookingKey } = event.pathParameters;
    const data = JSON.parse(event.body);

    const {
      booking_session_id: sessionId,
      booking_location: {
        venue_id: venueId,
        box_ids: boxIds,
        booking_start: start,
        booking_end: end,
      } = {},
      booking_guests: { guests_no: guestsNo } = {},
      booking_notes: notes,
      booking_source: source,
      booking_type: type,
      justification,
    } = data;

    const { Booking, BoxBooking, Venue } = await db(sequelize);

    const booking = await Booking.findOne({
      where: {
        reference: bookingKey,
      },
      include: [
        {
          model: Venue,
        },
        {
          model: BoxBooking,
        },
      ],
    });

    if (!booking) {
      throw new ValidationError("006");
    }

    const originalBooking = booking;

    const actions = [];

    if (sessionId) {
      booking.set("sessionId", sessionId);
    }
    if (start) {
      actions.push(`Updated start time to ${start}.`);
      setBookingStart(booking, start);
    }
    if (end) {
      actions.push(`Updated end time to ${end}.`);
      setBookingEnd(booking, end);
    }
    if (guestsNo) {
      actions.push(`Updated player amount to ${guestsNo}.`);
      booking.set("guestsNo", guestsNo);
    }
    if (notes) {
      actions.push(`Updated notes to ${notes}.`);
      booking.set("notes", notes);
    }
    if (source) {
      booking.set("source", source);
    }
    if (type) {
      booking.set("type", type);
    }

    try {
      await booking.save();
      if (venueId) {
        await booking.setVenue(venueId);
      }
      if (boxIds) {
        const boxBookings = await BoxBooking.findAll({
          where: {
            booking_id: booking.id,
          },
        });
        await Promise.all(
          boxBookings.map((boxBooking, index) => {
            actions.push(`Updated box number to ${boxIds[index]}.`);
            return boxBooking.setBox(boxIds[index]);
          })
        );
      }

      try {
        if (booking.sessionId) {
          await dynamoDb.updatePartialItem({ booking });
        }
      } catch (error) {
        console.error("[reception: update] failed to update dynamodb", error);
      }
    } catch (error) {
      console.error("[receptionUpdate]: Error when updating booking", error);
      throw new ValidationError("007");
    }

    const bookingById = await Booking.findByPk(booking.id, {
      include: BoxBooking,
    });

    if (actions.length) {
      await eventBridge.publish(
        {
          action: actions.join(" "),
          context: {
            from: originalBooking,
            to: bookingById,
          },
          justification,
          userId: getSessionId(event),
        },
        "audit",
        "booking",
        EVENT_BUS_AUDIT
      );
    }

    return {
      body: parse(bookingById),
    };
  });

const deleteBooking = async (event) =>
  baseService(async (sequelize) => {
    const { bookingKey } = event.pathParameters;

    const { Booking } = await db(sequelize);

    const deletedBookings = await Booking.destroy({
      where: {
        reference: bookingKey,
      },
    });

    return {
      body: { deletedBookings },
    };
  });

const getTimings = async (event) =>
  baseService(async (sequelize) => {
    const { venue: venueCode, day } = event.pathParameters;

    const { Price } = await db(sequelize);

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("001");
    }

    const date = new Date(day);

    if (!isValid(date)) {
      throw new ValidationError("007", "Invalid Date");
    }

    const schedule = await getSchedule(sequelize, venue.id, date);

    if (schedule.length === 0) {
      return {
        body: { ...defaultOpenTime },
      };
    }

    const pricePoints = await Price.findAll({
      where: {
        open_time_id: schedule[0].OpenTime.id,
      },
    });

    return {
      body: {
        prices: pricePoints.map((element) => ({
          start: element.start,
          type: element.type,
          end: element.end,
          price: element.price,
        })),
        openTime: {
          start: schedule[0].OpenTime.start,
          end: schedule[0].OpenTime.end,
        },
      },
    };
  });

module.exports = {
  filter,
  create,
  update,
  deleteBooking,
  getTimings,
};
