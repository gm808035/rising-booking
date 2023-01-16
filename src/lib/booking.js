const createBookingRef = () =>
  (
    Date.now().toString(36).substr(1, 7) +
    Math.random().toString(36).substr(2, 1)
  ).toUpperCase();

// convert from js.getDay() to mysql.WEEKDAY()
const convertJsDayToSqlDay = (timestamp) =>
  timestamp.getDay() === 0 ? 7 : timestamp.getDay();

module.exports = {
  createBookingRef,
  convertJsDayToSqlDay,
};
