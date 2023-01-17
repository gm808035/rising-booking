const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");
const { generateDateRange } = require("../src/lib/date");

/**
 *
 * Bookings for box 35:
 * no bookings                          (2022-06-15)
 * 15:00:00-16:00:00, 17:00:00-18:30:00 (2022-06-16)
 * 15:00:00-16:00:00                    (2022-06-17)
 */

/* appied schedule
   * Box slots for box 35:
    15:00:00 | 60 
    17:00:00 | 90 
  *
  * Open times:
    * 09:00 to 20:00 - off peak all day
   */

describe("/availability/{venue}/{from}/{to}/{duration}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue-template";
  const scheduleCode = "test-venue-schedule-addition-test";
  const token = jwt.sign({ sub: "any-token" }, "secret");

  const url = ({
    venue = venueCode,
    from = "2022-06-14",
    to = "2022-06-18",
    duration = 60,
  } = {}) => `/dev/availability/range/${venue}/${from}/${to}/${duration}`;

  beforeAll(async () => {
    await server
      .post(`/dev/apply/schedule/${venueCode}/${scheduleCode}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204);
  });

  it("when requesting date range for 60m duration with 2 fully booked days and 2 days without applied schedule return 200", () =>
    server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-06-14", "2022-06-18", [
          "2022-06-14",
          "2022-06-16",
          "2022-06-17",
          "2022-06-18",
        ]),
      }));
  it("when requesting date range for 90m duration with 1 fully booked days and 2 days without applied schedule return 200", () =>
    server
      .get(url({ duration: 90 }))
      .set(commonHeaders)
      .expect(200, {
        venue_id: 6,
        venue_code: venueCode,
        dates: generateDateRange("2022-06-14", "2022-06-18", [
          "2022-06-14",
          "2022-06-16",
          "2022-06-18",
        ]),
      }));
});
