/* eslint-disable arrow-body-style */
const { isAfter, isValid, isMatch, isPast, addDays } = require("date-fns");
const { Op } = require("sequelize");

const baseService = require("./baseService");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { db } = require("../lib/db");

const { getSchedule } = require("./booking");
const { getVenueByCode } = require("./availability");
const { calculateRecurrenceDates, createRecurrence } = require("./recurrence");
const { copyBoxSlots } = require("./boxSlots");

const parseBoxes = (box) => {
  return {
    id: box.id,
    name: box.name,
    section: box.BoxSection.name,
    boxSlots: box.BoxSlots.map((b) => ({
      id: b.id,
      duration: b.duration,
      start: b.start,
      BoxSlotLinks: b.BoxSlotLinks.map((slot) => ({
        id: slot.id,
        linked_box_slot_id: slot.linked_box_slot_id,
      })),
    })),
  };
};

const parseSchedule = (schedule, scheduleOpenTime, schedulePrices) => {
  return {
    id: schedule.id,
    name: schedule.name,
    code: schedule.code,
    from: schedule.from,
    to: schedule.to,
    order: schedule.order,
    openTime: {
      id: scheduleOpenTime.id,
      start: scheduleOpenTime.start,
      end: scheduleOpenTime.end,
    },
    prices: schedulePrices
      .map((price) => {
        return {
          id: price.id,
          start: price.start,
          end: price.end,
          type: price.type,
          order: price.order,
          price: price.price / 100,
        };
      })
      .sort((a, b) => {
        return a.order - b.order;
      }),
  };
};

const parseRecurrence = ({
  id,
  recurrenceType,
  dayOfWeek,
  separationCount,
  weekOfMonth,
  dayOfMonth,
  monthOfYear,
}) => {
  return {
    recurrence: {
      id,
      recurrenceType,
      dayOfWeek: dayOfWeek.map((el) => (el === 0 ? 7 : el)),
      separationCount,
      weekOfMonth,
      dayOfMonth,
      monthOfYear: monthOfYear.map((el) => el + 1),
    },
  };
};

const validateData = (data) => {
  const errors = [];

  if (!data.name) {
    errors.push("name is a required field");
  }
  if (!data.from) {
    errors.push('"from" is a required field');
  }
  if (!data.to) {
    errors.push('"to" is a required field');
  }

  if (!data.openTime || !data.openTime.start || !data.openTime.end) {
    errors.push("openTime is a required field");
  }

  if (data.openTime && data.openTime.start && data.openTime.end) {
    if (data.openTime.start && !isMatch(data.openTime.start, "HH:mm:ss")) {
      errors.push("open time start value must be in the format HH:mm:ss");
    }

    if (data.openTime.end && !isMatch(data.openTime.end, "HH:mm:ss")) {
      errors.push("open time end value must be in the format HH:mm:ss");
    }
  }
  if (data.prices) {
    data.prices.forEach((price) => {
      if (price.start && !isMatch(price.start, "HH:mm:ss")) {
        errors.push("peak start time must be in the format HH:mm:ss");
      }

      if (price.end && !isMatch(price.end, "HH:mm:ss")) {
        errors.push("peak end time must be in the format HH:mm:ss");
      }
      if (price.price && typeof price.price !== "number") {
        errors.push("price must be an integer");
      }
      if (price.order && typeof price.order !== "number") {
        errors.push("order must be an integer");
      }

      if (price.type && typeof price.type !== "string") {
        errors.push("type must be a string");
      }
    });
  }

  if (data.end && !isMatch(data.end, "HH:mm:ss")) {
    errors.push("end time must be in the format HH:mm:ss");
  }

  if (!data.prices) {
    errors.push("price values are required");
  }

  if (data.from && !isValid(new Date(data.from))) {
    errors.push('"from" is invalid date');
  }

  if (data.to && !isValid(new Date(data.to))) {
    errors.push('"to" is invalid date');
  }

  if (data.from && isPast(addDays(new Date(data.from), 1))) {
    errors.push('"from" date cannot be before today');
  }

  if (data.from && data.to && isAfter(new Date(data.from), new Date(data.to))) {
    errors.push('"to" date cannot be before "from" date');
  }

  if (errors.length) {
    throw new ValidationError("019", errors.join(", "));
  }
};

const validateUpdateData = (data) => {
  const errors = [];

  if (!data.name) {
    errors.push('"name" is required field for update');
  }
  if (!data.from) {
    errors.push('"from" is required field for update');
  }
  if (!data.to) {
    errors.push('"to" is required field for update');
  }
  if (data.from && !isValid(new Date(data.from))) {
    errors.push('"from" is invalid date');
  }
  if (data.from && isPast(addDays(new Date(data.from), 1))) {
    errors.push('"from" date cannot be before today');
  }
  if (data.to && !isValid(new Date(data.to))) {
    errors.push('"to" is invalid date');
  }
  if (data.from && data.to && isAfter(new Date(data.from), new Date(data.to))) {
    errors.push('"to" date cannot be before "from" date');
  }

  if (errors.length) {
    throw new ValidationError("019", errors.join(", "));
  }
};

const checkDuplicateName = async (name, sequelize, transaction) => {
  const { Schedule } = await db(sequelize);

  const duplicateScheduleName = await Schedule.findOne({
    where: {
      name,
    },
    transaction,
  });

  if (duplicateScheduleName) {
    throw new ValidationError("025");
  }

  return name.toLowerCase().split(" ").join("-");
};

const updateSchedule = async (event) => {
  return baseService(async (sequelize) => {
    const data = JSON.parse(event.body);
    console.log("Event received", event);
    const { id } = event.pathParameters;

    validateUpdateData(data);

    const { name, from, to } = data;

    const { Schedule } = await db(sequelize);
    const transaction = await sequelize.transaction();
    try {
      const schedule = await Schedule.findByPk(
        id,
        {
          includes: ["name", "form", "to"],
        },
        transaction
      );

      if (!schedule) {
        throw new NotFoundError("021");
      }

      if (schedule.name !== name) {
        const code = await checkDuplicateName(name, sequelize, transaction);

        if (schedule.from === from && schedule.to === to) {
          await schedule.update(
            {
              name,
              code,
            },
            { transaction }
          );
        } else {
          await schedule.update(
            {
              name,
              code,
              from,
              to,
              applied_dates: [],
            },
            { transaction }
          );
        }
      } else {
        await schedule.update(
          {
            from,
            to,
            applied_dates: [],
          },
          { transaction }
        );
      }
      await transaction.commit();
    } catch (error) {
      console.error("Error updating schedule: ", error);
      await transaction.rollback();
      throw new ValidationError(error.code, error.message);
    }

    return {
      statusCode: 204,
      body: null,
    };
  });
};

const fetchScheduleData = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const { venue: venueCode, date: reqDate } = event.pathParameters;

    const {
      OpenTime,
      Price,
      BoxSlot,
      Box,
      BoxSlotLink,
      Recurrence,
      BoxSection,
    } = await db(sequelize);

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("020");
    }

    if (reqDate && !isMatch(reqDate, "yyyy-MM-dd")) {
      throw new ValidationError("019", "invalid parameters");
    }

    const date = new Date(reqDate);

    const schedule = await getSchedule(sequelize, venue.id, date);
    console.log("Schedule: ", schedule);
    if (!schedule.length) {
      return {
        statusCode: 204,
        body: null,
      };
    }

    const scheduleId = schedule[0].id;

    const boxes = await Box.findAll({
      where: {
        venue_id: venue.id,
      },
      attributes: ["id", "name", "box_section_id"],
      include: [
        {
          model: BoxSlot,
          where: {
            schedule_id: scheduleId,
          },
          include: [
            { model: BoxSlotLink, attributes: ["id", "linked_box_slot_id"] },
          ],
        },
        {
          model: BoxSection,
          attributes: ["name"],
        },
      ],
    });

    console.log("Boxes: ", boxes);
    const parsedBoxes = boxes.map((el) => {
      return parseBoxes(el);
    });

    const openTime = await OpenTime.findOne({
      where: {
        schedule_id: scheduleId,
      },
      include: [
        {
          model: Price,
        },
      ],
    });
    console.log("OpenTime :", openTime);
    const scheduleRecurrence = await Recurrence.findOne({
      where: {
        schedule_id: scheduleId,
      },
    });
    console.log("ScheduleRecurrence :", scheduleRecurrence);
    let recurrence = {};
    if (scheduleRecurrence) {
      recurrence = parseRecurrence(scheduleRecurrence);
    }

    return {
      statusCode: 200,
      body: {
        ...parseSchedule(schedule[0], openTime, openTime.Prices),
        ...recurrence,
        boxes: parsedBoxes,
      },
    };
  });
};

const createScheduleHelper = async (
  body,
  venueCode,
  sequelize,
  transaction
) => {
  let schedule;
  let openTime;
  let prices;
  let recurrence = {};
  let boxSlots = [];
  const { Schedule, VenueSchedule, OpenTime, Price, Venue } = await db(
    sequelize
  );

  try {
    const venue = await Venue.findOne(
      {
        where: {
          code: venueCode,
        },
        include: [
          {
            model: VenueSchedule,
            attributes: ["schedule_id"],
          },
        ],
      },
      transaction
    );

    if (!venue) {
      throw new ValidationError("020");
    }
    const code = await checkDuplicateName(body.name, sequelize, transaction);

    const order = await Schedule.findAll(
      {
        attributes: [[sequelize.fn("max", sequelize.col("order")), "order"]],
        where: {
          id: {
            [Op.in]: venue.VenueSchedules.map(
              (el) => el.dataValues.schedule_id
            ),
          },
        },
        raw: true,
      },
      transaction
    );

    schedule = await Schedule.create(
      {
        name: body.name,
        code,
        from: body.from,
        to: body.to,
        order: body.order ?? order[0].order + 1,
        appliedDate: "[]",
      },
      {
        transaction,
      }
    );

    const venueSchedule = await VenueSchedule.build(
      {},
      {
        transaction,
      }
    );

    await venueSchedule.save({ transaction });
    await venueSchedule.setSchedule(schedule.id, { transaction });
    await venueSchedule.setVenue(venue.id, { transaction });
    await venueSchedule.save({ transaction });

    if (body.recurrence && Object.entries(body.recurrence).length) {
      const schedlueRecurrence = await createRecurrence(
        body.recurrence,
        schedule,
        transaction,
        sequelize
      );
      recurrence = parseRecurrence(schedlueRecurrence);
    }

    if (body.boxSlots) {
      const copiedBoxSlot = await copyBoxSlots(
        body.boxSlots,
        schedule.id,
        transaction
      );
      boxSlots = JSON.parse(copiedBoxSlot.body).boxSlots;
    }

    openTime = await OpenTime.build(
      {
        start: body.openTime.start,
        end: body.openTime.end,
      },
      { transaction }
    );

    await openTime.save({ transaction });
    await openTime.setSchedule(schedule.id, { transaction });
    await openTime.save({ transaction });

    prices = await Promise.all(
      body.prices.map(async (price, index) => {
        const schedulePrices = await Price.build(
          {
            start: price.start,
            end: price.end,
            type: price.type,
            price: price.price * 100,
            order: index + 1,
          },
          { transaction }
        );
        await schedulePrices.save({ transaction });
        await schedulePrices.setOpenTime(openTime.id, {
          transaction,
        });
        await schedulePrices.save({ transaction });
        return schedulePrices;
      })
    );
  } catch (error) {
    throw new ValidationError("019", `${error.message}`);
  }
  return {
    statusCode: 200,
    body: {
      ...parseSchedule(schedule, openTime, prices),
      ...recurrence,
      boxSlots,
    },
  };
};

const createSchedule = async (event) => {
  return baseService(async (sequelize) => {
    const body = JSON.parse(event.body);

    const { venue: venueCode } = event.pathParameters;

    validateData(body);

    const transaction = await sequelize.transaction();

    let schedule;
    try {
      schedule = await createScheduleHelper(
        body,
        venueCode,
        sequelize,
        transaction
      );
      console.log("Created schedule: ", schedule);

      await transaction.commit();
    } catch (error) {
      console.error("Error creating schedule: ", error);
      await transaction.rollback();
      throw new ValidationError("019", `${error.message}`);
    }

    return {
      statusCode: schedule.statusCode,
      body: {
        ...schedule.body,
      },
    };
  });
};

const checkScheduleApplyAvailability = async (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const { venue: venueCode, schedule: scheduleCode } = event.pathParameters;

    if (!venueCode || !scheduleCode) {
      throw new ValidationError(
        "019",
        "venue and schedule code is required field"
      );
    }

    const { Schedule, VenueSchedule, Recurrence } = await db(sequelize);

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("020");
    }

    const schedule = await Schedule.findOne({
      where: {
        code: scheduleCode,
      },
      include: Recurrence,
    });

    if (!schedule) {
      throw new NotFoundError("021");
    }
    let appliedDates;

    if (!schedule.Recurrence) {
      appliedDates = await calculateRecurrenceDates(null, schedule.dataValues);
    }

    if (schedule.Recurrence) {
      appliedDates = await calculateRecurrenceDates(
        schedule.Recurrence,
        schedule
      );
    }

    const where = {
      [Op.and]: [
        {
          applied_dates: {
            [Op.or]: appliedDates.map((appliedDate) =>
              sequelize.where(
                sequelize.fn(
                  "JSON_SEARCH",
                  sequelize.col("applied_dates"),
                  sequelize.literal(`'all'`),
                  sequelize.literal(`"${appliedDate}"`)
                ),
                {
                  [Op.ne]: null,
                }
              )
            ),
          },
        },
        {
          code: {
            [Op.ne]: schedule.code,
          },
        },
      ],
    };

    const venueSchedules = await VenueSchedule.findAll({
      where: { venue_id: venue.id },
      include: [
        {
          model: Schedule,
          where,
          attributes: ["id", "name", "code", "applied_dates"],
          include: {
            model: Recurrence,
            attributes: ["id"],
          },
        },
      ],
    });

    if (!venueSchedules.length) {
      return {
        statusCode: 200,
        body: { isAbleToApply: true },
      };
    }
    const conflictedSchedules = venueSchedules.map((el) => {
      return {
        id: el.Schedule.id,
        name: el.Schedule.name,
        code: el.Schedule.code,
        conflicted_dates: appliedDates.filter((date) => {
          return el.Schedule.applied_dates.includes(date);
        }),
        recurrene: el.Schedule.Recurrence ? el.Schedule.Recurrence.id : {},
      };
    });

    return {
      statusCode: 200,
      body: {
        isAbleToApply: false,
        conflictedSchedules,
      },
    };
  });
};

const applySchedule = async (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const { venue: venueCode, schedule: scheduleCode } = event.pathParameters;

    const venue = await getVenueByCode(sequelize, venueCode);

    if (!venue) {
      throw new NotFoundError("020");
    }

    const { Schedule, VenueSchedule, Recurrence } = await db(sequelize);

    const schedule = await Schedule.findOne({
      where: {
        code: scheduleCode,
      },
    });

    if (!schedule) {
      throw new NotFoundError("021");
    }

    const venueId = venue.id;
    const scheduleId = schedule.id;

    const venueSchedule = await VenueSchedule.findOne({
      where: {
        [Op.and]: [{ venue_id: venueId }, { schedule_id: scheduleId }],
      },
    });

    if (!venueSchedule) {
      throw new NotFoundError("023");
    }

    const recurrence = await Recurrence.findOne({
      where: {
        schedule_id: scheduleId,
      },
    });

    let appliedDates;

    console.log("Recurrence: ", recurrence);
    if (!recurrence) {
      appliedDates = await calculateRecurrenceDates(null, schedule);
    }

    if (recurrence && recurrence.separationCount !== 0) {
      appliedDates = await calculateRecurrenceDates(recurrence, {
        from: schedule.from,
        to: schedule.to,
      });
    }

    const apply = await Schedule.update(
      {
        applied_dates: appliedDates,
        date_of_apply: new Date(),
      },
      {
        where: {
          id: scheduleId,
        },
      }
    );

    console.log("Apply performed. Affected rows: ", apply);

    return {
      statusCode: 204,
      body: null,
    };
  });
};

const filter = async (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received", event);
    const { venueId } = event.pathParameters;

    if (!venueId) {
      throw new ValidationError("019", "venueId is a required field");
    }
    const { VenueSchedule, Schedule, Venue } = await db(sequelize);

    const schedules = await Venue.findOne({
      where: {
        id: venueId,
      },
      attributes: ["id"],
      include: [
        {
          model: VenueSchedule,
          attributes: ["id"],
          required: false,
          include: {
            model: Schedule,
            required: false,
            attributes: ["id", "name", "code", "order"],
          },
        },
      ],
      order: [["VenueSchedules", { model: Schedule }, "order", "desc"]],
    });
    if (!schedules) {
      throw new NotFoundError("020");
    }
    if (!schedules?.VenueSchedules?.length) {
      return {
        body: [],
      };
    }

    const parsedSchedule = schedules.VenueSchedules.map((venueSchedule) => {
      return venueSchedule.Schedule;
    });

    return {
      body: parsedSchedule,
    };
  });
};

const deleteSchedule = async (event) => {
  return baseService(async (sequelize) => {
    const { id } = event.pathParameters;
    console.log("Event received", event);
    const { Schedule } = await db(sequelize);

    const schedule = await Schedule.findByPk(id);

    console.log("Schedule :", schedule);
    if (!schedule) {
      throw new NotFoundError("021");
    }

    await schedule.destroy();

    return {
      statusCode: 204,
      body: null,
    };
  });
};

const fetchScheduleById = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const { id } = event.pathParameters;

    const {
      Schedule,
      OpenTime,
      Price,
      Recurrence,
      VenueSchedule,
      Box,
      BoxSlot,
      BoxSlotLink,
      BoxSection,
    } = await db(sequelize);

    const schedule = await Schedule.findByPk(id, {
      include: [
        { model: OpenTime, include: Price },
        { model: Recurrence },
        { model: VenueSchedule },
      ],
    });

    if (!schedule) {
      throw new NotFoundError("021");
    }
    const boxes = await Box.findAll({
      where: {
        venue_id: schedule.VenueSchedule.VenueId,
      },
      attributes: ["id", "name", "box_section_id"],
      include: [
        {
          model: BoxSlot,
          where: {
            schedule_id: schedule.id,
          },
          include: [
            {
              model: BoxSlotLink,
              attributes: ["id", "linked_box_slot_id"],
            },
          ],
        },
        {
          model: BoxSection,
          attributes: ["name"],
        },
      ],
    });

    const parsedBoxes = boxes.map((el) => {
      return parseBoxes(el);
    });

    const parsedSchedule = parseSchedule(
      schedule,
      schedule.OpenTime,
      schedule.OpenTime.Prices
    );

    let recurrence = {};

    if (schedule.Recurrence) {
      recurrence = parseRecurrence(schedule.Recurrence);
    }
    return {
      statusCode: 200,
      body: { ...parsedSchedule, recurrence, boxes: parsedBoxes },
    };
  });
};

const validateChangingOrder = (data) => {
  const errors = [];
  if (!data || !data.scheduleIds || data.scheduleIds?.length < 2) {
    errors.push("should be at least two schedule ids");
  }

  if (errors.length) {
    throw new ValidationError("019", errors.join(", "));
  }
};

const changeSchedulesOrder = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const data = JSON.parse(event.body);

    validateChangingOrder(data);

    const transaction = await sequelize.transaction();

    const { Schedule } = await db(sequelize);
    try {
      const changedOrderList = await Promise.all(
        data.scheduleIds.map(async (scheduleId, index, array) => {
          const schedule = await Schedule.findByPk(scheduleId);

          if (!schedule) {
            throw new NotFoundError("021");
          }

          await schedule.update(
            {
              order: array.length - index,
            },
            { transaction }
          );
          return {
            id: schedule.id,
            name: schedule.name,
            code: schedule.code,
            order: schedule.order,
          };
        })
      );
      await transaction.commit();
      return {
        body: changedOrderList,
      };
    } catch (error) {
      console.error("Error updating schedule order: ", error);
      await transaction.rollback();
      throw new ValidationError(error.code, error.message);
    }
  });
};

const copyScheduleById = (event) => {
  return baseService(async (sequelize) => {
    const body = JSON.parse(event.body);
    if (!body.name) {
      throw new ValidationError("019", "name is a required field");
    }

    const { name } = body;

    let copiedSchedule;
    let scheduleToCopy;
    let copiedBoxSlot;

    try {
      await sequelize.transaction(async (transaction) => {
        await checkDuplicateName(name, sequelize, transaction);

        const { id: scheduleId } = event.pathParameters;

        const {
          Schedule,
          Price,
          VenueSchedule,
          OpenTime,
          Recurrence,
          Venue,
          BoxSlot,
          BoxSlotLink,
        } = await db(sequelize);

        scheduleToCopy = await VenueSchedule.findOne({
          where: {
            schedule_id: scheduleId,
          },
          include: [
            {
              model: Venue,
              attributes: ["code"],
            },
            {
              model: Schedule,
              attributes: ["order"],
              include: [
                {
                  model: OpenTime,
                  attributes: ["start", "end"],
                  include: [
                    {
                      model: Price,
                      attributes: ["start", "end", "type", "price", "order"],
                    },
                  ],
                },
                {
                  model: Recurrence,
                },
                {
                  model: BoxSlot,
                  include: { model: BoxSlotLink },
                },
              ],
            },
          ],
          transaction,
        });
        if (!scheduleToCopy) {
          throw new NotFoundError("021");
        }
        const { order } = scheduleToCopy.Schedule;

        const { code: venueCode } = scheduleToCopy.Venue;

        const {
          start: startOpenTime,
          end: endOpenTime,
          Prices,
        } = scheduleToCopy.Schedule.OpenTime;

        const refactoredPrices = Prices.map((price) => ({
          start: price.start,
          end: price.end,
          type: price.type,
          price: price.price / 100,
          order: price.order,
        }));

        let copiedRecurrence;

        if (scheduleToCopy.Schedule.Recurrence) {
          const {
            recurrenceType,
            dayOfWeek,
            separationCount,
            weekOfMonth,
            dayOfMonth,
            monthOfYear,
          } = scheduleToCopy.Schedule.Recurrence;

          copiedRecurrence = {
            recurrence_type: recurrenceType,
            day_of_week: dayOfWeek.map((el) => (el === 0 ? 7 : el)),
            separation_count: separationCount,
            week_of_month: weekOfMonth,
            day_of_month: dayOfMonth,
            month_of_year: monthOfYear,
          };
        }
        if (scheduleToCopy.Schedule.BoxSlots.length) {
          copiedBoxSlot = scheduleToCopy.Schedule.BoxSlots.reduce(
            (total, boxSlot) => {
              if (boxSlot.BoxId && boxSlot.BoxId !== null) {
                const slot = {
                  id: boxSlot.id,
                  start: boxSlot.start,
                  duration: boxSlot.duration,
                  box_id: boxSlot.BoxId,
                  schedule_id: boxSlot.ScheduleId,
                  boxSlotLink: boxSlot.BoxSlotLinks,
                };
                total.push(slot);
              }
              return total;
            },
            []
          );
        }
        const copyScheduleBody = {
          name,
          from: new Date(),
          to: new Date(),
          order: order + 1,
          openTime: {
            start: startOpenTime,
            end: endOpenTime,
          },
          prices: refactoredPrices,
          recurrence: copiedRecurrence,
          boxSlots: copiedBoxSlot,
        };

        await Schedule.update(
          {
            order: sequelize.fn("1 + ", sequelize.col("order")),
          },
          {
            where: {
              order: {
                [Op.gt]: copyScheduleBody.order,
              },
            },
            transaction,
          }
        );
        copiedSchedule = await createScheduleHelper(
          copyScheduleBody,
          venueCode,
          sequelize,
          transaction
        );
      });
    } catch (error) {
      console.error("Error copying schedule: ", error);
      throw new ValidationError(error.code, error.message);
    }

    const copiedScheduleBody = copiedSchedule.body;
    const copiedScheduleOutput = {
      id: copiedScheduleBody.id,
      name: copiedScheduleBody.name,
      code: copiedScheduleBody.code,
      order: copiedScheduleBody.order,
    };
    return {
      statusCode: copiedSchedule.statusCode,
      body: copiedScheduleOutput,
    };
  });
};

module.exports = {
  fetchScheduleData,
  createSchedule,
  updateSchedule,
  applySchedule,
  filter,
  deleteSchedule,
  checkScheduleApplyAvailability,
  fetchScheduleById,
  changeSchedulesOrder,
  copyScheduleById,
};
