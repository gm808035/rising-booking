const {
  createRecurrenceHandler,
  updateRecurrence,
} = require("../services/recurrence");

const createHandler = async (event) => createRecurrenceHandler(event);
const updateHandler = async (event) => updateRecurrence(event);

module.exports = {
  createHandler,
  updateHandler,
};
