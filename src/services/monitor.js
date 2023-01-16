const { Op } = require("sequelize");
const { sub } = require("date-fns");
const baseService = require("./baseService");
const { db } = require("../lib/db");
const eventBridge = require("../lib/eventbridge");

const { EVENT_BUS_BOOKING } = process.env;

const getUpdateType = (booking, from) => {
  if (booking.createdAt && new Date(booking.createdAt) > from) {
    return "create";
  }

  if (booking.updatedAt && new Date(booking.updatedAt) > from) {
    return "update";
  }

  if (booking.deletedAt && new Date(booking.deletedAt) > from) {
    return "delete";
  }

  return "unknown";
};

const publishBookingChanges = () =>
  baseService(async (sequelize) => {
    const from = sub(new Date(), { minutes: 1 });
    const { Booking, BoxBooking } = await db(sequelize);
    const changedBookings = await Booking.findAll({
      where: {
        status: { [Op.in]: ["Paid", "Cancelled"] },
        [Op.or]: [
          {
            updatedAt: {
              [Op.gte]: from,
            },
          },
          {
            createdAt: {
              [Op.gte]: from,
            },
          },
          {
            deletedAt: {
              [Op.gte]: from,
            },
          },
        ],
      },
      include: BoxBooking,
      paranoid: false,
    });
    console.info({ changedBookings });
    const promises = changedBookings.map((booking) =>
      eventBridge.publish(
        { booking },
        getUpdateType(booking, from),
        "booking",
        EVENT_BUS_BOOKING
      )
    );
    await Promise.all(promises);

    return { body: changedBookings };
  });

module.exports = {
  publishBookingChanges,
};
