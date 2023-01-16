const created_at = new Date();
const updated_at = new Date();

const createSections = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.bulkInsert(
    "box_section",
    [
      {
        name: "Midfield Bar",
        created_at,
        updated_at,
      },
      {
        name: "Corner Bar",
        created_at,
        updated_at,
      },
      {
        name: "Upper Mezz",
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );

  const sections = await queryInterface.sequelize.query(
    "SELECT id FROM box_section",
    {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return sections;
};

const updateBoxes = async (
  queryInterface,
  Sequelize,
  transaction,
  sections
) => {
  const boxes = await queryInterface.sequelize.query(
    "SELECT id, name, venue_id FROM box",
    {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const section = (index, boxSection) => {
    if (index < 6) return boxSection[0].id;
    if (index >= 6 && index <= 13) return boxSection[1].id;
    return boxSection[2].id;
  };

  return Promise.all(
    boxes.map((box) =>
      queryInterface.bulkUpdate(
        "box",
        { box_section_id: section(box.name, sections) },
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
      await queryInterface.removeColumn("box", "section", {
        transaction,
      });

      const sections = await createSections(
        queryInterface,
        Sequelize,
        transaction
      );

      await updateBoxes(queryInterface, Sequelize, transaction, sections);

      const venue = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code: "test-venue" },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      console.log(venue[0].id);
      const updateTestVenueBoxes = await queryInterface.sequelize.query(
        "SELECT id, name FROM box WHERE venue_id = :venue",
        {
          replacements: { venue: venue[0].id },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      console.log(updateTestVenueBoxes);

      await Promise.all(
        updateTestVenueBoxes.map((box) =>
          queryInterface.bulkUpdate(
            "box",
            { box_section_id: box.name === "1" ? 1 : 2 },
            {
              id: box.id,
            },
            {
              transaction,
            }
          )
        )
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
      await queryInterface.bulkDelete("box_section", { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
