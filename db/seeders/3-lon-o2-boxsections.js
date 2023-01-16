const code = "lon-o2";

const updateBoxes = async (
  queryInterface,
  Sequelize,
  transaction,
  sections = {}
) => {
  const venue = await queryInterface.sequelize.query(
    "SELECT box.id FROM venue INNER JOIN box ON box.venue_id = venue.id WHERE code = :code ORDER BY box.id",
    {
      replacements: { code },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const boxes = Array(17)
    .fill()
    .map((_, index) => ({
      id: venue[index].id,
      section: sections[index + 1] ?? 0,
    }));

  return Promise.all(
    boxes.map((box) =>
      queryInterface.bulkUpdate(
        "box",
        { section: box.section },
        {
          id: box.id,
        },
        {
          transaction,
        }
      )
    )
  );
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const sections = {
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 2,
        8: 2,
        9: 3,
        10: 3,
        11: 3,
        12: 3,
        13: 3,
        14: 4,
        15: 4,
        16: 5,
        17: 5,
      };

      await updateBoxes(queryInterface, Sequelize, transaction, sections);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const venue = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      if (venue.length) {
        await updateBoxes(queryInterface, Sequelize, transaction);
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
