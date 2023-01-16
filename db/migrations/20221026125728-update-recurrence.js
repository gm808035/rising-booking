module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("recurrence", "ends_on", {
        transaction,
      });
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "recurrence",
        "ends_on",
        {
          type: Sequelize.DATEONLY,
          field: "endsOn",
        },
        { transaction }
      );

      const recurrence = await queryInterface.sequelize.query(
        "SELECT schedule.id as scheduleId, schedule.to as scheduleTo FROM schedule INNER JOIN recurrence ON schedule.id = recurrence.schedule_id",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      await Promise.all(
        recurrence.map(async ({ scheduleId, scheduleTo }) => {
          const update = await queryInterface.bulkUpdate(
            "recurrence",
            { ends_on: scheduleTo },
            { schedule_id: scheduleId },
            { transaction }
          );
          return update;
        })
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
