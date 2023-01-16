module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "venue_schedule",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          venueId: {
            type: Sequelize.INTEGER,
            field: "venue_id",
            allowNull: true,
            onDelete: "CASCADE",
            references: {
              model: "venue",
              key: "id",
              as: "venueId",
            },
          },
          scheduleId: {
            type: Sequelize.INTEGER,
            field: "schedule_id",
            allowNull: true,
            onDelete: "CASCADE",
            references: {
              model: "schedule",
              key: "id",
              as: "scheduleId",
            },
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
    await queryInterface.dropTable("venue_schedule");
  },
};
