const { createKioskBooking, sendQrCode } = require("../services/kiosk");
const { getWaitingTime } = require("../services/availability");
const { checkin, checkinByReference } = require("../services/checkin");

const createHandler = async (event) => createKioskBooking(event);
const waitingTimeHandler = async (event) => getWaitingTime(event);
const checkinHandler = async (event) => checkin(event);
const checkinByReferenceHandler = async (event) => checkinByReference(event);
const sendQrCodeHandler = async (event) => sendQrCode(event);

module.exports = {
  createHandler,
  waitingTimeHandler,
  checkinByReferenceHandler,
  checkinHandler,
  sendQrCodeHandler,
};
