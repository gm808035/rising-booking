const { Op } = require("sequelize");
const { startOfTomorrow } = require("date-fns");
const baseService = require("./baseService");
const { NotFoundError } = require("../lib/errors");
const { db } = require("../lib/db");
const { getSessionId } = require("../lib/auth");

const checkin = async (event) =>
  baseService(async (sequelize) => {
    const sessionId = getSessionId(event);

    const { Booking } = await db(sequelize);
    const booking = await Booking.findOne({
      where: {
        sessionId,
      },
    });

    if (!booking) {
      console.warn(`[checkInBooking] no booking found for ${sessionId}`);
      throw new NotFoundError("006");
    }

    booking.set("checkinAt", new Date());
    await booking.save();
    return {
      body: {},
    };
  });

const checkinByReference = async (event) =>
  baseService(async (sequelize) => {
    const { reference } = event.pathParameters;

    const { Booking } = await db(sequelize);
    const booking = await Booking.findOne({
      where: {
        reference,
        start: { [Op.lte]: startOfTomorrow() },
      },
    });

    if (!booking) {
      console.warn(`[checkInBooking] no booking found: reference ${reference}`);
      throw new NotFoundError("006");
    }

    booking.set("checkinAt", new Date());
    await booking.save();
    return {
      body: {},
    };
  });

module.exports = {
  checkin,
  checkinByReference,
};
