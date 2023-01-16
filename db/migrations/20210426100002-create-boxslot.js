module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "box_slot",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          start: {
            type: Sequelize.TIME,
          },
          duration: {
            type: Sequelize.INTEGER,
          },
          boxId: {
            type: Sequelize.INTEGER,
            field: "box_id",
            onDelete: "CASCADE",
            references: {
              model: "box",
              key: "id",
              as: "boxId",
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
    await queryInterface.dropTable("box_slot");
  },
};
