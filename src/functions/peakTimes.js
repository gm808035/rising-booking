const {
  updatePeakTimes,
  createPeakTimes,
  deletePeakTimes,
} = require("../services/peak");

const createHandler = async (event) => createPeakTimes(event);
const updatePeakHandler = async (event) => updatePeakTimes(event);
const deleteHandler = async (event) => deletePeakTimes(event);
module.exports = {
  createHandler,
  updatePeakHandler,
  deleteHandler,
};
