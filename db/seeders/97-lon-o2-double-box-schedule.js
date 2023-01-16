const boxSlotsSource = require("../seeders-data/lon-o2-boxslot-pairs");

const venueCode = "lon-o2";
const scheduleCode = "lon-o2-2021-11-boxslot-pair";
const scheduleName = "Lon O2 Box Slot Pair";

const created_at = new Date();
const updated_at = new Date();

const createSchedule = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: scheduleName,
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

const createBoxSlotAndPair = async (
  queryInterface,
  Sequelize,
  transaction,
  box_ids,
  schedule_id
) => {
  const boxSlots = boxSlotsSource
    .map((boxSlot) => {
      const matchedBox = box_ids.find((box) => box.name === boxSlot.box);
      if (matchedBox) {
        const box_id = matchedBox.id;
        return boxSlot.slots.map((slot) => ({
          start: slot.start,
          duration: slot.duration,
          box_id,
          schedule_id,
          created_at,
          updated_at,
        }));
      }
      return [];
    })
    .flat();

  await queryInterface.bulkInsert("box_slot", boxSlots, {
    transaction,
  });
  await queryInterface.sequelize.query(
    "SELECT id, box_id, schedule_id, start FROM box_slot where schedule_id = :schedule_id; ",
    {
      replacements: {
        schedule_id,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  const pairs = await Promise.all(
    boxSlotsSource.map((boxSlot) => {
      const matchedBox = box_ids.find((box) => box.name === boxSlot.box);
      const pairedBox = box_ids.find((box) => box.name === boxSlot.pair);
      const minute_diff = boxSlot.minuteDiff;
      if (matchedBox && pairedBox) {
        const box_id = matchedBox.id;
        const paired_box_id = pairedBox.id;
        const pairedSlot = queryInterface.sequelize.query(
          "SELECT box_slot_1.id AS box_slot_id, box_slot_2.id AS linked_box_slot_id, :created_at AS created_at, :updated_at as updated_at FROM box_slot box_slot_1, box_slot box_slot_2 WHERE box_slot_1.box_id = :box_id AND box_slot_2.box_id = :paired_box_id AND box_slot_1.schedule_id = :schedule_id AND box_slot_2.schedule_id = :schedule_id AND (box_slot_1.start + INTERVAL :minute_diff MINUTE) = box_slot_2.start",
          {
            replacements: {
              paired_box_id,
              box_id,
              created_at,
              updated_at,
              schedule_id,
              minute_diff,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        return pairedSlot;
      }
      return null;
    })
  );

  const boxSlotLinkResult = queryInterface.bulkInsert(
    "box_slot_link",
    pairs.flat().filter(Boolean),
    {
      transaction,
    }
  );

  return boxSlotLinkResult;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const scheduleId = await createSchedule(
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

      await createBoxSlotAndPair(
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
        const schedule = await queryInterface.sequelize.query(
          "SELECT id FROM schedule WHERE code = :code",
          {
            replacements: { code: scheduleCode },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        const box_slot_ids = await queryInterface.sequelize.query(
          "SELECT id FROM box_slot WHERE schedule_id = :schedule_id",
          {
            replacements: { schedule_id: schedule[0].id },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        await queryInterface.bulkDelete(
          "box_slot_link",
          { box_slot_id: { [Sequelize.Op.eq]: box_slot_ids.id } },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "box_slot",
          { id: { [Sequelize.Op.eq]: box_slot_ids.id } },
          { transaction }
        );

        const [{ id: oldScheduleId }] = await queryInterface.sequelize.query(
          "SELECT id FROM schedule WHERE code = :code",
          {
            replacements: { code: "lon-o2-2021-09" },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        // assigns old schedule to lon-o2 venue
        await queryInterface.sequelize.query(
          "UPDATE venue SET schedule_id = :schedule_id WHERE id = :venue_id",
          {
            replacements: {
              schedule_id: oldScheduleId,
              venue_id: venue[0].id,
            },
            type: Sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );
      }

      await queryInterface.bulkDelete(
        "schedule",
        { code: { [Sequelize.Op.eq]: scheduleCode } },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
