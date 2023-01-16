module.exports = {
  prices: [
    {
      start: "09:00:00",
      type: "off-peak",
      end: "15:59:00",
      price: 1001,
    },
    {
      start: "16:00:00",
      type: "peak",
      end: "23:59:00",
      price: 2001,
    },
  ],
  openTime: {
    start: "09:00:00",
    end: "23:59:00",
  },
};
