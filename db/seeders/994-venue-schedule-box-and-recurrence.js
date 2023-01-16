const venueCode = "test-venue-template";
const scheduleCode = "test-schedule-template";
const created_at = new Date();
const updated_at = new Date();

const boxSlotsSource = require("../seeders-data/test-schedule-boxslot-pairs");

const createSchedule = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: "Test Schedule Template",
        code: scheduleCode,
        from: new Date(),
        to: new Date(),
        applied_dates: JSON.stringify([
          "2022-04-15T00:00:00.000Z",
          "2022-04-16T00:00:00.000Z",
          "2022-04-17T00:00:00.000Z",
          "2021-12-16T00:00:00.000Z",
          "2022-04-18T00:00:00.000Z",
          "2022-04-19T00:00:00.000Z",
          "2022-04-20T00:00:00.000Z",
          "2022-05-15T00:00:00.000Z",
        ]),
        order: 1,
        date_of_apply: new Date(),
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

const createVenue = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "venue",
    [
      {
        name: "Test venue template",
        code: venueCode,
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

const createRecurrence = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "recurrence",
    [
      {
        schedule_id,
        recurrence_type: "weekly",
        day_of_week: "[1,2]",
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
  const boxIds = await queryInterface.sequelize.query(
    "SELECT id, name FROM box WHERE venue_id = :venue_id AND name IN(:name)",
    {
      replacements: { venue_id, name: boxes.map((element) => element.name) },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return boxIds.map((box) => ({ id: box.id, name: box.name }));
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  box_ids,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "box_slot",
    [
      {
        start: "11:00",
        duration: 90,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "12:40",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "13:50",
        duration: 90,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "16:40",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },

      {
        start: "09:00",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "16:00",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "18:00",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "19:00",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "11:14",
        duration: 90,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "20:00",
        duration: 90,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "15:45",
        duration: 60,
        box_id: box_ids[0].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "14:15",
        duration: 90,
        box_id: box_ids[1].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "09:00",
        duration: 60,
        box_id: box_ids[1].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "11:00",
        duration: 60,
        box_id: box_ids[2].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "16:00",
        duration: 60,
        box_id: box_ids[2].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "20:00",
        duration: 90,
        box_id: box_ids[2].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "20:00",
        duration: 90,
        box_id: box_ids[2].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "09:00",
        duration: 60,
        box_id: box_ids[2].id,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "09:00",
        duration: 60,
        box_id: box_ids[2].id,
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
    "SELECT id, box_id, schedule_id, start FROM box_slot WHERE schedule_id = :schedule_id",
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
        end: "23:59",
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
  const [{ id: openTimeId }] = await queryInterface.sequelize.query(
    "SELECT id FROM open_time WHERE schedule_id = :schedule_id",
    {
      replacements: {
        schedule_id,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return openTimeId;
};

const addSchedulePrices = async (
  queryInterface,
  Sequelize,
  transaction,
  openTimeId
) => {
  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id: openTimeId,
        start: "09:00",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: openTimeId,
        start: "16:00",
        end: "18:00",
        type: "peak",
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: openTimeId,
        start: "18:00",
        end: "23:59",
        type: "super-peak",
        price: 3001,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
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
      const venueId = await createVenue(queryInterface, Sequelize, transaction);

      await createVenueSchedule(
        queryInterface,
        Sequelize,
        transaction,
        venueId,
        scheduleId
      );
      await createRecurrence(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

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

      const openTimeId = await createOpenTime(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

      await addSchedulePrices(
        queryInterface,
        Sequelize,
        transaction,
        openTimeId
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
          replacements: {
            schedule_id: schedule[0].id,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await queryInterface.bulkDelete(
        "box_slot_link",
        {
          box_slot_id: {
            [Sequelize.Op.in]: box_slot_ids.map(({ id }) => id),
          },
        },
        {
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

      if (venue.length) {
        await queryInterface.bulkDelete(
          "box",
          { venue_id: { [Sequelize.Op.eq]: venue[0].id } },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "schedule",
          {
            code: {
              [Sequelize.Op.eq]: scheduleCode,
            },
          },
          { transaction }
        );
        await queryInterface.bulkDelete(
          "venue",
          { code: { [Sequelize.Op.eq]: venueCode } },
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
