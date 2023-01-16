module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        "box_booking",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          bookingId: {
            type: Sequelize.INTEGER,
            field: "booking_id",
            references: {
              model: "booking",
              key: "id",
              as: "bookingId",
            },
          },
          boxId: {
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
            type: Sequelize.DATE,
            field: "created_at",
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            field: "updated_at",
          },
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS SECTION_OVERTIME",
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
CREATE FUNCTION SECTION_OVERTIME(
  booking_section INT,
  selected_date DATETIME
) RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE overtime INT DEFAULT 0;

    SELECT FLOOR(COUNT(*) / 3) * 15 INTO overtime FROM booking
    INNER JOIN box_booking on box_booking.booking_id = booking.id
    INNER JOIN box ON box.id = box_booking.box_id
    WHERE booking_section = box.section
      AND booking.deleted_at IS NULL
      AND DATE(booking.start) = DATE(selected_date)
      AND (
        selected_date = booking.start
        OR selected_date = booking.end
      );

  RETURN overtime;
END
        `,
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
      await queryInterface.dropTable("box_booking", { transaction });

      await queryInterface.sequelize.query("DROP FUNCTION SECTION_OVERTIME", {
        transaction,
      });

      await queryInterface.sequelize.query(
        `
      CREATE FUNCTION SECTION_OVERTIME(
        booking_section INT,
        selected_date DATETIME
      ) RETURNS INT
      DETERMINISTIC
      BEGIN
        DECLARE overtime INT DEFAULT 0;

          SELECT FLOOR(COUNT(*) / 3) * 15 INTO overtime FROM booking
          INNER JOIN box ON box.id = booking.box_id
          WHERE booking_section = box.section
            AND booking.deleted_at IS NULL
            AND DATE(booking.start) = DATE(selected_date)
            AND (
              selected_date = booking.start
              OR selected_date = booking.end
            );

        RETURN overtime;
      END
      `,
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
};
