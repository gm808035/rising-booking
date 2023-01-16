module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "recurrence",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          scheduleId: {
            type: Sequelize.INTEGER,
            field: "schedule_id",
            allowNull: false,
            onDelete: "CASCADE",
            references: {
              model: "schedule",
              key: "id",
              as: "scheduleId",
            },
          },
          recurrenceType: {
            type: Sequelize.ENUM,
            values: ["weekly", "monthly", "yearly"],
            allowNull: false,
            field: "recurrence_type",
          },
          dayOfWeek: {
            type: Sequelize.JSON,
            field: "day_of_week",
          },
          seperationCount: {
            type: Sequelize.INTEGER,
            defaultValue: 1,
            field: "seperation_count",
          },
          weekOfMonth: {
            type: Sequelize.JSON,
            field: "week_of_month",
          },
          dayOfMonth: {
            type: Sequelize.JSON,
            field: "day_of_month",
          },
          monthOfYear: {
            type: Sequelize.JSON,
            field: "month_of_year",
          },
          createdAt: {
            allowNull: false,
            field: "created_at",
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            field: "updated_at",
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );
      await queryInterface.addIndex("recurrence", {
        fields: ["schedule_id"],
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("recurrence");
  },
};
