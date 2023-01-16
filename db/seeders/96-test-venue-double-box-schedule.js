const boxSlotsSource = require("../seeders-data/lon-o2-boxslot-pairs");

const venueCode = "test-venue-dbb";
const scheduleCode = "test-venue-double-box-schedule";
const scheduleName = "Test Venue Double Box Pair";

const created_at = new Date();
const updated_at = new Date();
const weekdays = [
  "Monday",
  "Tuesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
        name: "Test Venue - DBB",
        code: venueCode,
        created_at,
        updated_at,
        schedule_id,
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
      replacements: {
        code: scheduleCode,
      },
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
          "SELECT box_slot_1.id AS box_slot_id, box_slot_2.id AS linked_box_slot_id, :created_at AS created_at, :updated_at AS updated_at FROM box_slot box_slot_1, box_slot box_slot_2 WHERE box_slot_1.box_id = :box_id AND box_slot_2.box_id = :paired_box_id AND box_slot_1.schedule_id = :schedule_id AND box_slot_2.schedule_id = :schedule_id AND (box_slot_1.start + INTERVAL :minute_diff MINUTE) = box_slot_2.start",
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
    pairs.filter(Boolean).flat(),
    {
      transaction,
    }
  );

  return boxSlotLinkResult;
};

const getWeekdayId = async (
  queryInterface,
  Sequelize,
  transaction,
  weekday,
  venueId
) => {
  const [{ id: weekdayId }] = await queryInterface.sequelize.query(
    "SELECT id FROM open_time WHERE weekday = :weekday AND venue_id = :venueId",
    {
      replacements: {
        weekday,
        venueId,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return weekdayId;
};

const addTestVenuePrices = async (
  queryInterface,
  Sequelize,
  transaction,
  venueId
) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(queryInterface, Sequelize, transaction, day, venueId)
  );

  const [mondayId, tuesdayId, thursdayId, fridayId, saturdayId, sundayId] =
    await Promise.all(queries);

  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id: mondayId,
        start: "13:30",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: mondayId,
        start: "16:00",
        end: "19:00",
        type: "peak",
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: tuesdayId,
        start: "22:30",
        end: "24:30",
        type: "peak", // entire day off peak
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: thursdayId,
        start: "09:00",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: thursdayId,
        start: "16:00",
        end: "19:00",
        type: "peak",
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: fridayId,
        start: "12:00",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: fridayId,
        start: "16:00",
        end: "19:00",
        type: "super-peak",
        price: 3001,
        created_at,
        updated_at,
      },
      {
        open_time_id: saturdayId,
        start: "12:00",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: saturdayId,
        start: "16:00",
        end: "19:00",
        type: "peak",
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: sundayId,
        start: "16:00",
        end: "17:00",
        type: "peak", // entire day peak
        price: 2001,
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

      const venueId = await createVenue(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

      await createOpenTime(queryInterface, Sequelize, transaction, venueId);
      await addTestVenuePrices(queryInterface, Sequelize, transaction, venueId);

      const boxIds = await createBox(
        queryInterface,
        Sequelize,
        transaction,
        venueId
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
          replacements: {
            code: venueCode,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      if (venue.length) {
        const schedule = await queryInterface.sequelize.query(
          "SELECT id FROM schedule WHERE code = :code",
          {
            replacements: {
              code: scheduleCode,
            },
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
              [Sequelize.Op.eq]: box_slot_ids.id,
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.bulkDelete(
          "schedule",
          {
            code: {
              [Sequelize.Op.eq]: scheduleCode,
            },
          },
          {
            transaction,
          }
        );

        const openTimes = await queryInterface.sequelize.query(
          "SELECT id FROM open_time WHERE venue_id = :venueId",
          {
            replacements: {
              venueId: venue[0].id,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        await queryInterface.bulkDelete(
          "price",
          {
            open_time_id: {
              [Sequelize.Op.in]: openTimes.map(({ id }) => id),
            },
          },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "open_time",
          {
            id: {
              [Sequelize.Op.in]: openTimes.map(({ id }) => id),
            },
          },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "venue",
          {
            code: {
              [Sequelize.Op.eq]: venueCode,
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
