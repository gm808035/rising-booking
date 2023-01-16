module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "booking",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          start: {
            type: Sequelize.DATE,
          },
          end: {
            type: Sequelize.DATE,
          },
          boxSlotStart: {
            type: Sequelize.DATE,
            field: "box_slot_start",
          },
          price: {
            type: Sequelize.INTEGER,
          },
          reference: {
            type: Sequelize.STRING,
          },
          sessionId: {
            type: Sequelize.STRING,
            field: "session_id",
          },
          guests_no: {
            type: Sequelize.INTEGER,
          },
          extras: {
            type: Sequelize.STRING,
          },
          notes: {
            type: Sequelize.STRING,
          },
          source: {
            type: Sequelize.ENUM,
            values: ["online", "walkin", "reception", "phone"],
            defaultValue: "online",
          },
          type: {
            type: Sequelize.ENUM,
            values: ["social", "event", "other"],
            defaultValue: "social",
          },
          status: {
            type: Sequelize.ENUM,
            values: ["Payment in progress", "Paid"],
          },
          venueId: {
            allowNull: true,
            type: Sequelize.INTEGER,
            field: "venue_id",
            references: {
              model: "venue",
              key: "id",
              as: "venueId",
            },
          },
          boxId: {
            allowNull: true,
            type: Sequelize.INTEGER,
            field: "box_id",
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
          deletedAt: {
            allowNull: true,
            field: "deleted_at",
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      );

      await queryInterface.addIndex("booking", {
        fields: ["start", "end"],
        unique: false,
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("booking");
  },
};
