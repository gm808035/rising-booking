module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "box",
        "section",
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        {
          transaction,
        }
      );
      await queryInterface.removeConstraint("booking", "reference", {
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

      await queryInterface.sequelize.query(
        `
CREATE FUNCTION ENOUGH_TIME_BEFORE(
  selected_date DATETIME,
  booking_start DATETIME,
  duration INT,
  cleanup INT,
  box_section INT
) RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE timebefore INT DEFAULT 0;

    SELECT TIMESTAMPDIFF(MINUTE, selected_date, booking_start) >=
      duration + cleanup + SECTION_OVERTIME(box_section, selected_date)
    INTO timebefore;

  RETURN timebefore;
END
      `,
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

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("box", "section", {
        transaction,
      });

      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS SECTION_OVERTIME",
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS ENOUGH_TIME_BEFORE",
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
