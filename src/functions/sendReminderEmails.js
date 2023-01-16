const { pushEmailReminders } = require("../services/booking");

const handler = async (event) => pushEmailReminders(event);

module.exports = { handler };
