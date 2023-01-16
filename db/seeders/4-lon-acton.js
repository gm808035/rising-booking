const code = "lon-acton";
const created_at = new Date();
const updated_at = new Date();
const boxSlotsSource = require("../seeders-data/lon-acton-boxslots");

const createVenue = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "venue",
    [
      {
        name: "Labs",
        code,
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
      replacements: { code },
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
        weekday: "Monday",
        start: "09:00",
        end: "23:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Tuesday",
        start: "09:00",
        end: "23:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Wednesday",
        start: "09:00",
        end: "23:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Thursday",
        start: "09:00",
        end: "23:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Friday",
        start: "09:00",
        end: "24:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Saturday",
        start: "09:00",
        end: "24:59",
        venue_id,
        created_at,
        updated_at,
      },
      {
        weekday: "Sunday",
        start: "09:00",
        end: "23:59",
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
  const boxes = Array(2)
    .fill()
    .map((_, index) => ({
      name: index + 1,
      venue_id,
      created_at,
      updated_at,
    }));
  await queryInterface.bulkInsert("box", boxes, {
    transaction,
  });
  return queryInterface.sequelize.query(
    "SELECT id, name FROM box WHERE venue_id = :venue_id AND name IN(:name)",
    {
      replacements: { venue_id, name: boxes.map((element) => element.name) },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  boxesIds
) => {
  const boxSlots = boxSlotsSource
    .map((boxSlot) => {
      const box_id = boxesIds.find((box) => box.name === boxSlot.box).id;
      return boxSlot.slots.map((slot) => ({
        start: slot.start,
        duration: slot.duration,
        box_id,
        created_at,
        updated_at,
      }));
    })
    .flat();

  return queryInterface.bulkInsert("box_slot", boxSlots, {
    transaction,
  });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const venue_id = await createVenue(
        queryInterface,
        Sequelize,
        transaction
      );

      await createOpenTime(queryInterface, Sequelize, transaction, venue_id);

      const boxes = await createBox(
        queryInterface,
        Sequelize,
        transaction,
        venue_id
      );

      await createBoxSlot(queryInterface, Sequelize, transaction, boxes);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete(
        "venue",
        { code: { [Sequelize.Op.eq]: code } },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
