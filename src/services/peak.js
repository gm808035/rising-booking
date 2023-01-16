/* eslint-disable camelcase */
/* eslint-disable arrow-body-style */
const { isMatch } = require("date-fns");
const { Op } = require("sequelize");

const baseService = require("./baseService");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { db } = require("../lib/db");

const validateData = (data) => {
  const errors = [];
  if (data.start && !isMatch(data.start, "HH:mm")) {
    errors.push("start time must be in the format HH:mm");
  }

  if (data.end && !isMatch(data.end, "HH:mm")) {
    errors.push("end time must be in the format HH:mm");
  }

  if (data.price && typeof data.price !== "number") {
    errors.push("price must be an integer");
  }
  if (data.order && typeof data.order !== "number") {
    errors.push("order must be an integer");
  }

  if (data.type && typeof data.type !== "string") {
    errors.push("type must be a string");
  }

  if (errors.length) {
    throw new ValidationError("007", errors.join(", "));
  }
};
const validateId = (data) => {
  const errors = [];
  if (!data.id) {
    errors.push("id is required field");
  }
  if (data.id && typeof data.id !== "number") {
    errors.push("id must be an integer");
  }

  if (errors.length) {
    throw new ValidationError("007", errors.join(", "));
  }
};

const parsePeakTime = (peakTime = {}) => {
  return {
    id: peakTime.id,
    start: peakTime.start,
    end: peakTime.end,
    type: peakTime.type,
    price: peakTime.price / 100,
    order: peakTime.order,
  };
};

const checkSchedule = async (scheduleCode, sequelize) => {
  const { OpenTime, Schedule } = await db(sequelize);

  const schedule = await Schedule.findOne({
    where: {
      code: scheduleCode,
    },
    attributes: ["id"],
    include: {
      model: OpenTime,
      require: false,
      attributes: ["id"],
    },
  });

  if (!schedule) {
    throw new NotFoundError("021");
  }

  if (!schedule.OpenTime?.id) {
    throw new NotFoundError("027");
  }

  return schedule.OpenTime.id;
};

const createPeak = async (body, openTimeId, transaction, sequelize) => {
  const { OpenTime, Price } = await db(sequelize);
  try {
    const existingPrice = await Price.findOne({
      where: {
        [Op.or]: [
          { start: { [Op.lte]: body.start }, end: { [Op.gte]: body.start } },
          { start: { [Op.lte]: body.end }, end: { [Op.gte]: body.end } },
          { start: { [Op.gte]: body.start }, end: { [Op.lte]: body.end } },
        ],
      },
      include: {
        model: OpenTime,
        where: {
          id: openTimeId,
        },
      },
    });
    if (existingPrice) {
      throw new ValidationError("012");
    }
    const price = Price.build(
      {
        start: body.start,
        end: body.end,
        type: body.type,
        order: body.order ? body.order : 1,
        price: body.price * 100,
      },
      transaction
    );

    await price.save({ transaction });
    await price.setOpenTime(openTimeId, { transaction });
    await price.save({ transaction });

    return price;
  } catch (error) {
    throw new ValidationError(error.code ?? 500, error.message);
  }
};

const createPeakTimes = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);
    const body = JSON.parse(event.body);

    const { schedule: scheduleCode } = event.pathParameters;

    const openTimeId = await checkSchedule(scheduleCode, sequelize);

    const transaction = await sequelize.transaction();

    if (Array.isArray(body)) {
      try {
        body.forEach((price) => {
          validateData(price);
        });

        const prices = await Promise.all(
          body.map((peak) => {
            return createPeak(peak, openTimeId, transaction, sequelize);
          })
        );

        await transaction.commit();

        const resultPeak = prices.map((price) => {
          return parsePeakTime(price);
        });

        return {
          statusCode: 200,
          body: resultPeak,
        };
      } catch (error) {
        await transaction.rollback();
        throw new ValidationError(error.code ?? 500, error.message);
      }
    } else
      try {
        validateData(body);

        const price = await createPeak(
          body,
          openTimeId,
          transaction,
          sequelize
        );
        await transaction.commit();

        return {
          statusCode: 200,
          body: parsePeakTime(price),
        };
      } catch (error) {
        await transaction.rollback();
        throw new ValidationError(error.code ?? 500, error.message);
      }
  });
};

const updatePeakTimes = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const { schedule: scheduleCode } = event.pathParameters;

    const { Price } = await db(sequelize);

    const openTimeId = await checkSchedule(scheduleCode, sequelize);

    if (Array.isArray(body)) {
      const transaction = await sequelize.transaction();
      try {
        body.forEach((peak) => {
          validateData(peak);
          validateId(peak);
        });

        await Promise.all(
          body.map((peak, index) => {
            return Price.update(
              {
                ...peak,
                price: peak.price * 100,
                order: index + 1,
              },
              {
                where: {
                  [Op.and]: [{ open_time_id: openTimeId }, { id: peak.id }],
                },
                transaction,
              }
            );
          })
        );
        await transaction.commit();
        return {
          statusCode: 204,
          body: null,
        };
      } catch (error) {
        console.log(error);
        await transaction.rollback();
        throw new ValidationError("019", `${error.message}`);
      }
    }
    validateData(body);
    validateId(body);

    const update = await Price.update(
      { ...body, price: body.price * 100 },
      {
        where: {
          [Op.and]: [{ open_time_id: openTimeId }, { id: body.id }],
        },
      }
    );

    console.log("Update performed. Affected rows: ", update);

    return {
      statusCode: 204,
      body: null,
    };
  });
};

const deletePeakTimes = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);
    const body = JSON.parse(event.body);

    const { schedule: scheduleCode } = event.pathParameters;

    const { Price } = await db(sequelize);

    const openTimeId = await checkSchedule(scheduleCode, sequelize);

    if (Array.isArray(body)) {
      const transaction = await sequelize.transaction();
      try {
        body.forEach(validateId);

        await Promise.all(
          body.map(async (peak) => {
            const price = await Price.findOne({
              where: { id: peak.id, open_time_id: openTimeId },
            });

            if (!price) {
              throw new NotFoundError("028");
            }
            await price.destroy({ transaction });
          })
        );

        await transaction.commit();
        return {
          statusCode: 204,
          body: null,
        };
      } catch (error) {
        await transaction.rollback();
        throw new ValidationError(error.code ?? 500, error.message);
      }
    }

    validateId(body);
    const price = await Price.findOne({
      where: { id: body.id, open_time_id: openTimeId },
    });
    if (!price) {
      throw new NotFoundError("028");
    }
    await price.destroy();
    return {
      statusCode: 204,
      body: null,
    };
  });
};

module.exports = {
  createPeakTimes,
  updatePeakTimes,
  deletePeakTimes,
};
