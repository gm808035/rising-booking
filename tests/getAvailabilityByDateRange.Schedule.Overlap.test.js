const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");
const { generateDateRange } = require("../src/lib/date");

/* appied schedule for venueId 6 on 2022-07-07 - 2022-07-11
  * Box slots for box 35:
    09:00:00 | 90 
  *
 Should be 5 days available for 90m and 0 day for 60m for date range 2022-07-06 - 2022-07-12 
  *
  *
* Second schedule with from-to 2022-07-08 - 2022-07-10
  * Box slots for box 35:
    09:00:00 | 60 
  *
Should be 3 days available for 60m and 2 day for 90m for date range 2022-07-06 - 2022-07-12 after applied second schedule 
  *
*/

describe("/availability/{venue}/{from}/{to}/{duration}", () => {
  const server = request("http://localhost:3000");
  const token = jwt.sign({ sub: "any-token" }, "secret");

  const venueCode = "test-venue-template";
  const scheduleCode = "schedule-overlap-test";
  const secondScheduleCode = "second-schedule-overlap-test";

  const url = ({
    venue = venueCode,
    from = "2022-07-06",
    to = "2022-07-12",
    duration = 90,
  } = {}) => `/dev/availability/range/${venue}/${from}/${to}/${duration}`;

  it("should return 5 available days for 90m", () =>
    server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-07-06", "2022-07-12", [
          "2022-07-06",
          "2022-07-12",
        ]),
      }));
  it("should return 0 available days for 60m", () =>
    server
      .get(url({ duration: 60 }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: [],
      }));
  it("checking availability after applied second schedule, should return 2 available days for 90m", async () => {
    await server
      .post(`/dev/apply/schedule/${venueCode}/${secondScheduleCode}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204);

    await server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-07-06", "2022-07-12", [
          "2022-07-06",
          "2022-07-08",
          "2022-07-09",
          "2022-07-10",
          "2022-07-12",
        ]),
      });
  });
  it("checking availability after applied second schedule, should return 3 available days for 60m", async () => {
    await server
      .post(`/dev/apply/schedule/${venueCode}/${secondScheduleCode}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204);

    await server
      .get(url({ duration: 60 }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-07-06", "2022-07-12", [
          "2022-07-06",
          "2022-07-07",
          "2022-07-11",
          "2022-07-12",
        ]),
      });
  });

  it("should return 5 available days for 90m after first schedule apply", async () => {
    await server
      .post(`/dev/apply/schedule/${venueCode}/${scheduleCode}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204);

    await server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-07-06", "2022-07-12", [
          "2022-07-06",
          "2022-07-12",
        ]),
      });
  });
  it("should return 0 available days for 60m after first schedule apply", async () => {
    await server
      .post(`/dev/apply/schedule/${venueCode}/${scheduleCode}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204);

    await server
      .get(url({ duration: 60 }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: [],
      });
  });
});
