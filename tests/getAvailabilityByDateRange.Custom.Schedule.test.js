const request = require("supertest");
const { commonHeaders } = require("./config");
const { generateDateRange } = require("../src/lib/date");

/**
 * Test data
 * Price:
 * Off peak: 1001
 * Peak: 2001
 * Super peak: 3001
 *
 * Open times:
 * Monday   09:00 to 20:00 - off peak all day
 * Tuesday  11:00 to 24:30 - start peak 16:00
 * Thursday 09:00 to 19:00 - start peak 16:00
 * Friday   12:00 to 19:00 - start super peak 16:00
 * Saturday 12:00 to 19:00 - super peak all day
 * Sunday   16:00 to 17:00 - super peak until 16:00 and peak there after
 *
 *
 * Bookings for box 1:
 * no bookings
 * Monday   (2021-01-04)
 */

/* set custom schedule
   * Box slots for box 1:
    11:00:00 | 90 
    12:40:00 | 60 
    13:50:00 | 90 
    16:40:00 | 60 
   */

describe("/availability/{venue}/{from}/{to}/{duration}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue-schedule";
  const url = ({
    venue = venueCode,
    from = "2021-01-04",
    to = "2021-01-05",
    duration = 60,
  } = {}) => `/dev/availability/range/${venue}/${from}/${to}/${duration}`;

  it("when requesting date range for 60m duration with 1 fully booked days return 200", () =>
    server
      .get(url())
      .set(commonHeaders)
      .expect(200, {
        venue_id: 4,
        venue_code: venueCode,
        dates: generateDateRange("2021-01-04", "2021-01-05"),
      }));
});
