const getNumberOfWeekday = (day) => {
  let weekdayNumber;
  switch (day) {
    case "Monday":
      weekdayNumber = 1;
      break;
    case "Tuesday":
      weekdayNumber = 2;
      break;
    case "Wednesday":
      weekdayNumber = 3;
      break;
    case "Thursday":
      weekdayNumber = 4;
      break;
    case "Friday":
      weekdayNumber = 5;
      break;
    case "Saturday":
      weekdayNumber = 6;
      break;
    case "Sunday":
      weekdayNumber = 0;
      break;
    default:
      break;
  }
  return weekdayNumber;
};

module.exports = { getNumberOfWeekday };
