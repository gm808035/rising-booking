const { getAvailabilityByDay } = require("../services/availability");

const handler = async (event) => getAvailabilityByDay(event);

module.exports = { handler };
