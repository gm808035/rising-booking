const {
  create,
  deleteBooking,
  filter,
  update,
  getTimings,
} = require("../services/reception");

const createHandler = async (event) => create(event);
const deleteHandler = async (event) => deleteBooking(event);
const filterHandler = async (event) => filter(event);
const updateHandler = async (event) => update(event);
const timingHandler = async (event) => getTimings(event);

module.exports = {
  createHandler,
  deleteHandler,
  filterHandler,
  updateHandler,
  timingHandler,
};
