/*
Conrad Spiteri, 2021-07-01 15:12
@David Piçarra please proceed with blocking bookings for the 29th and 30th July as instructed by @Imtiaz Chowdhury
Please confirm when done.
 */
const { eachDayOfInterval, add } = require("date-fns");

const code = "lon-o2";
const created_at = new Date();
const updated_at = new Date();
const bookingsSource = [
  {
    box: "1",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "2",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "3",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "4",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "5",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "6",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "7",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "8",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "9",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "10",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "11",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "12",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
  {
    box: "13",
    start: "2021-07-29 00:00",
    end: "2021-07-30 23:59",
  },
];

const createBookings = async (
  queryInterface,
  Sequelize,
  transaction,
  venue_id,
  boxes
) => {
  const bookings = bookingsSource
    .map((booking) => {
      const box_id = boxes.find((box) => box.name === booking.box).id;
      return eachDayOfInterval({
        start: new Date(booking.start),
        end: new Date(booking.end),
      }).map((date) => ({
        start: date,
        end: add(new Date(date), { hours: 23, minutes: 59 }),
        type: "other",
        box_id,
        venue_id,
        created_at,
        updated_at,
      }));
    })
    .flat();

  return queryInterface.bulkInsert("booking", bookings, {
    transaction,
  });
};

const deleteBookings = async (
  queryInterface,
  Sequelize,
  transaction,
  venue_id,
  boxes
) =>
  Promise.all(
    bookingsSource.map((booking) =>
      queryInterface.bulkUpdate(
        "booking",
        {
          deleted_at: new Date(),
        },
        {
          box_id: boxes.find((box) => box.name === booking.box).id,
          venue_id,
          start: {
            [Sequelize.Op.gte]: booking.start,
            [Sequelize.Op.lte]: booking.end,
          },
          end: {
            [Sequelize.Op.gte]: booking.start,
            [Sequelize.Op.lte]: booking.end,
          },
          type: "other",
        },
        {
          transaction,
        }
      )
    )
  );

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [{ id: venue_id }] = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const boxes = await queryInterface.sequelize.query(
        "SELECT id, name FROM box WHERE venue_id = :venue_id",
        {
          replacements: {
            venue_id,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      await createBookings(
        queryInterface,
        Sequelize,
        transaction,
        venue_id,
        boxes
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [{ id: venue_id } = {}] = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (venue_id) {
        const boxes = await queryInterface.sequelize.query(
          "SELECT id, name FROM box WHERE venue_id = :venue_id",
          {
            replacements: {
              venue_id,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        await deleteBookings(
          queryInterface,
          Sequelize,
          transaction,
          venue_id,
          boxes
        );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
