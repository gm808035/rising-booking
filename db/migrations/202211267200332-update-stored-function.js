module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
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

    SELECT FLOOR(COUNT(*) / 3) * 10 INTO overtime FROM booking
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

    SELECT FLOOR(COUNT(*) / 3) * 10 INTO overtime FROM booking
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
};
