const getO2VenueId = async (queryInterface, Sequelize, transaction) => {
  const [{ id: venueId }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue WHERE code = :code",
    {
      replacements: {
        code: "lon-o2",
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return venueId;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const venueId = await getO2VenueId(
        queryInterface,
        Sequelize,
        transaction
      );

      await queryInterface.sequelize.query(
        "UPDATE open_time SET start = :start WHERE weekday IN(:weekday) AND venue_id = :venueId",
        {
          replacements: {
            start: "09:00",
            weekday: ["Saturday", "Sunday"],
            venueId,
          },
          type: Sequelize.QueryTypes.UPDATE,
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
      const venueId = await getO2VenueId(
        queryInterface,
        Sequelize,
        transaction
      );

      await queryInterface.sequelize.query(
        "UPDATE open_time SET start = :start WHERE weekday IN(:weekday) AND venue_id = :venueId",
        {
          replacements: {
            start: "11:00",
            weekday: ["Saturday", "Sunday"],
            venueId,
          },
          type: Sequelize.QueryTypes.UPDATE,
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
