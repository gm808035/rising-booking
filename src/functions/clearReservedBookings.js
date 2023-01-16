const { clearReservedBookings } = require("../services/booking");

const handler = async (event) => clearReservedBookings(event);

module.exports = { handler };
