const {
  confirmBooking,
  createBooking,
  getBooking,
  getBookingPrice,
  updateBooking,
  cancelBooking,
} = require("../services/booking");

const confirmHandler = async (event) => confirmBooking(event);
const createHandler = async (event) => createBooking(event);
const getHandler = async (event) => getBooking(event);
const getPriceHandler = async (event) => getBookingPrice(event);
const updateHandler = async (event) => updateBooking(event);
const cancelHandler = async (event) => cancelBooking(event);

module.exports = {
  confirmHandler,
  createHandler,
  getHandler,
  getPriceHandler,
  updateHandler,
  cancelHandler,
};
