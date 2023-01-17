const request = require("supertest");
const { differenceInMinutes } = require("date-fns");
const { zonedTimeToUtc } = require("date-fns-tz");
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
 * Sunday   15:45 to 16:45
 *
 * Box sections:
 * - 1
 * - 2, 3, 4, 5
 *
 * Bookings for box 1:
 * Saturday 12:00 to 17:00 (2021-05-01)
 * Saturday 17:00 to 19:00 (2021-05-01) - Expired
 * Thursday 09:00 to 12:00 (2021-05-06)
 * Thursday 13:30 to 17:00 (2021-05-06)
 * Friday   12:00 to 19:00 (2021-05-07)
 * Saturday 00:00 to 23:59 (2021-05-08) - Closed venue
 * Monday   13:30 to 19:00 (2021-05-10)
 *
 * Bookings for box 2:
 * Saturday 13:15 to 18:00 (2021-05-01)
 * Thursday 09:00 to 12:00 (2021-05-06)
 * Thursday 13:30 to 16:00 (2021-05-06)
 * Friday   14:00 to 15:00 (2021-05-07)
 * Friday   17:00 to 17:45 (2021-05-07)
 * Saturday 00:00 to 23:59 (2021-05-08) - Closed venue
 * Monday   14:00 to 15:00 (2021-05-10)
 * Monday   14:15 to 15:15 (2021-05-10) - Maintenance booking
 *
 * Bookings for box 3:
 * Saturday 13:15 to 15:00 (2021-05-01)
 * Saturday 15:15 to 16:45 (2021-05-01)
 * Saturday 17:00 to 18:30 (2021-05-01)
 * Thursday 09:00 to 12:00 (2021-05-06)
 * Thursday 13:30 to 16:00 (2021-05-06)
 * Friday   13:45 to 15:15 (2021-05-07)
 * Friday   17:00 to 17:45 (2021-05-07)
 * Saturday 00:00 to 23:59 (2021-05-08) - Closed venue
 * Monday   14:00 to 15:00 (2021-05-10)
 *
 * Bookings for box 4:
 * Saturday 12:00 to 19:00 (2021-05-01)
 * Thursday 09:00 to 12:00 (2021-05-06)
 * Thursday 13:30 to 15:00 (2021-05-06)
 * Friday   12:00 to 15:00 (2021-05-07)
 * Friday   17:00 to 17:45 (2021-05-07)
 * Saturday 00:00 to 23:59 (2021-05-08) - Closed venue
 * Monday   14:00 to 15:00 (2021-05-10)
 *
 * Bookings for box 5:
 * Saturday 12:00 to 19:00 (2021-05-01)
 * Thursday 10:15 to 11:15 (2021-05-06)
 * Thursday 16:00 to 17:00 (2021-05-06)
 * Friday   12:00 to 16:00 (2021-05-07)
 * Saturday 00:00 to 23:59 (2021-05-08) - Closed venue
 */

const convertLondonTimeToUTCString = (date) =>
  zonedTimeToUtc(date, "Europe/London").toISOString();

// return difference in minutes between times plus 10 minutes for cleanup
const calculateWaitTime = (left, right, immediate) => {
  const leftDate = new Date(`01-01-1970 ${left}`);
  const rightDate = new Date(`01-01-1970 ${right}`);
  return differenceInMinutes(leftDate, rightDate) + (immediate ? 0 : 10);
};

describe("/kiosk/waitingtime/{venue}/{duration}/{date}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue";
  const url = ({
    venue = venueCode,
    date = "2021-05-01 12:00",
    duration = "60,90",
  } = {}) =>
    `/dev/kiosk/waitingtime/${venue}/${duration}/${convertLondonTimeToUTCString(
      date
    )}`;

  it("when requesting invalid venue then return 404", () =>
    server
      .get(url({ venue: "some-other-venue" }))
      .set(commonHeaders)
      .expect(404));

  it.each`
    day                                                      | date            | time       | expectedTime | waitTime60 | price60 | waitTime90 | price90 | immediate | message
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"11:00"} | ${"11:00"}   | ${"12:00"} | ${1001} | ${"17:00"} | ${3001} | ${false}  | ${"before open time of venue"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"12:00"} | ${"12:00"}   | ${"12:00"} | ${1001} | ${"17:00"} | ${3001} | ${false}  | ${"immediate for 60m only and 5th after for 90m"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"15:00"} | ${"15:00"}   | ${"17:00"} | ${2001} | ${"17:00"} | ${3001} | ${false}  | ${"2h wait"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"17:15"} | ${"17:15"}   | ${"17:15"} | ${2001} | ${"17:15"} | ${3001} | ${false}  | ${"both available"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"17:30"} | ${"17:30"}   | ${"17:30"} | ${2001} | ${null}    | ${null} | ${false}  | ${"only 60m available"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"17:45"} | ${"17:45"}   | ${"17:45"} | ${2001} | ${null}    | ${null} | ${false}  | ${"only 60m available"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"18:00"} | ${"18:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"1h before close no availability"}
    ${"Saturday (2021-05-01 - open times [12:00 to 19:00])"} | ${"2021-05-01"} | ${"19:00"} | ${"19:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"closed venue"}
    ${"Sunday (2021-05-02 - open times [15:45 to 16:45])"}   | ${"2021-05-02"} | ${"12:00"} | ${"12:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"before open time of venue and no availability"}
    ${"Sunday (2021-05-02 - open times [15:45 to 16:45])"}   | ${"2021-05-02"} | ${"15:45"} | ${"15:45"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"no time for cleanup"}
    ${"Sunday (2021-05-02 - open times [15:45 to 16:45])"}   | ${"2021-05-02"} | ${"17:00"} | ${"17:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"closed venue"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"12:00"} | ${"12:00"}   | ${"13:30"} | ${1001} | ${"13:30"} | ${1501} | ${false}  | ${"before open time of venue"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"13:30"} | ${"13:30"}   | ${"13:30"} | ${1001} | ${"13:30"} | ${1501} | ${false}  | ${"venue open"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"15:30"} | ${"15:30"}   | ${"15:30"} | ${1001} | ${"15:30"} | ${1501} | ${false}  | ${"venue open 30m before peak"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"16:00"} | ${"16:00"}   | ${"16:00"} | ${2001} | ${"16:00"} | ${3001} | ${false}  | ${"venue open 30m before peak"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"17:45"} | ${"17:45"}   | ${"17:45"} | ${2001} | ${null}    | ${null} | ${false}  | ${"only 60m booking available"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"18:00"} | ${"18:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"not enough time before closing"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"19:00"} | ${"19:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"closed venue"}
    ${"Monday (2021-05-03 - open times [13:30 to 19:00])"}   | ${"2021-05-03"} | ${"19:00"} | ${"19:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"closed venue"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"09:00"} | ${"09:00"}   | ${"11:15"} | ${1001} | ${"11:15"} | ${1501} | ${false}  | ${"available only after 11:15 (3 bookings on same section so box5 doesn't have enough time for booking)"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"13:35"} | ${"13:35"}   | ${"13:45"} | ${1001} | ${"13:45"} | ${1501} | ${true}   | ${"available immediately at 13:45 - cleanup for playmaker"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"14:55"} | ${"15:00"}   | ${"15:00"} | ${1001} | ${"15:00"} | ${1501} | ${false}  | ${"both available"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"16:01"} | ${"16:00"}   | ${"16:10"} | ${2001} | ${"16:10"} | ${3001} | ${true}   | ${"immediately in 15m because of playmaker 5m finish time"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"16:10"} | ${"16:15"}   | ${"16:15"} | ${2001} | ${"16:15"} | ${3001} | ${false}  | ${"both available"}
    ${"Thursday (2021-05-06 - open times [09:00 to 19:00])"} | ${"2021-05-06"} | ${"19:00"} | ${"19:00"}   | ${null}    | ${null} | ${null}    | ${null} | ${false}  | ${"closed venue"}
  `(
    "$day - $time - $message",
    ({
      date,
      time,
      expectedTime,
      waitTime60,
      price60,
      waitTime90,
      price90,
      immediate,
    }) =>
      server
        .get(url({ date: `${date} ${time}` }))
        .set(commonHeaders)
        .expect(200, {
          venue_id: 1,
          venue_code: venueCode,
          wait_times: [
            {
              wait_time: calculateWaitTime(waitTime60, expectedTime, immediate),
              slot_duration: 60,
              price: price60,
            },
            {
              wait_time: calculateWaitTime(waitTime90, expectedTime, immediate),
              slot_duration: 90,
              price: price90,
            },
          ].filter((el) => el.price),
        })
  );
});
