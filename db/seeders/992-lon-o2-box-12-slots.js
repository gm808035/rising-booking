const boxSlotsSource = require("../seeders-data/lon-o2-box-12-slots");

const venueCode = "lon-o2";
const scheduleCode = "lon-o2-2021-11-boxslot-pair";

const created_at = new Date();
const updated_at = new Date();

const findSchedule = async (queryInterface, Sequelize, transaction) => {
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

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  box_ids,
  schedule_id
) => {
  const boxSlots = boxSlotsSource
    .map((boxSlot) => {
      const box_id = box_ids.find((box) => box.name === boxSlot.box).id;
      return boxSlot.slots.map((slot) => ({
        start: slot.start,
        duration: slot.duration,
        box_id,
        schedule_id,
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
      const scheduleId = await findSchedule(
        queryInterface,
        Sequelize,
        transaction
      );

      const [{ id: venue_id }] = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code: venueCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const boxIds = await queryInterface.sequelize.query(
        "SELECT id, name FROM box WHERE venue_id = :venue_id AND name IN(:name)",
        {
          replacements: {
            venue_id,
            name: boxSlotsSource.map((element) => element.box),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
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

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
