module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.createTable("box_slot_link", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      boxSlotId: {
        type: Sequelize.INTEGER,
        field: "box_slot_id",
        references: {
          model: "box_slot",
          key: "id",
          as: "boxSlotId",
        },
      },
      linkedBoxSlotId: {
        type: Sequelize.INTEGER,
        field: "linked_box_slot_id",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: "created_at",
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: "updated_at",
      },
    }),
  down: async (queryInterface) => queryInterface.dropTable("box_slot_link"),
};
