const getVenueId = async (
  queryInterface,
  Sequelize,
  transaction,
  venueCode
) => {
  const [{ id: venueId }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue WHERE code = :code",
    {
      replacements: {
        code: venueCode,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return venueId;
};

const getWeekdayId = async (
  queryInterface,
  Sequelize,
  transaction,
  weekday,
  venueCode
) => {
  const venueId = await getVenueId(
    queryInterface,
    Sequelize,
    transaction,
    venueCode
  );

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

const addTestVenuePrices = async (queryInterface, Sequelize, transaction) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(queryInterface, Sequelize, transaction, day, "test-venue")
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

const addTestVenueSchedulePrices = async (
  queryInterface,
  Sequelize,
  transaction
) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(
      queryInterface,
      Sequelize,
      transaction,
      day,
      "test-venue-schedule"
    )
  );

  const [mondayId, tuesdayId, thursdayId, fridayId, saturdayId, sundayId] =
    await Promise.all(queries);

  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id: mondayId,
        start: "09:00",
        end: "15:59",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
      {
        open_time_id: mondayId,
        start: "16:00",
        end: "20:00",
        type: "peak",
        price: 2001,
        created_at,
        updated_at,
      },
      {
        open_time_id: tuesdayId,
        start: "11:00",
        end: "24:30",
        type: "off-peak", // entire day off peak
        price: 1001,
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
      await Promise.all([
        addTestVenueSchedulePrices(queryInterface, Sequelize, transaction),
        addTestVenuePrices(queryInterface, Sequelize, transaction),
      ]);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    const testVenueQuery = weekdays.map((day) =>
      getWeekdayId(queryInterface, Sequelize, transaction, day, "test-venue")
    );
    const testVenueScheduleQuery = weekdays.map((day) =>
      getWeekdayId(
        queryInterface,
        Sequelize,
        transaction,
        day,
        "test-venue-schedule"
      )
    );

    const weekdayIds = await Promise.all([
      ...testVenueQuery,
      ...testVenueScheduleQuery,
    ]);

    try {
      await queryInterface.bulkDelete(
        "price",
        {
          open_time_id: {
            [Sequelize.Op.in]: weekdayIds,
          },
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      throw err;
    }
  },
};
