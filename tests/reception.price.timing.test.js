const request = require("supertest");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const url = ({ venue = "test-venue", day = "2020-01-01" }) =>
  `/dev/reception/timings/${venue}/${day}`;
const payload = (prices = [], openTime = {}) => ({
  prices,
  openTime,
});

describe("Get open times by day should return correct price point", () => {
  it("should return default off peak and peak and opening hours", () =>
    server
      .get(url({ day: "2020-01-01" }))
      .set(commonHeaders)
      .expect(
        200,
        payload(
          [
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
          { start: "09:00:00", end: "23:59:00" }
        )
      ));
  it("Friday should return off peak and super peak and opening hours", () =>
    server
      .get(url({ day: "2021-10-22" }))
      .set(commonHeaders)
      .expect(
        200,
        payload(
          [
            {
              start: "12:00:00",
              type: "off-peak",
              end: "15:59:00",
              price: 1001,
            },
            {
              start: "16:00:00",
              type: "super-peak",
              end: "19:00:00",
              price: 3001,
            },
          ],
          { start: "12:00:00", end: "19:00:00" }
        )
      ));

  it("Thursday should return off peak and peak and opening hours", () =>
    server
      .get(url({ day: "2021-10-21" }))
      .set(commonHeaders)
      .expect(
        200,
        payload(
          [
            {
              start: "09:00:00",
              type: "off-peak",
              end: "15:59:00",
              price: 1001,
            },
            {
              start: "16:00:00",
              type: "peak",
              end: "19:00:00",
              price: 2001,
            },
          ],
          { start: "09:00:00", end: "19:00:00" }
        )
      ));

  it("Should validate date", () =>
    server
      .get(url({ day: "2021-10-50" }))
      .set(commonHeaders)
      .expect(400, {
        code: "007",
        message: "Invalid Date",
      }));
  it("Should validate venue", () =>
    server
      .get(url({ venue: "no-venue" }))
      .set(commonHeaders)
      .expect(404, {
        code: "001",
        message: "unknown venue",
      }));
});
