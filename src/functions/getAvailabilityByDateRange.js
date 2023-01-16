const { getAvailabilityByDateRange } = require("../services/availability");

const handler = async (event) => getAvailabilityByDateRange(event);

module.exports = { handler };
