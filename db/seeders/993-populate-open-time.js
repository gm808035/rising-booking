const openTimeRefactored = require("../seeders-data/schedules-back-up");
const scheduleDates = require("../seeders-data/date-range-for-schedules-test");
const schedulesAppliedDates = require("../seeders-data/schedules-appliedDates");
const { getNumberOfWeekday } = require("../seeders-data/weekday-number");
const venueRefactored = require("../seeders-data/venues-back-up");

const created_at = new Date();
const updated_at = new Date();

const createSchedule = async (
  queryInterface,
  Sequelize,
  transaction,
  scheduleName,
  scheduleCode,
  from,
  to
) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: scheduleName,
        code: scheduleCode,
        from,
        to,
        applied_dates: JSON.stringify([]),
        order: 1,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: schedule_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM schedule WHERE code = :scheduleCode",
    {
      replacements: { scheduleCode },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return schedule_id;
};

const createRecurrence = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id,
  day_of_week
) => {
  await queryInterface.bulkInsert(
    "recurrence",
    [
      {
        schedule_id,
        recurrence_type: "weekly",
        day_of_week,
        week_of_month: "[]",
        day_of_month: "[]",
        month_of_year: "[]",
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
};

const createVenueSchedule = async (
  queryInterface,
  Sequelize,
  transaction,
  venue_id,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "venue_schedule",
    [
      {
        venue_id,
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: venue_schedule_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue_schedule WHERE venue_id = :venue_id AND schedule_id = :schedule_id",
    {
      replacements: { venue_id, schedule_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return venue_schedule_id;
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id,
  start,
  duration,
  box_id
) => {
  await queryInterface.bulkInsert(
    "box_slot",
    [
      {
        schedule_id,
        start,
        duration,
        box_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: box_slot_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM box_slot WHERE schedule_id =:schedule_id AND box_id =:box_id AND duration =:duration AND start =:start",
    {
      replacements: { schedule_id, start, duration, box_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return box_slot_id;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const openTimes = await queryInterface.sequelize.query(
        "SELECT open_time.id as open_time_id, open_time.venue_id as venue_id, venue.code as venue_code, venue.name as venue_name, venue.schedule_id as schedule_id, open_time.weekday as weekday, open_time.start as open_time_start, open_time.end as open_time_end FROM venue INNER JOIN open_time ON venue.id=open_time.venue_id",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await queryInterface.addColumn(
        "open_time",
        "schedule_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          onDelete: "CASCADE",
          references: {
            model: "schedule",
            key: "id",
            as: "scheduleId",
          },
        },
        { transaction }
      );
      await queryInterface.addIndex("open_time", {
        fields: ["schedule_id"],
        unique: true,
        transaction,
      });

      await queryInterface.removeIndex("open_time", ["weekday", "venue_id"], {
        transaction,
      });
      await queryInterface.removeColumn("open_time", "venue_id", {
        transaction,
      });
      await queryInterface.removeColumn("open_time", "weekday", {
        transaction,
      });

      await queryInterface.removeColumn("venue", "schedule_id", {
        transaction,
      });
      const listOfBoxSlots = [];
      const listOfLinkedBoxSlots = [];
      await Promise.all(
        openTimes.map(
          async (
            {
              venue_name,
              venue_code,
              weekday,
              open_time_id,
              venue_id,
              open_time_start,
              open_time_end,
              schedule_id,
            },
            index
          ) => {
            const name = `${venue_name} ${weekday}`;
            const code = `${venue_code}-${weekday.toLowerCase()}`;
            let from = new Date();
            let to = new Date();
            let weekdayNumber = "[]";

            scheduleDates.forEach(async ({ venueCode, fromDate, toDate }) => {
              if (venue_code === venueCode) {
                from = fromDate;
                to = toDate;
                weekdayNumber = JSON.stringify([getNumberOfWeekday(weekday)]);
              }
            });

            const schedule = await createSchedule(
              queryInterface,
              Sequelize,
              transaction,
              name,
              code,
              from,
              to
            );

            await queryInterface.sequelize.query(
              "UPDATE open_time SET schedule_id = :schedule WHERE id = :open_time_id",
              {
                type: Sequelize.QueryTypes.UPDATE,
                replacements: {
                  schedule,
                  open_time_id,
                },
                transaction,
              }
            );

            await createVenueSchedule(
              queryInterface,
              Sequelize,
              transaction,
              venue_id,
              schedule
            );
            await createRecurrence(
              queryInterface,
              Sequelize,
              transaction,
              schedule,
              weekdayNumber
            );
            const boxSlots = await queryInterface.sequelize.query(
              "SELECT DISTINCT box_slot.id as id, box_slot_link.linked_box_slot_id as slot_id, box_slot.start as start, box_slot.duration as duration, box_slot.box_id as box_id FROM box_slot INNER JOIN box ON box_slot.box_id = box.id INNER JOIN venue ON box.venue_id = venue.id LEFT JOIN box_slot_link ON box_slot.id = box_slot_link.box_slot_id WHERE box_slot.start + INTERVAL box_slot.duration MINUTE <= :open_time_end AND box_slot.start >= :open_time_start AND venue.code = :venue_code AND box_slot.schedule_id = :schedule_id",
              {
                type: Sequelize.QueryTypes.SELECT,
                replacements: {
                  venue_code,
                  open_time_end,
                  open_time_start,
                  schedule_id,
                },
                transaction,
              }
            );
            await Promise.all(
              boxSlots.map(async ({ id, slot_id, start, duration, box_id }) => {
                const boxSlot = await createBoxSlot(
                  queryInterface,
                  Sequelize,
                  transaction,
                  schedule,
                  start,
                  duration,
                  box_id
                );
                if (slot_id) {
                  listOfBoxSlots.push({
                    box_slot_id: boxSlot,
                    pair_id: slot_id,
                    index,
                  });
                }
                if (!slot_id) {
                  listOfBoxSlots.forEach((slot) => {
                    if (slot.pair_id === id && slot.index === index) {
                      listOfLinkedBoxSlots.push({
                        box_slot_id: slot.box_slot_id,
                        linked_box_slot_id: boxSlot,
                        created_at,
                        updated_at,
                      });
                    }
                  });
                }
              })
            );
          }
        )
      );
      await Promise.all(
        schedulesAppliedDates.map(
          async ({ scheduleCode, appliedDates, dateOfApply }) => {
            await queryInterface.sequelize.query(
              "UPDATE schedule SET applied_dates = :appliedDates, date_of_apply = :dateOfApply WHERE code = :scheduleCode",
              {
                type: Sequelize.QueryTypes.UPDATE,
                replacements: {
                  scheduleCode,
                  appliedDates,
                  dateOfApply,
                },
                transaction,
              }
            );
          }
        )
      );
      await queryInterface.bulkInsert("box_slot_link", listOfLinkedBoxSlots, {
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "open_time",
        "venue_id",
        {
          type: Sequelize.INTEGER,
          field: "venue_id",
          onDelete: "CASCADE",
          references: {
            model: "venue",
            key: "id",
            as: "venueId",
          },
        },
        {
          transaction,
        }
      );
      await queryInterface.addColumn(
        "open_time",
        "weekday",
        {
          type: Sequelize.ENUM(
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ),
        },
        {
          transaction,
        }
      );

      await queryInterface.removeColumn("open_time", "schedule_id", {
        transaction,
      });

      await Promise.all(
        openTimeRefactored.map(
          async ({ weekday, openTimeId, venueId, scheduleId }) => {
            await queryInterface.sequelize.query(
              "UPDATE open_time SET venue_id = :venueId, weekday = :weekday WHERE id = :openTimeId",
              {
                type: Sequelize.UPDATE,
                replacements: {
                  venueId,
                  weekday,
                  openTimeId,
                },
                transaction,
              }
            );

            const boxSlotsIds = await queryInterface.sequelize.query(
              "SELECT box_slot.id as id FROM box_slot WHERE box_slot.schedule_id =:scheduleId",
              {
                replacements: { scheduleId },
                type: Sequelize.QueryTypes.SELECT,
                transaction,
              }
            );

            await queryInterface.bulkDelete(
              "box_slot_link",
              {
                box_slot_id: {
                  [Sequelize.Op.in]: boxSlotsIds.map(({ id }) => id),
                },
              },
              {
                transaction,
              }
            );
            await queryInterface.bulkDelete(
              "box_slot",
              { schedule_id: { [Sequelize.Op.eq]: scheduleId } },
              { transaction }
            );

            await queryInterface.bulkDelete(
              "schedule",
              { id: { [Sequelize.Op.eq]: scheduleId } },
              { transaction }
            );
          }
        )
      );

      await queryInterface.addColumn(
        "venue",
        "schedule_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "schedule",
            key: "id",
            as: "schduleId",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        {
          transaction,
        }
      );

      await Promise.all(
        venueRefactored.map(async ({ scheduleId, venueId }) => {
          await queryInterface.sequelize.query(
            "UPDATE venue SET schedule_id = :schedule_id WHERE id = :venue_id",
            {
              replacements: {
                schedule_id: scheduleId,
                venue_id: venueId,
              },
              type: Sequelize.QueryTypes.UPDATE,
              transaction,
            }
          );
        })
      );
      await queryInterface.addIndex("open_time", {
        fields: ["weekday", "venue_id"],
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
