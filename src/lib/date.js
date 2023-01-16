const generateDateRange = (startDate, endDate, excludedDates = []) => {
  let dates = [];
  const date = new Date(startDate);
  while (date <= new Date(endDate)) {
    const possibleNewDate = new Date(date).toISOString().substring(0, 10);
    if (!excludedDates.includes(possibleNewDate)) {
      dates = [...dates, possibleNewDate];
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

module.exports = { generateDateRange };
