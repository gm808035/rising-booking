const { zonedTimeToUtc } = require("date-fns-tz");

const convertLondonTimeToUTCString = (date) =>
  zonedTimeToUtc(date, "Europe/London").toISOString();

module.exports = {
  convertLondonTimeToUTCString,
};
