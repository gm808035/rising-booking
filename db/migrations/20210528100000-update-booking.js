module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        "booking",
        "extras",
        {
          type: Sequelize.TEXT,
        },
        {
          transaction,
        }
      );
      await queryInterface.changeColumn(
        "booking",
        "reference",
        {
          type: Sequelize.STRING,
        },
        {
          transaction,
        }
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        "booking",
        "extras",
        {
          type: Sequelize.STRING,
        },
        {
          transaction,
        }
      );
      await queryInterface.changeColumn(
        "booking",
        "reference",
        {
          type: Sequelize.STRING,
        },
        {
          transaction,
        }
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
