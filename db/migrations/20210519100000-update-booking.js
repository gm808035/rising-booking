module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint("booking", "booking_ibfk_1", {
        transaction,
      });
      await queryInterface.addConstraint("booking", {
        fields: ["venue_id"],
        type: "foreign key",
        name: "booking_ibfk_1",
        references: {
          table: "venue",
          field: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.removeConstraint("booking", "booking_ibfk_2", {
        transaction,
      });
      await queryInterface.addConstraint("booking", {
        fields: ["box_id"],
        type: "foreign key",
        name: "booking_ibfk_2",
        references: {
          table: "box",
          field: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });
      await queryInterface.changeColumn(
        "booking",
        "reference",
        {
          type: Sequelize.STRING,
          unique: true,
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

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint("booking", "booking_ibfk_1", {
        transaction,
      });
      await queryInterface.addConstraint("booking", {
        fields: ["venue_id"],
        type: "foreign key",
        name: "booking_ibfk_1",
        references: {
          table: "venue",
          field: "id",
        },
        transaction,
      });

      await queryInterface.removeConstraint("booking", "booking_ibfk_2", {
        transaction,
      });
      await queryInterface.addConstraint("booking", {
        fields: ["box_id"],
        type: "foreign key",
        name: "booking_ibfk_2",
        references: {
          table: "box",
          field: "id",
        },
        transaction,
      });

      await queryInterface.changeColumn(
        "booking",
        "reference",
        {
          type: Sequelize.STRING,
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
