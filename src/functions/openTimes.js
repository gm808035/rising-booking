const { updateOpenTimes } = require("../services/openTime");

const updateHandler = async (event) => updateOpenTimes(event);

module.exports = {
  updateHandler,
};
