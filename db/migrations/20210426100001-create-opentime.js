module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "open_time",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          weekday: {
            type: Sequelize.ENUM,
            values: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
          },
          start: {
            type: Sequelize.TIME,
          },
          end: {
            type: Sequelize.TIME,
          },
          startPeak: {
            field: "start_peak",
            type: Sequelize.TIME,
          },
          venueId: {
            type: Sequelize.INTEGER,
            field: "venue_id",
            onDelete: "CASCADE",
            references: {
              model: "venue",
              key: "id",
              as: "venueId",
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

      await queryInterface.addIndex("open_time", {
        fields: ["weekday", "venue_id"],
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
    await queryInterface.dropTable("open_time");
  },
};
