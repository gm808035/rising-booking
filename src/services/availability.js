const { Op, QueryTypes } = require("sequelize");
const { format, parse, roundToNearestMinutes } = require("date-fns");
const { utcToZonedTime } = require("date-fns-tz");

const { isOver18Slot } = require("../lib/availability");
const { generateDateRange } = require("../lib/date");
const {
  db,
  getAvailabilityByDateRangeSQL,
  getAvailabilityByDaySQL,
  getWaitingTimeSQL,
} = require("../lib/db");
const baseService = require("./baseService");
const { NotFoundError } = require("../lib/errors");
const { Cleanup } = require("./const");

const getVenueByCode = async (sequelize, venueCode) => {
  const { Venue } = await db(sequelize);

  return Venue.findOne({
    where: {
      code: venueCode,
    },
  });
};

const getAvailabilityByDay = async (event) =>
  baseService(async (sequelize) => {
    const { venue: venueCode, day, duration } = event.pathParameters;

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("001");
    }

    const availability = await sequelize.query(getAvailabilityByDaySQL, {
      replacements: { venueId: venue.id, day, duration },
      type: QueryTypes.SELECT,
    });

    const times = await Promise.all(
      availability.map(async (element) => {
        const boxStart = parse(element.start, "HH:mm:ss", new Date());

        const formattedTime = format(boxStart, "HH:mm");

        const time = {
          ...element,
          start: formattedTime,
        };

        if (isOver18Slot(day, time.start, duration)) {
          time.over_18 = true;
        }

        const { linked_box_slot_id: linkedBoxSlotId, ...singleBoxTime } = time;

        /**
         * return linked_box_slot_id only if both box_slots from pair of box_slots linked are available
         */
        if (linkedBoxSlotId) {
          const availablePairSlot = availability.some(
            ({ box_slot_id: slotId, linked_box_slot_id: linkedId }) =>
              linkedId === linkedBoxSlotId && slotId !== element.box_slot_id
          );

          if (availablePairSlot) {
            return time;
          }
        }

        return singleBoxTime;
      })
    );

    return {
      body: {
        venue_id: venue.id,
        venue_code: venue.code,
        times,
      },
    };
  });

const getAvailabilityByDateRange = async (event) =>
  baseService(async (sequelize) => {
    const {
      venue: venueCode,
      from: startDate,
      to: endDate,
      duration,
    } = event.pathParameters;

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("001");
    }

    const { Schedule, VenueSchedule, BoxSlot } = await db(sequelize);

    const availability = await sequelize.query(getAvailabilityByDateRangeSQL, {
      replacements: { venueId: venue.id, startDate, endDate, duration },
      type: QueryTypes.SELECT,
    });

    const dateWithoutFreeBoxSLots = availability.map((row) => row.date);

    const appliedDates = generateDateRange(
      startDate,
      endDate,
      dateWithoutFreeBoxSLots
    ).map((appliedDate) => new Date(appliedDate).toISOString());

    const schedules = await Promise.all(
      appliedDates.map(async (date) => {
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
          attributes: ["id"],
          include: [
            {
              model: VenueSchedule,
              where: {
                venue_id: venue.id,
              },
              attributes: [],
            },
            {
              model: BoxSlot,
              attributes: ["id"],
              required: false,
              where: {
                duration,
              },
            },
          ],
          order: [["date_of_apply", "DESC"]],
        });
        if (schedule.length && schedule[0].BoxSlots.length) {
          return { available_date: date };
        }
        return {};
      })
    );

    const availableDates = schedules
      .filter((day) => day.available_date)
      .map((row) => row.available_date.split("T")[0]);

    return {
      body: {
        venue_id: venue.id,
        venue_code: venue.code,
        dates: availableDates,
      },
    };
  });

const getWaitingTime = async (event) =>
  baseService(async (sequelize) => {
    const {
      venue: venueCode,
      duration,
      date = new Date().toISOString(),
    } = event.pathParameters;

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("001");
    }

    const roundedTo15Minutes = roundToNearestMinutes(new Date(date), {
      nearestTo: 15,
    });

    const parsedDate = format(
      utcToZonedTime(new Date(roundedTo15Minutes), venue.timezone),
      "yyyy-MM-dd HH:mm:ss"
    );
    const durationSplit = duration.split(",");

    const getAvailability = (queryDuration) =>
      sequelize.query(getWaitingTimeSQL, {
        replacements: {
          venueId: venue.id,
          date: parsedDate,
          duration: Number(queryDuration),
          cleanup: Cleanup,
        },
        type: QueryTypes.SELECT,
      });

    const results = await Promise.all(
      durationSplit.map((element) => getAvailability(element))
    );

    const waitTimes = results
      .map(([result = {}]) => ({
        wait_time: result.wait_time,
        price: result.price,
        slot_duration: result.slot_duration,
      }))
      .filter((element) => element.wait_time);

    return {
      body: {
        venue_id: venue.id,
        venue_code: venue.code,
        wait_times: waitTimes,
      },
    };
  });

module.exports = {
  getAvailabilityByDay,
  getAvailabilityByDateRange,
  getWaitingTime,
  getVenueByCode,
};
