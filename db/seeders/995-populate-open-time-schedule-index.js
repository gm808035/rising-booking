module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addIndex("open_time", {
        fields: ["start", "end", "schedule_id"],
        unique: false,
        transaction,
      });

      await queryInterface.addIndex("schedule", {
        fields: ["date_of_apply"],
        unique: false,
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex(
        "open_time",
        ["start", "end", "schedule_id"],
        {
          transaction,
        }
      );

      await queryInterface.removeIndex("schedule", "date_of_apply", {
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
