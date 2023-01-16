const { utcToZonedTime, zonedTimeToUtc } = require("date-fns-tz");
const { add, eachMinuteOfInterval, isEqual, sub } = require("date-fns");
const { Op, DatabaseError, QueryTypes } = require("sequelize");
const baseService = require("./baseService");
const { db, retryWithTransaction, getWaitingTimeSQL } = require("../lib/db");
const { createBookingRef } = require("../lib/booking");
const { getSessionId } = require("../lib/auth");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { BookingSource, Cleanup } = require("./const");

const parseBookingForKioskAPI = (booking, timezone) => ({
  booking_key: booking.reference,
  booking_price: booking.price,
  booking_start: booking.start ? zonedTimeToUtc(booking.start, timezone) : null,
  expires_at: add(new Date(), { minutes: 5 }),
  // This is to avoid breaking kiosk functionality as no kiosk changes
  // are being made to support double box bookings
  box_id: booking.BoxBookings[0].BoxId,
});

const validate = (data) => {
  const errors = [];
  if (!data.booking_location?.from_timestamp) {
    errors.push("from time required");
  }
  const isoStringRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
  if (
    data.booking_location?.from_timestamp &&
    !isoStringRegex.test(data.booking_location?.from_timestamp)
  ) {
    errors.push("from time must be an ISO string");
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

  return errors;
};

const createKioskBooking = async (event) =>
  baseService(async (sequelize) => {
    const data = JSON.parse(event.body);

    const errors = validate(data);
    if (errors.length) {
      throw new ValidationError("000", errors.join("|"));
    }

    try {
      return await retryWithTransaction(sequelize, async (transaction) => {
        const { Booking, BoxBooking, Venue } = await db(sequelize);
        const venue = await Venue.findByPk(data.booking_location.venue_id, {
          transaction,
        });

        if (!venue) {
          throw new NotFoundError("001");
        }

        const convertedDate = utcToZonedTime(
          new Date(data.booking_location.from_timestamp),
          venue.timezone
        );
        const parsedDate = sub(convertedDate, {
          minutes: convertedDate.getMinutes() % Cleanup,
          seconds: convertedDate.getSeconds(),
        });

        const [waitingTime = {}] = await sequelize.query(getWaitingTimeSQL, {
          replacements: {
            venueId: venue.id,
            date: parsedDate,
            duration: Number(data.booking_location.booking_duration),
            cleanup: Cleanup,
          },
          type: QueryTypes.SELECT,
          transaction,
        });

        if (!waitingTime?.wait_time) {
          throw new ValidationError("005");
        }

        const bookingStartTime = add(new Date(parsedDate), {
          minutes: waitingTime.wait_time,
        });

        const bookingEndTime = add(new Date(bookingStartTime), {
          minutes: data.booking_location.booking_duration,
        });

        const boxIds = waitingTime.box_ids.split(",").sort();
        // Get bookings for the boxIds returned
        // and that have start time between
        // (from_timestamp OR booking_end - cleanup) AND bookingEndTime
        const bookings = await Booking.findAll({
          where: {
            [Op.or]: [
              {
                start: {
                  [Op.lte]: bookingEndTime,
                  [Op.gte]:
                    waitingTime.booking_end !== "0"
                      ? sub(new Date(waitingTime.booking_end), {
                          minutes: Cleanup,
                        })
                      : parsedDate,
                },
              },
            ],
          },
          include: {
            model: BoxBooking,
            where: {
              box_id: {
                [Op.in]: boxIds,
              },
            },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        // Find boxId not being used from the list of possible boxIds
        const boxId = boxIds.find(
          (element) =>
            !bookings.find((booking) =>
              booking.BoxBookings.find(
                (boxBooking) => boxBooking.BoxId.toString() === element
              )
            )
        );

        // Find boxSlotStart from bookingStartTime by interval of 5 mins (e.g. 09:00, 09:10, 09:20)
        const [boxSlotStart] = eachMinuteOfInterval(
          {
            start: bookingStartTime,
            end: add(bookingStartTime, { minutes: 29 }),
          },
          {
            step: 10,
          }
        ).filter(
          (time) =>
            !bookings.find((booking) => isEqual(booking.boxSlotStart, time))
        );

        if (!boxId || !boxSlotStart) {
          console.info({
            boxId,
            boxSlotStart,
            bookingStartTime,
            boxIds,
            waitingTime,
            bookingStartTimes: bookings.map((booking) => ({
              start: booking.start,
              box_ids: booking.BoxBookings.map((boxBooking) =>
                boxBooking.BoxId.toString()
              ),
            })),
          });

          throw new DatabaseError(new Error("No boxId or boxSlotStart"));
        }

        const boxSlotEnd = add(new Date(boxSlotStart), {
          minutes: data.booking_location.booking_duration,
        });

        const booking = Booking.build(
          {
            reference: createBookingRef(),
            sessionId: getSessionId(event),
            source: BookingSource.KIOSK,
            start: bookingStartTime,
            end: bookingEndTime,
            boxSlotStart,
            boxSlotEnd,
            price: waitingTime.price,
            guestsNo: data.booking_guests.guests_no,
          },
          {
            transaction,
          }
        );

        const boxBooking = await BoxBooking.create(
          { BoxId: boxId },
          { transaction }
        );

        await booking.save({ transaction });
        await booking.setVenue(venue, { transaction });
        await booking.setBoxBookings(boxBooking, { transaction });

        const foundBooking = await Booking.findByPk(booking.id, {
          include: BoxBooking,
          transaction,
        });

        return {
          body: parseBookingForKioskAPI(foundBooking, venue.timezone),
        };
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        // deadlock will happen when bookings table is updated while trying to add new booking and failed all retries
        throw new ValidationError("005");
      }
      throw error;
    }
  });

// TODO
// prevent from re-sending multiple times as this is no auth
const sendQrCode = async (event) =>
  baseService(async (sequelize) => {
    const data = JSON.parse(event.body);

    if (!data.booking_key) {
      throw new ValidationError("000", "booking key required");
    }

    const { Booking } = await db(sequelize);
    const booking = await Booking.findOne({
      where: { reference: data.booking_key },
    });

    if (!booking) {
      console.warn(`[sendQrCode] no booking found for ${data.booking_key}`);
      throw new NotFoundError("006");
    }

    return {
      body: {},
    };
  });

module.exports = {
  createKioskBooking,
  sendQrCode,
};
