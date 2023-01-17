const request = require("supertest");
const { commonHeaders } = require("./config");

/**
 * Test data
 * Price:
 * Off peak: 1001
 * Peak: 2001
 * Super peak: 3001
 *
 * Open times:
 * Monday   09:00 to 20:00
 * Tuesday  11:00 to 24:30 - start peak 24:30
 * Thursday 09:00 to 19:00 - start peak 16:00
 * Friday   12:00 to 19:00
 * Saturday 12:00 to 19:00
 * Sunday   16:00 to 17:00
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

describe("/availability/{venue}/{day}/{duration}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue-schedule";
  const url = ({ venue = venueCode, day = "2021-01-04", duration = 60 }) =>
    `/dev/availability/${venue}/${day}/${duration}`;

  const payload = (times = []) => ({
    venue_id: 4,
    venue_code: venueCode,
    times,
  });

  describe("Valid test venue - box slots for box 1 [11:00 90m] [12:40 60m] [13:50 90m] [16:40 60m]", () => {
    describe("Monday (2021-01-04)", () => {
      it("2 off peak 90m slots", () =>
        server
          .get(url({ day: "2021-01-04", duration: 90 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "11:00",
                duration: 90,
                box_id: 25,
                box_slot_id: 1467,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "13:50",
                duration: 90,
                box_id: 25,
                box_slot_id: 1469,
                type: "off-peak",
                price: 1501,
              },
            ])
          ));

      it("1 off peak, 1 peak - 60m slots", () =>
        server
          .get(url({ day: "2021-01-04", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "12:40", // 12:40 - round down by 15 min
                duration: 60,
                box_id: 25,
                box_slot_id: 1468,
                type: "off-peak",
                price: 1001,
              },
              {
                start: "16:40",
                duration: 60,
                box_id: 25,
                box_slot_id: 1470,
                type: "peak",
                price: 2001,
              },
            ])
          ));
    });
  });
});
