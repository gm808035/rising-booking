const created_at = new Date();
const updated_at = new Date();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const bookingAndBoxIds = await queryInterface.sequelize.query(
        "SELECT id as booking_id, box_id as box_id, :created_at as created_at, :updated_at as updated_at FROM booking ",
        {
          replacements: { created_at, updated_at },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await queryInterface.bulkInsert("box_booking", bookingAndBoxIds, {
        transaction,
      });

      await queryInterface.removeConstraint("booking", "booking_ibfk_2", {
        transaction,
      });
      await queryInterface.removeColumn("booking", "box_id", { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "booking",
        "box_id",
        { type: Sequelize.DataTypes.INTEGER },
        { transaction }
      );
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

      const bookingBoxIds = await queryInterface.sequelize.query(
        "SELECT booking_id AS id, box_id FROM box_booking",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await Promise.all(
        bookingBoxIds.map(({ id, box_id }) =>
          queryInterface.sequelize.query(
            "UPDATE booking SET box_id = :box_id WHERE id = :id",
            {
              type: Sequelize.QueryTypes.UPDATE,
              replacements: {
                box_id,
                id,
              },
              transaction,
            }
          )
        )
      );

      await queryInterface.bulkDelete("box_booking", {}, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
