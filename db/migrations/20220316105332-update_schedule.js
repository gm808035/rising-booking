module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      Promise.all([
        await queryInterface.addColumn(
          "schedule",
          "from",
          {
            type: Sequelize.DATEONLY,
          },
          { transaction }
        ),
        await queryInterface.addColumn(
          "schedule",
          "to",
          {
            type: Sequelize.DATEONLY,
          },
          { transaction }
        ),
        await queryInterface.addColumn(
          "schedule",
          "applied_dates",
          {
            type: Sequelize.JSON,
          },
          { transaction }
        ),
        await queryInterface.addColumn(
          "schedule",
          "date_of_apply",
          {
            type: Sequelize.DATE,
          },
          { transaction }
        ),
        await queryInterface.addColumn(
          "schedule",
          "order",
          {
            type: Sequelize.INTEGER,
            defaultValue: 1,
          },
          { transaction }
        ),
      ]);
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("schedule", "from", { transaction });
      await queryInterface.removeColumn("schedule", "to", { transaction });
      await queryInterface.removeColumn("schedule", "date_of_apply", {
        transaction,
      });
      await queryInterface.removeColumn("schedule", "applied_dates", {
        transaction,
      });
      await queryInterface.removeColumn("schedule", "order", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
