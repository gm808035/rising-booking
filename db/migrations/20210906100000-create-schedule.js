module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "schedule",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          name: {
            type: Sequelize.STRING,
          },
          code: {
            allowNull: false,
            unique: true,
            type: Sequelize.STRING,
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

      const code = "lon-o2-launch";
      await queryInterface.bulkInsert(
        "schedule",
        [
          {
            name: "London O2 - launch",
            code,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        {
          transaction,
        }
      );

      const [{ id: schedule_id }] = await queryInterface.sequelize.query(
        "SELECT id FROM schedule WHERE code = :code",
        {
          replacements: { code },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await queryInterface.addColumn(
        "venue",
        "schedule_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: schedule_id,
          references: {
            model: "schedule",
            key: "id",
            as: "schduleId",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        "box_slot",
        "schedule_id",
        {
          type: Sequelize.INTEGER,
          defaultValue: schedule_id,
          references: {
            model: "schedule",
            key: "id",
            as: "schduleId",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
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
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("venue", "schedule_id", {
        transaction,
      });
      await queryInterface.removeColumn("box_slot", "schedule_id", {
        transaction,
      });
      await queryInterface.dropTable("schedule", { transaction });
      return transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
