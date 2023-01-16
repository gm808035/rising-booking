module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("recurrence", "seperation_count", {
        transaction,
      });
      await queryInterface.addColumn(
        "recurrence",
        "separation_count",
        {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          field: "separationCount",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "recurrence",
        "ends_on",
        {
          type: Sequelize.DATEONLY,
          field: "endsOn",
        },
        { transaction }
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("recurrence", "separation_count", {
        transaction,
      });
      await queryInterface.removeColumn("recurrence", "ends_on", {
        transaction,
      });

      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
