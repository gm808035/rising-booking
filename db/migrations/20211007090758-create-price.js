module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.createTable("price", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        openTimeId: {
          type: Sequelize.INTEGER,
          field: "open_time_id",
          references: {
            model: "open_time",
            key: "id",
            onDelete: "CASCADE",
            as: "openTimeId",
          },
        },
        start: {
          type: Sequelize.TIME,
        },
        end: {
          type: Sequelize.TIME,
        },
        type: {
          type: Sequelize.STRING,
        },
        price: {
          type: Sequelize.INTEGER,
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
      }),
      queryInterface.removeColumn("open_time", "start_peak"),
      queryInterface.removeColumn("venue", "price_peak"),
      queryInterface.removeColumn("venue", "price_off_peak"),
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.dropTable("price"),
      queryInterface.addColumn("open_time", "start_peak", {
        type: Sequelize.TIME,
      }),
      queryInterface.addColumn("venue", "price_peak", {
        type: Sequelize.INTEGER,
      }),
      queryInterface.addColumn("venue", "price_off_peak", {
        type: Sequelize.INTEGER,
      }),
    ]);
  },
};
