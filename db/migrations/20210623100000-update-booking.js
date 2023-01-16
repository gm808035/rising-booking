module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        "booking",
        "status",
        {
          type: Sequelize.ENUM,
          values: ["Payment in progress", "Paid", "Cancelled"],
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
      await queryInterface.bulkUpdate(
        "booking",
        { status: null },
        { status: "Cancelled" },
        { transaction }
      );
      await queryInterface.changeColumn(
        "booking",
        "status",
        {
          type: Sequelize.ENUM,
          values: ["Payment in progress", "Paid"],
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
