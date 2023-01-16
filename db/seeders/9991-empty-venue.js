const code = "empty-test-venue";
const todayDate = new Date();

const createVenue = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "venue",
    [
      {
        name: "Empty test venue",
        code,
        created_at: todayDate,
        updated_at: todayDate,
      },
    ],
    {
      transaction,
    }
  );
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await createVenue(queryInterface, Sequelize, transaction);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete(
        "venue",
        { code: { [Sequelize.Op.eq]: code } },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
