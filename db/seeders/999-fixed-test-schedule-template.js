const scheduleCode = "test-schedule-template";
const newScheduleDate = "2022-06-13";
const todayDate = new Date();

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkUpdate(
        "schedule",
        {
          from: newScheduleDate,
          to: newScheduleDate,
        },
        {
          code: scheduleCode,
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

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkUpdate(
        "schedule",
        {
          from: todayDate,
          to: todayDate,
        },
        {
          code: scheduleCode,
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
