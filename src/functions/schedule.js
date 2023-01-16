const {
  fetchScheduleById,
  fetchScheduleData,
  createSchedule,
  filter,
  deleteSchedule,
  applySchedule,
  updateSchedule,
  checkScheduleApplyAvailability,
  changeSchedulesOrder,
  copyScheduleById,
} = require("../services/schedule");

const getScheduleByDateHandler = async (event) => fetchScheduleData(event);
const getScheduleByIdHandler = async (event) => fetchScheduleById(event);
const createScheduleHandler = async (event) => createSchedule(event);
const filterScheduleHandler = async (event) => filter(event);
const deleteScheduleHandler = async (event) => deleteSchedule(event);
const applyScheduleHandler = async (event) => applySchedule(event);
const updateScheduleHandler = async (event) => updateSchedule(event);
const availabilityScheduleHandler = async (event) =>
  checkScheduleApplyAvailability(event);
const changeSchedulesOrderHandler = async (event) =>
  changeSchedulesOrder(event);
const copyScheduleByIdHandler = async (event) => copyScheduleById(event);

module.exports = {
  getScheduleByDateHandler,
  createScheduleHandler,
  filterScheduleHandler,
  deleteScheduleHandler,
  applyScheduleHandler,
  updateScheduleHandler,
  availabilityScheduleHandler,
  getScheduleByIdHandler,
  changeSchedulesOrderHandler,
  copyScheduleByIdHandler,
};
