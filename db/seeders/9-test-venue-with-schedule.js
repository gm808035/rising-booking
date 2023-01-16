const venueCode = "test-venue-schedule";
const scheduleCode = "test-schedule";
const created_at = new Date();
const updated_at = new Date();

const createSchedule = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: "Test Schedule",
        code: scheduleCode,
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
      replacements: { code: scheduleCode },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return schedule_id;
};

const createVenue = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "venue",
    [
      {
        name: "Test venue - schedule",
        code: venueCode,
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: venue_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue WHERE code = :code",
    {
      replacements: { code: venueCode },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return venue_id;
};

const createOpenTime = (queryInterface, Sequelize, transaction, venue_id) =>
  queryInterface.bulkInsert(
    "open_time",
    [
      {
        weekday: "Monday", // Monday
        start: "09:00",
        end: "20:00",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Tuesday", // Tuesday
        start: "11:00",
        end: "24:30",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Thursday", // Thursday
        start: "09:00",
        end: "19:00",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Friday", // Friday
        start: "12:00",
        end: "19:00",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Saturday", // Saturday
        start: "12:00",
        end: "19:00",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Sunday", // Sunday
        start: "16:00",
        end: "17:00",
        venue_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );

const createBox = async (queryInterface, Sequelize, transaction, venue_id) => {
  const boxes = Array(5)
    .fill()
    .map((_, index) => ({
      name: index + 1,
      section: index === 0 ? 1 : 2,
      venue_id,
      created_at,
      updated_at,
    }));
  await queryInterface.bulkInsert("box", boxes, {
    transaction,
  });
  return queryInterface.sequelize
    .query("SELECT id FROM box WHERE venue_id = :venue_id AND name IN(:name)", {
      replacements: { venue_id, name: boxes.map((element) => element.name) },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    })
    .then((returnedBoxes) => returnedBoxes.map((box) => box.id));
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  box_ids,
  schedule_id
) =>
  queryInterface.bulkInsert(
    "box_slot",
    [
      {
        start: "11:00",
        duration: 90,
        box_id: box_ids[0],
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "12:40",
        duration: 60,
        box_id: box_ids[0],
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "13:50",
        duration: 90,
        box_id: box_ids[0],
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "16:40",
        duration: 60,
        box_id: box_ids[0],
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const scheduleId = await createSchedule(
        queryInterface,
        Sequelize,
        transaction
      );
      const venueId = await createVenue(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

      await createOpenTime(queryInterface, Sequelize, transaction, venueId);

      const boxIds = await createBox(
        queryInterface,
        Sequelize,
        transaction,
        venueId
      );

      await createBoxSlot(
        queryInterface,
        Sequelize,
        transaction,
        boxIds,
        scheduleId
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
      const venue = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code: venueCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      if (venue.length) {
        await queryInterface.bulkDelete(
          "box",
          { venue_id: { [Sequelize.Op.eq]: venue[0].id } },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "box_slot",
          { schedule_id: { [Sequelize.Op.eq]: venue[0].schedule_id } },
          { transaction }
        );
      }

      await queryInterface.bulkDelete(
        "schedule",
        { code: { [Sequelize.Op.eq]: venueCode } },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
