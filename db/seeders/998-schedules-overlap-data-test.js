const created_at = new Date();
const updated_at = new Date();
const venueCode = "test-venue-template";
const scheduleCode = "schedule-overlap-test";
const scheduleName = "Test Schedule overlap test";
const scheduleFrom = "2022-07-07";
const scheduleTo = "2022-07-11";
const scheduleAppliedDates = JSON.stringify([
  "2022-07-07T00:00:00.000Z",
  "2022-07-08T00:00:00.000Z",
  "2022-07-09T00:00:00.000Z",
  "2022-07-10T00:00:00.000Z",
  "2022-07-11T00:00:00.000Z",
]);

const overlappedScheduleCode = "second-schedule-overlap-test";
const overlappedScheduleName = "Second Test Schedule overlap test";
const overlappedScheduleFrom = "2022-07-08";
const overlappedScheduleTo = "2022-07-10";
const overlappedScheduleAppliedDates = "[]";

const slotsSource = [
  {
    start: "09:00",
    duration: 90,
    box_id: 35,
  },
];
const overlappedSlotsSource = [
  {
    start: "09:00",
    duration: 60,
    box_id: 35,
  },
];

const getTestVenueId = async (queryInterface, Sequelize, transaction, code) => {
  const [{ id: venueId }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue WHERE code = :code",
    {
      replacements: {
        code,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return venueId;
};

const createSchedule = async (
  queryInterface,
  Sequelize,
  transaction,
  name,
  code,
  from,
  to,
  applied_dates,
  venue_id,
  boxSlots
) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name,
        code,
        from,
        to,
        applied_dates,
        date_of_apply: new Date(),
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
    "SELECT id FROM schedule WHERE code = :code",
    {
      replacements: { code },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

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

  await queryInterface.bulkInsert(
    "open_time",
    [
      {
        start: "09:00",
        end: "20:00",
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: open_time_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM open_time WHERE schedule_id = :schedule_id",
    {
      replacements: { schedule_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id,
        start: "09:00",
        end: "20:00",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const slots = boxSlots.map(({ start, duration, box_id }) => ({
    start,
    duration,
    box_id,
    schedule_id,
    created_at,
    updated_at,
  }));
  await queryInterface.bulkInsert("box_slot", slots, { transaction });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const venueId = await getTestVenueId(
        queryInterface,
        Sequelize,
        transaction,
        venueCode
      );
      await createSchedule(
        queryInterface,
        Sequelize,
        transaction,
        scheduleName,
        scheduleCode,
        scheduleFrom,
        scheduleTo,
        scheduleAppliedDates,
        venueId,
        slotsSource
      );

      await createSchedule(
        queryInterface,
        Sequelize,
        transaction,
        overlappedScheduleName,
        overlappedScheduleCode,
        overlappedScheduleFrom,
        overlappedScheduleTo,
        overlappedScheduleAppliedDates,
        venueId,
        overlappedSlotsSource
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const schedule = await queryInterface.sequelize.query(
        "SELECT id FROM schedule WHERE code = :code",
        {
          replacements: { code: scheduleCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      const overlappedSchedule = await queryInterface.sequelize.query(
        "SELECT id FROM schedule WHERE code = :code",
        {
          replacements: { code: overlappedScheduleCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (schedule.length && overlappedSchedule.length) {
        await queryInterface.bulkDelete(
          "venue_schedule",
          {
            schedule_id: {
              [Sequelize.Op.in]: [schedule[0].id, overlappedSchedule[0].id],
            },
          },
          { transaction }
        );

        const box_slot_ids = await queryInterface.sequelize.query(
          "SELECT id FROM box_slot WHERE schedule_id IN (:scheduleId, :overlappedScheduleId)",
          {
            replacements: {
              scheduleId: schedule[0].id,
              overlappedScheduleId: overlappedSchedule[0].id,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        await queryInterface.bulkDelete(
          "box_slot",
          {
            id: {
              [Sequelize.Op.in]: box_slot_ids.map(({ id }) => id),
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.bulkDelete(
          "schedule",
          {
            id: {
              [Sequelize.Op.in]: [schedule[0].id, overlappedSchedule[0].id],
            },
          },
          {
            transaction,
          }
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
