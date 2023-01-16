const { publishBookingChanges } = require("../services/monitor");

const handler = async (event) => publishBookingChanges(event);

module.exports = { handler };
