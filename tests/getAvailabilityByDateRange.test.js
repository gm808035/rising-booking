const request = require("supertest");
const { generateDateRange } = require("../src/lib/date");
const { commonHeaders } = require("./config");

/**
 * Test data
 * Price:
 * Off peak: 1001
 * Peak: 2001
 * Super peak: 3001
 *
 * Open times:
 * Monday   13:30 to 19:00
 * Thursday 09:00 to 19:00
 * Friday   12:00 to 19:00
 * Saturday 12:00 to 19:00
 * Sunday   16:00 to 17:00
 *
 * Box slots for box 1:
 * 09:00    90m
 * 13:00    60m
 * 14:00    90m
 * 16:00    60m
 * 18:00    60m
 * Box slots for box 2:
 * 09:05    60m
 * 11:05    90m
 * Box slots for box 3:
 * 16:15    90m
 *
 * Bookings for box 1:
 * Monday   14:00 to 15:00 (2021-01-04)
 * Friday   12:00 to 14:00 (2021-01-01)
 * Friday   19:00 to 20:00 (2021-01-01)
 * Saturday 12:00 to 18:00 (2021-01-02)
 * Monday   13:30 to 18:00 (2021-01-11)
 * Monday   18:00 to 19:00 (2021-01-11)
 * Monday   18:00 to 19:00 (2021-01-18)
 * Bookings for box 3:
 * Saturday 09:00 to 19:00 (2021-01-02)
 * Monday   09:00 to 19:00 (2021-01-04)
 * Monday   09:00 to 19:00 (2021-01-11)
 */

describe("/availability/range/{venue}/{from}/{to}/{duration}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue";
  const url = ({
    venue = venueCode,
    from = "2021-01-01",
    to = "2021-01-31",
    duration = 60,
  } = {}) => `/dev/availability/range/${venue}/${from}/${to}/${duration}`;

  it("when requesting invalid venue then return 404", () =>
    server
      .get(url({ venue: "some-other-venue" }))
      .set(commonHeaders)
      .expect(404));

  it("when requesting date range with no bookings and no applied schedules for wednesday return 200", () =>
    server
      .get(url({ from: "2021-02-01", to: "2021-02-28" }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 1,
        venue_code: venueCode,
        dates: generateDateRange("2021-02-01", "2021-02-28", [
          "2021-02-03",
          "2021-02-10",
          "2021-02-17",
          "2021-02-24",
          // 2021-02 03, 10, 17, 24 not applied schedule for Wednesday
        ]),
      }));

  it("when requesting date range for 60m duration with 2 fully booked days on 2021-01-11, 2021-01-05 and no applied schedules for wednesday return 200", () =>
    server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 1,
        venue_code: venueCode,
        dates: generateDateRange("2021-01-01", "2021-01-31", [
          "2021-01-05",
          "2021-01-11",
          "2021-01-06",
          "2021-01-13",
          "2021-01-20",
          "2021-01-27",
          // 2021-01 06, 13, 20, 27 not applied schedule for Wednesday
        ]),
      }));

  it("when requesting date range for 90m duration with 3 fully booked days 2021-01-02, 2021-01-04, 2021-01-11 and no applied schedules for wednesday return 200", () =>
    server
      .get(url({ duration: 90 }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 1,
        venue_code: venueCode,
        dates: generateDateRange("2021-01-01", "2021-01-31", [
          "2021-01-02",
          "2021-01-04",
          "2021-01-11",
          // fully booked date on 2021-01-02, 2021-01-04, 2021-01-11
          "2021-01-03",
          "2021-01-10",
          "2021-01-17",
          "2021-01-24",
          "2021-01-31",
          // 2021-01 03, 10, 17, 24, 31 not exist box slots for 90 min on such date
          "2021-01-05",
          "2021-01-12",
          "2021-01-19",
          "2021-01-26",
          // 2021-01 05, 12, 19, 26 not exist box slots for 90 min on such date
          "2021-01-06",
          "2021-01-13",
          "2021-01-20",
          "2021-01-27",
          // 2021-01 06, 13, 20, 27 not applied schedule for Wednesday
        ]),
      }));

  describe("lon-o2 venue", () => {
    const venue = "lon-o2";

    it("when requesting date range for 60m duration for o2 then return 200", () =>
      server
        .get(
          url({
            venue,
            from: "2021-07-25",
            to: "2021-08-10",
          })
        )
        .set(commonHeaders)
        .expect(200, {
          venue_id: 2,
          venue_code: venue,
          dates: generateDateRange("2021-07-25", "2021-08-10", [
            "2021-07-25",
            "2021-07-26",
            "2021-07-27",
            "2021-07-28",
            "2021-07-29",
            "2021-07-30",
          ]),
        }));

    it("when requesting date range for 90m duration for o2 then return 200", () =>
      server
        .get(
          url({
            venue,
            duration: 90,
            from: "2021-07-25",
            to: "2021-08-10",
          })
        )
        .set(commonHeaders)
        .expect(200, {
          venue_id: 2,
          venue_code: venue,
          dates: generateDateRange("2021-07-25", "2021-08-10", [
            "2021-07-25",
            "2021-07-26",
            "2021-07-27",
            "2021-07-28",
            "2021-07-29",
            "2021-07-30",
          ]),
        }));
  });
});
