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
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const addO2Prices = async (queryInterface, Sequelize, transaction) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(queryInterface, Sequelize, transaction, day, "lon-o2")
  );

  const [
    mondayId,
    tuesdayId,
    wednesdayId,
    thursdayId,
    fridayId,
    saturdayId,
    sundayId,
  ] = await Promise.all(queries);

  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id: mondayId,
        start: "11:00",
        end: "23:59",
        type: "off-peak",
        price: 2917,
        created_at,
        updated_at,
      },
      {
        open_time_id: tuesdayId,
        start: "11:00",
        end: "23:59",
        type: "off-peak",
        price: 2917,
        created_at,
        updated_at,
      },
      {
        open_time_id: wednesdayId,
        start: "11:00",
        end: "15:59",
        type: "off-peak",
        price: 2917,
        created_at,
        updated_at,
      },
      {
        open_time_id: wednesdayId,
        start: "16:00",
        end: "23:59",
        type: "peak",
        price: 5833,
        created_at,
        updated_at,
      },
      {
        open_time_id: thursdayId,
        start: "11:00",
        end: "15:59",
        type: "off-peak",
        price: 2917,
        created_at,
        updated_at,
      },
      {
        open_time_id: thursdayId,
        start: "16:00",
        end: "23:59",
        type: "peak",
        price: 5833,
        created_at,
        updated_at,
      },
      {
        open_time_id: fridayId,
        start: "11:00",
        end: "15:59",
        type: "off-peak",
        price: 2917,
        created_at,
        updated_at,
      },
      {
        open_time_id: fridayId,
        start: "16:00",
        end: "24:59",
        type: "super-peak",
        price: 6667,
        created_at,
        updated_at,
      },
      {
        open_time_id: saturdayId,
        start: "09:00",
        end: "24:59",
        type: "super-peak",
        price: 6667,
        created_at,
        updated_at,
      },
      {
        open_time_id: sundayId,
        start: "09:00",
        end: "15:59",
        type: "super-peak",
        price: 6667,
        created_at,
        updated_at,
      },
      {
        open_time_id: sundayId,
        start: "16:00",
        end: "24:59",
        type: "peak",
        price: 5833,
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
      await addO2Prices(queryInterface, Sequelize, transaction);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const queries = weekdays.map((day) =>
      getWeekdayId(queryInterface, Sequelize, transaction, day, "lon-o2")
    );

    const weekdayIds = await Promise.all(queries);

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
