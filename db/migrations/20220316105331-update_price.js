module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("price", "open_time_id", {
        transaction,
      });
      await queryInterface.addColumn(
        "price",
        "open_time_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          onDelete: "CASCADE",
          references: {
            model: "open_time",
            key: "id",
            as: "openTimeId",
          },
        },
        { transaction }
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("price", "open_time_id", {
        transaction,
      });
      await queryInterface.addColumn(
        "price",
        "open_time_id",
        {
          type: Sequelize.INTEGER,
          field: "open_time_id",
          references: {
            model: "open_time",
            key: "id",
            onDelete: "CASCADE",
            as: "openTimeId",
          },
        },
        {
          transaction,
        }
      );
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
