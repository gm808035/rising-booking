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

const weekdays = ["Wednesday", "Thursday", "Sunday"];

const updateO2PeakPrices = async (queryInterface, Sequelize, transaction) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(queryInterface, Sequelize, transaction, day, "lon-o2")
  );

  const peakDayIds = await Promise.all(queries);

  await queryInterface.bulkUpdate(
    "price",
    {
      price: 5834,
    },
    { type: "peak", open_time_id: peakDayIds },
    {
      transaction,
    }
  );
};

const revertO2PeakPrices = async (queryInterface, Sequelize, transaction) => {
  const queries = weekdays.map((day) =>
    getWeekdayId(queryInterface, Sequelize, transaction, day, "lon-o2")
  );

  const peakDayIds = await Promise.all(queries);

  await queryInterface.bulkUpdate(
    "price",
    {
      price: 5833,
    },
    { type: "peak", open_time_id: peakDayIds },
    {
      transaction,
    }
  );
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await updateO2PeakPrices(queryInterface, Sequelize, transaction);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await revertO2PeakPrices(queryInterface, Sequelize, transaction);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      throw err;
    }
  },
};
