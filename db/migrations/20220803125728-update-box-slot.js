module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint(
        "box_slot",
        "box_slot_schedule_id_foreign_idx",
        {
          transaction,
        }
      );
      await queryInterface.addConstraint("box_slot", {
        fields: ["schedule_id"],
        type: "foreign key",
        name: "box_slot_schedule_id_foreign_idx",
        references: {
          table: "schedule",
          field: "id",
          as: "schduleId",
        },
        onDelete: "CASCADE",
        transaction,
      });

      await queryInterface.removeConstraint(
        "box_slot_link",
        "box_slot_link_ibfk_1",
        {
          transaction,
        }
      );
      await queryInterface.addConstraint("box_slot_link", {
        fields: ["box_slot_id"],
        type: "foreign key",
        name: "box_slot_link_ibfk_1",
        references: {
          table: "box_slot",
          field: "id",
          as: "boxSlotId",
        },
        onDelete: "CASCADE",
        transaction,
      });

      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint(
        "box_slot",
        "box_slot_schedule_id_foreign_idx",
        {
          transaction,
        }
      );
      await queryInterface.addConstraint("box_slot", {
        fields: ["schedule_id"],
        type: "foreign key",
        name: "box_slot_schedule_id_foreign_idx",
        references: {
          table: "schedule",
          field: "id",
          as: "schduleId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        defaultValue: 1,
        transaction,
      });

      await queryInterface.removeConstraint(
        "box_slot_link",
        "box_slot_link_ibfk_1",
        {
          transaction,
        }
      );
      await queryInterface.addConstraint("box_slot_link", {
        fields: ["box_slot_id"],
        type: "foreign key",
        name: "box_slot_link_ibfk_1",
        references: {
          table: "box_slot",
          field: "id",
          as: "boxSlotId",
        },
        transaction,
      });

      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
