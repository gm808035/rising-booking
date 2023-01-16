const { format, subMinutes } = require("date-fns");
const { countDateWithTime } = require("../services/const/index");

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const weekends = ["Friday", "Saturday"];
// start time for 18+ box_slots for weekdays
const weekdaysOver18Time = countDateWithTime("19:00:00");
// start time for 18+ box_slots for weekends
const weekendsOver18Time = countDateWithTime("16:00:00");

const isOver18Slot = (date, formattedTime, duration) => {
  const weekday = format(new Date(date), "EEEE");

  if (weekdays.includes(weekday)) {
    return (
      formattedTime > format(subMinutes(weekdaysOver18Time, duration), "HH:mm")
    );
  }

  if (weekends.includes(weekday)) {
    return (
      formattedTime > format(subMinutes(weekendsOver18Time, duration), "HH:mm")
    );
  }

  return false;
};

module.exports.isOver18Slot = isOver18Slot;
