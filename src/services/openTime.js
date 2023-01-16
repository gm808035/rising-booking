const { isMatch } = require("date-fns");
const { Op } = require("sequelize");

const baseService = require("./baseService");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { db } = require("../lib/db");

const validateData = (data) => {
  const errors = [];

  if (data.start && !isMatch(data.start, "HH:mm:ss")) {
    errors.push("start time must be in the format HH:mm:ss");
  }

  if (data.end && !isMatch(data.end, "HH:mm:ss")) {
    errors.push("end time must be in the format HH:mm:ss");
  }

  if (data.start >= data.end) {
    errors.push("open start time must be less than open end time");
  }

  if (errors.length) {
    throw new ValidationError("013", errors.join(","));
  }
};

const updateOpenTimes = (event) =>
  baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const {
      pathParameters: { schedule: scheduleCode, openTimeId },
    } = event;
    validateData(body);

    const { OpenTime, Schedule, BoxSlot, BoxSlotLink } = await db(sequelize);

    const schedule = await Schedule.findOne({
      where: {
        code: scheduleCode,
      },
      include: [
        {
          model: OpenTime,
          where: {
            id: openTimeId,
          },
        },
        {
          model: BoxSlot,
          attributes: ["id"],
          where: {
            [Op.or]: [
              {
                start: {
                  [Op.or]: [{ [Op.lt]: body.start }, { [Op.gte]: body.end }],
                },
              },
              {
                duration: sequelize.where(
                  sequelize.fn(
                    "ADDDATE",
                    sequelize.col("BoxSlots.start"),
                    sequelize.literal(`INTERVAL duration MINUTE`)
                  ),
                  ">",
                  body.end
                ),
              },
            ],
          },
          required: false,
          include: {
            model: BoxSlotLink,
            attributes: ["id"],
          },
        },
      ],
    });
    if (!schedule) {
      throw new NotFoundError("021");
    }

    console.log("OpenTime found: ", JSON.stringify(schedule));

    const transaction = await sequelize.transaction();

    try {
      const update = await OpenTime.update(body, {
        where: {
          id: openTimeId,
        },
        transaction,
      });

      if (schedule.BoxSlots.length) {
        const slotLinkIds = schedule.BoxSlots.reduce((acc, slot) => {
          if (slot.BoxSlotLinks?.length) {
            acc.push(slot.BoxSlotLinks[0].id);
          }
          return acc;
        }, []);
        const slotIds = schedule.BoxSlots.map((slot) => slot.id);
        if (slotLinkIds.length) {
          await BoxSlotLink.destroy({
            where: {
              id: {
                [Op.in]: slotLinkIds,
              },
            },
            transaction,
          });
        }
        await BoxSlot.destroy({
          where: {
            id: {
              [Op.in]: slotIds,
            },
          },
          transaction,
        });
      }

      console.log("Update performed. Affected rows: ", update);

      await transaction.commit();
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      throw new ValidationError("019", `${error.message}`);
    }

    return {
      statusCode: 204,
      body: null,
    };
  });

module.exports = {
  updateOpenTimes,
};
