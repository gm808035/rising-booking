const created_at = new Date();
const updated_at = new Date();
const scheduleCode = "test-venue-schedule-addition-test";
const venueCode = "test-venue-template";
const bookingsSource = [
  {
    start: "2022-06-16 15:00",
    end: "2022-06-16 16:00",
    box_id: 35,
  },
  {
    start: "2022-06-16 17:00",
    end: "2022-06-16 18:30",
    box_id: 35,
  },
  {
    start: "2022-06-17 15:00",
    end: "2022-06-17 16:00",
    box_id: 35,
  },
];

const getTestVenueId = async (queryInterface, Sequelize, transaction, code) => {
  const [{ id: venueId }] = await queryInterface.sequelize.query(
    "SELECT id FROM venue WHERE code = :code",
    {
      replacements: {
        code,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return venueId;
};

const createSchedule = async (queryInterface, Sequelize, transaction, code) => {
  await queryInterface.bulkInsert(
    "schedule",
    [
      {
        name: "Test Venue Schedule addition test",
        code,
        from: "2022-06-15",
        to: "2022-06-17",
        applied_dates: "[]",
        order: 1,
        created_at,
        updated_at,
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
  return schedule_id;
};

const createVenueSchedule = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id,
  venue_id
) => {
  await queryInterface.bulkInsert(
    "venue_schedule",
    [
      {
        venue_id,
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
};

const createOpenTime = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "open_time",
    [
      {
        start: "09:00",
        end: "23:00",
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );

  const [{ id: open_time_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM open_time WHERE schedule_id = :schedule_id",
    {
      replacements: { schedule_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return open_time_id;
};

const createPrice = async (
  queryInterface,
  Sequelize,
  transaction,
  open_time_id
) => {
  await queryInterface.bulkInsert(
    "price",
    [
      {
        open_time_id,
        start: "09:00",
        end: "23:00",
        type: "off-peak",
        price: 1001,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
};

const createBoxSlot = async (
  queryInterface,
  Sequelize,
  transaction,
  schedule_id
) => {
  await queryInterface.bulkInsert(
    "box_slot",
    [
      {
        start: "15:00",
        duration: 60,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
      {
        start: "17:00",
        duration: 90,
        box_id: 35,
        schedule_id,
        created_at,
        updated_at,
      },
    ],
    { transaction }
  );
};

const createBooking = async (
  queryInterface,
  Sequelize,
  transaction,
  start,
  end,
  venue_id
) => {
  await queryInterface.bulkInsert(
    "booking",
    [
      {
        start,
        end,
        type: "other",
        venue_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );

  const [{ id: booking_id }] = await queryInterface.sequelize.query(
    "SELECT id FROM booking WHERE venue_id = :venue_id AND start =:start AND end =:end AND type ='other'",
    {
      replacements: { venue_id, start, end },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return booking_id;
};

const createBoxBooking = async (
  queryInterface,
  Sequelize,
  transaction,
  booking_id,
  box_id
) => {
  await queryInterface.bulkInsert(
    "box_booking",
    [
      {
        booking_id,
        box_id,
        created_at,
        updated_at,
      },
    ],
    {
      transaction,
    }
  );
};

const deleteBookings = async (
  queryInterface,
  Sequelize,
  transaction,
  venue_id
) =>
  Promise.all(
    bookingsSource.map(async ({ start, end, box_id }) => {
      const [{ id: booking_id }] = await queryInterface.sequelize.query(
        "SELECT id FROM booking WHERE venue_id = :venue_id AND start =:start AND end =:end AND type = 'other'",
        {
          replacements: { venue_id, start, end },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      await queryInterface.bulkUpdate(
        "booking",
        {
          deleted_at: new Date(),
        },
        {
          id: booking_id,
        },
        {
          transaction,
        }
      );
      await queryInterface.bulkDelete(
        "box_booking",
        {
          [Sequelize.Op.and]: [
            { booking_id: { [Sequelize.Op.eq]: booking_id } },
            { box_id: { [Sequelize.Op.eq]: box_id } },
          ],
        },
        { transaction }
      );
    })
  );

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const venueId = await getTestVenueId(
        queryInterface,
        Sequelize,
        transaction,
        venueCode
      );
      const scheduleId = await createSchedule(
        queryInterface,
        Sequelize,
        transaction,
        scheduleCode,
        venueId
      );

      await createVenueSchedule(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId,
        venueId
      );

      const openTimeId = await createOpenTime(
        queryInterface,
        Sequelize,
        transaction,
        scheduleId
      );

      await createPrice(queryInterface, Sequelize, transaction, openTimeId);

      await createBoxSlot(queryInterface, Sequelize, transaction, scheduleId);

      await Promise.all(
        bookingsSource.map(async ({ start, end, box_id }) => {
          const booking_id = await createBooking(
            queryInterface,
            Sequelize,
            transaction,
            start,
            end,
            venueId
          );
          await createBoxBooking(
            queryInterface,
            Sequelize,
            transaction,
            booking_id,
            box_id
          );
        })
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
      const venue = await queryInterface.sequelize.query(
        "SELECT id FROM venue WHERE code = :code",
        {
          replacements: { code: venueCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      const schedule = await queryInterface.sequelize.query(
        "SELECT id FROM schedule WHERE code = :code",
        {
          replacements: { code: scheduleCode },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      if (schedule.length) {
        await queryInterface.bulkDelete(
          "venue_schedule",
          {
            schedule_id: {
              [Sequelize.Op.eq]: schedule[0].id,
            },
          },
          { transaction }
        );

        const box_slot_ids = await queryInterface.sequelize.query(
          "SELECT id FROM box_slot WHERE schedule_id = :schedule_id",
          {
            replacements: {
              schedule_id: schedule[0].id,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        await queryInterface.bulkDelete(
          "box_slot",
          {
            id: {
              [Sequelize.Op.in]: box_slot_ids.map(({ id }) => id),
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.bulkDelete(
          "schedule",
          {
            id: {
              [Sequelize.Op.eq]: schedule[0].id,
            },
          },
          {
            transaction,
          }
        );
      }

      if (venue.length) {
        await deleteBookings(
          queryInterface,
          Sequelize,
          transaction,
          venue[0].id
        );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
