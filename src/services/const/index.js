const { startOfDay, add } = require("date-fns");
/* eslint-disable arrow-body-style */

const BookingSource = {
  ONLINE: "online",
  KIOSK: "walkin",
};

const Cleanup = 10;

const TimestampMatch =
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

/**
convert "start" time to date in format "YYYY-MM-DDTHH:mm:ss.sssZ"
to have ability work with date-fns library methods. 
@param {String} start start time of box slot "HH:mm:ss"
@returns {Date} start time in format"YYYY-MM-DDTHH:mm:ss.sssZ" 
*/
const countDateWithTime = (start) => {
  return add(startOfDay(new Date()), {
    hours: start.split(":")[0],
    minutes: start.split(":")[1],
    seconds: start.split(":")[2],
  });
};

const TimeFormat = "HH:mm:ss";

module.exports = {
  BookingSource,
  Cleanup,
  TimestampMatch,
  countDateWithTime,
  TimeFormat,
};
