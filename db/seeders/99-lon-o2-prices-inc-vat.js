const venueCode = "lon-o2";
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const getVenueId = async (queryInterface, Sequelize, transaction) => {
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

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const venueId = await getVenueId(queryInterface, Sequelize, transaction);

      const queries = weekdays.map((weekday) =>
        getWeekdayId(queryInterface, Sequelize, transaction, weekday, venueId)
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

      // update off-peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 3500 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [
              mondayId,
              tuesdayId,
              wednesdayId,
              thursdayId,
              fridayId,
            ],
          },
          type: "off-peak",
        },
        {
          transaction,
        }
      );

      // update peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 7000 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [wednesdayId, thursdayId, sundayId],
          },
          type: "peak",
        },
        {
          transaction,
        }
      );

      // update super-peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 8000 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [fridayId, saturdayId, sundayId],
          },
          type: "super-peak",
        },
        {
          transaction,
        }
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
      const venueId = await getVenueId(queryInterface, Sequelize, transaction);

      const queries = weekdays.map((weekday) =>
        getWeekdayId(queryInterface, Sequelize, transaction, weekday, venueId)
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

      // revert off-peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 2917 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [
              mondayId,
              tuesdayId,
              wednesdayId,
              thursdayId,
              fridayId,
            ],
          },
          type: "off-peak",
        },
        {
          transaction,
        }
      );

      // revert peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 5834 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [wednesdayId, thursdayId, sundayId],
          },
          type: "peak",
        },
        {
          transaction,
        }
      );

      // revert super-peak prices
      await queryInterface.bulkUpdate(
        "price",
        { price: 6667 },
        {
          open_time_id: {
            [Sequelize.Op.in]: [fridayId, saturdayId, sundayId],
          },
          type: "super-peak",
        },
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
