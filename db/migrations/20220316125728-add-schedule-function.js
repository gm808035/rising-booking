module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS ACTIVE_SCHEDULE",
        {
          transaction,
        }
      );
      await queryInterface.sequelize.query(
        `
      CREATE FUNCTION ACTIVE_SCHEDULE(
        venue INT,
        selected_date DATE
      ) RETURNS INT
      DETERMINISTIC
      BEGIN
        DECLARE scheduleId INT;

             SELECT schedule.id INTO scheduleId FROM schedule
             INNER JOIN venue_schedule ON schedule.id = venue_schedule.schedule_id
	            WHERE JSON_CONTAINS(schedule.applied_dates, DATE_FORMAT(selected_date, '"%Y-%m-%dT00:00:00.000Z"'),'$') = 1
               AND venue_schedule.venue_id = venue
	             ORDER BY schedule.date_of_apply desc
	             LIMIT 1;

        RETURN scheduleId;
      END
      `,
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
      await queryInterface.sequelize.query("DROP FUNCTION ACTIVE_SCHEDULE", {
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
