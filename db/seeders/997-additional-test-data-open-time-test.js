const created_at = new Date();
const updated_at = new Date();
const scheduleCode = "test-schedule-open-time-test";
const venueCode = "test-venue-template";

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

const createSchedule = async (queryInterface, Sequelize, transaction, code) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: "Test Schedule Open Time Test",
        code,
        from: "2022-06-15",
        to: "2022-06-17",
        applied_dates: JSON.stringify(["2022-10-15T00:00:00.000Z"]),
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
  return schedule_id;
};

const createVenueSchedule = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id,
  venue_id
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
};

const createOpenTime = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "open_time",
    [
      {
        start: "09:00",
        end: "23:00",
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
  return open_time_id;
};

const createPrice = async (
  queryInterface,
  Sequelize,
  transaction,
  open_time_id
) => {
  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id,
        start: "09:00",
        end: "23:00",
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
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "box_slot",
    [
      {
        start: "09:00",
        duration: 60,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "10:00",
        duration: 60,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "15:00",
        duration: 90,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "20:00",
        duration: 60,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "20:30",
        duration: 90,
        box_id: 36,
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    { transaction }
  );
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
      const scheduleId = await createSchedule(
        queryInterface,
        Sequelize,
        transaction,
        scheduleCode,
        venueId
      );

      await createVenueSchedule(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId,
        venueId
      );

      const openTimeId = await createOpenTime(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

      await createPrice(queryInterface, Sequelize, transaction, openTimeId);

      await createBoxSlot(queryInterface, Sequelize, transaction, scheduleId);

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
      if (schedule.length) {
        await queryInterface.bulkDelete(
          "venue_schedule",
          {
            schedule_id: {
              [Sequelize.Op.eq]: schedule[0].id,
            },
          },
          { transaction }
        );

        const box_slot_ids = await queryInterface.sequelize.query(
          "SELECT id FROM box_slot WHERE schedule_id = :schedule_id",
          {
            replacements: {
              schedule_id: schedule[0].id,
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
              [Sequelize.Op.eq]: schedule[0].id,
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
