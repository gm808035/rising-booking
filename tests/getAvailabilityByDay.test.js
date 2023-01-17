const { eachDayOfInterval, format } = require("date-fns");
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
 * Tuesday  23:05 to 24:05 (2021-01-05)
 * Monday   13:30 to 18:00 (2021-01-11)
 * Monday   18:00 to 19:00 (2021-01-11)
 * Thursday 13:30 to 14:30 (2021-01-14)
 * Monday   18:00 to 19:00 (2021-01-18)
 */

describe("/availability/{venue}/{day}/{duration}", () => {
  const server = request("http://localhost:3000");
  const venueCode = "test-venue";
  const url = ({ venue = venueCode, day = "2020-01-01", duration = 60 }) =>
    `/dev/availability/${venue}/${day}/${duration}`;

  const payload = (times = []) => ({
    venue_id: 1,
    venue_code: venueCode,
    times,
  });

  it("when requesting invalid venue then return 404", () =>
    server
      .get(url({ venue: "some-other-venue" }))
      .set(commonHeaders)
      .expect(404));

  describe("Valid test venue - box slots for box 1 [09:00 90m] [13:00 60m] [14:00 60m] [16:00 60m] [18:00 60m]", () => {
    describe("Tuesday (2021-01-05) - closed day", () => {
      it("no 60m slots", () =>
        server
          .get(url({ day: "2021-01-05" }))
          .set(commonHeaders)
          .expect(200, payload()));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-05", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Friday (2021-01-01 - open times [12:00 to 19:00]) - Bookings for box 1 [12:00 to 14:00] and [19:00 to 20:00]", () => {
      it("2 peak 60m slots", () =>
        server
          .get(url({ day: "2021-01-01" }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 514,
                type: "super-peak",
                price: 3001,
                over_18: true,
              },
              {
                start: "18:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 515,
                type: "super-peak",
                price: 3001,
                over_18: true,
              },
            ])
          ));

      it("1 off peak 90m slot and 1 peak 90m slot", () =>
        server
          .get(url({ day: "2021-01-01", duration: 90 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "14:00",
                duration: 90,
                box_id: 1,
                box_slot_id: 513,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "16:15",
                duration: 90,
                box_id: 3,
                box_slot_id: 516,
                type: "super-peak",
                price: 4501,
                over_18: true,
              },
            ])
          ));
    });

    describe("Saturday (2021-01-02 - open times [12:00 to 19:00]) - Bookings for box 1 [12:00 to 18:00]", () => {
      it("1 peak 60m slot", () =>
        server
          .get(url({ day: "2021-01-02", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "18:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 520,
                type: "peak",
                price: 2001,
                over_18: true,
              },
            ])
          ));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-02", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Sunday (2021-01-03 - open times [16:00 to 16:45]) - Reduced open times", () => {
      it("1 peak 60m slot", () =>
        server
          .get(url({ day: "2021-01-03", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 522,
                type: "peak",
                price: 2001,
              },
            ])
          ));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-03", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Monday (2021-01-04 - open times [13:30 to 19:00]) - Bookings for box 1 [14:00 to 15:00]", () => {
      it("2 peak 60m slots", () =>
        server
          .get(url({ day: "2021-01-04", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 501,
                type: "peak",
                price: 2001,
              },
              {
                start: "18:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 502,
                type: "peak",
                price: 2001,
              },
            ])
          ));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-04", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Tuesday (2021-01-05 - open times [22:30 to 24:30]) - Bookings for box 1 [23:05 to 24:05]", () => {
      it("no 60m slots", () =>
        server
          .get(url({ day: "2021-01-05", duration: 60 }))
          .set(commonHeaders)
          .expect(200, payload()));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-05", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Thursday (2021-01-07 - open times [09:00 to 19:00]) - Extended open times which include box 2 slots [09:05 60m] [11:05 90m]", () => {
      it("2 peak and 2 off peak 60m slots", () =>
        server
          .get(url({ day: "2021-01-07", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "09:05",
                duration: 60,
                box_id: 2,
                box_slot_id: 509,
                type: "off-peak",
                price: 1001,
              },
              {
                start: "13:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 505,
                type: "off-peak",
                price: 1001,
              },
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 507,
                type: "peak",
                price: 2001,
              },
              {
                start: "18:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 508,
                type: "peak",
                price: 2001,
              },
            ])
          ));

      it("1 peak and 3 off peak 90m slots", () =>
        server
          .get(url({ day: "2021-01-07", duration: 90 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "09:00",
                duration: 90,
                box_id: 1,
                box_slot_id: 504,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "11:14",
                duration: 90,
                box_id: 2,
                box_slot_id: 510,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "14:00",
                duration: 90,
                box_id: 1,
                box_slot_id: 506,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "16:15",
                duration: 90,
                box_id: 3,
                box_slot_id: 511,
                type: "peak",
                price: 3001,
              },
            ])
          ));
    });

    describe("Monday (2021-01-11 - open times [13:30 to 19:00]) - Bookings for box 1 [13:30 to 18:00] [18:00 to 19:00]", () => {
      it("no 60m slots", () =>
        server
          .get(url({ day: "2021-01-11", duration: 60 }))
          .set(commonHeaders)
          .expect(200, payload()));

      it("no 90m slots", () =>
        server
          .get(url({ day: "2021-01-11", duration: 90 }))
          .set(commonHeaders)
          .expect(200, payload()));
    });

    describe("Thursday (2021-01-14 - open times [09:00 to 19:00]) - Booking for box 1 [13:30 to 14:30] and extended open times which include box 2 slots [09:05 60m] [11:05 90m]", () => {
      it("2 peak and 1 off peak 60m slots", () =>
        server
          .get(url({ day: "2021-01-14", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "09:05",
                duration: 60,
                box_id: 2,
                box_slot_id: 509,
                type: "off-peak",
                price: 1001,
              },
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 507,
                type: "peak",
                price: 2001,
              },
              {
                start: "18:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 508,
                type: "peak",
                price: 2001,
              },
            ])
          ));

      it("1 peak and 2 off peak 90m slots", () =>
        server
          .get(url({ day: "2021-01-14:", duration: 90 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "09:00",
                duration: 90,
                box_id: 1,
                box_slot_id: 504,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "11:14",
                duration: 90,
                box_id: 2,
                box_slot_id: 510,
                type: "off-peak",
                price: 1501,
              },
              {
                start: "16:15",
                duration: 90,
                box_id: 3,
                box_slot_id: 511,
                type: "peak",
                price: 3001,
              },
            ])
          ));
    });

    describe("Monday (2021-01-18 - open times [13:30 to 19:00]) - Bookings for box 1 [18:00 to 19:00]", () => {
      it("1 peak 60m slot", () =>
        server
          .get(url({ day: "2021-01-18", duration: 60 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "16:00",
                duration: 60,
                box_id: 1,
                box_slot_id: 501,
                type: "peak",
                price: 2001,
              },
            ])
          ));

      it("1 peak and 1 off peak 90m slot", () =>
        server
          .get(url({ day: "2021-01-18", duration: 90 }))
          .set(commonHeaders)
          .expect(
            200,
            payload([
              {
                start: "16:15",
                duration: 90,
                box_id: 3,
                box_slot_id: 503,
                type: "peak",
                price: 3001,
              },
            ])
          ));
    });
  });

  describe("double box bookings: Test Venue - DBB", () => {
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
     * Double Box Bookings for box 1 and 2:
     * Sunday 14:15 to 15:45 (2021-12-06)
     */

    const venue = "test-venue-dbb";
    const date = "2021-12-06";

    it("should have 2 double box booking 90m slots available", async () => {
      const response = await server
        .get(url({ venue, day: date, duration: 90 }))
        .set(commonHeaders)
        .expect(200);

      expect(response.body.times).toEqual(
        expect.arrayContaining([
          {
            start: "16:00",
            duration: 90,
            box_id: 30,
            box_slot_id: 1489,
            type: "peak",
            linked_box_slot_id: 71,
            price: 3001,
          },
          {
            start: "16:05",
            duration: 90,
            box_id: 31,
            box_slot_id: 1495,
            type: "peak",
            linked_box_slot_id: 71,
            price: 3001,
          },
          {
            start: "17:40",
            duration: 90,
            box_id: 30,
            box_slot_id: 1490,
            type: "peak",
            linked_box_slot_id: 72,
            price: 3001,
            over_18: true,
          },
          {
            start: "17:45",
            duration: 90,
            box_id: 31,
            box_slot_id: 1496,
            type: "peak",
            linked_box_slot_id: 72,
            price: 3001,
            over_18: true,
          },
        ])
      );
    });
  });

  describe("lon-o2 venue", () => {
    const venue = "lon-o2";

    const lonO2Offset = 5; // boxes created in test data

    const offsetIds = (ids, offset = lonO2Offset) =>
      ids.map((id) => id + offset);

    expect.extend({
      toIncludeOnlyBoxIds(times, boxIds) {
        let failedId;
        const pass = times.every((time) => {
          const result = boxIds.includes(time.box_id);
          if (!result) {
            failedId = time.box_id;
          }
          return result;
        });

        return {
          pass,
          message: () =>
            pass
              ? `expected times not to include all boxIds [${offsetIds(
                  boxIds,
                  -lonO2Offset
                )}]`
              : `expected times to include only boxIds [${offsetIds(
                  boxIds,
                  -lonO2Offset
                )}], ${failedId - lonO2Offset} was found`,
        };
      },
    });

    expect.extend({
      toUseAllBoxIds(times, boxIds) {
        let failedId;

        const pass = boxIds.every((boxId) => {
          const result = times.some((time) => time.box_id === boxId);
          if (!result) {
            failedId = boxId;
          }
          return result;
        });

        return {
          pass,
          message: () =>
            pass
              ? `expected times not to use all boxIds [${offsetIds(
                  boxIds,
                  -lonO2Offset
                )}]`
              : `expected times to use all boxIds [${offsetIds(
                  boxIds,
                  -lonO2Offset
                )}], ${failedId - lonO2Offset} was not found`,
        };
      },
    });

    const checkBoxes = ({ from, to, boxIds, duration = 60 }) =>
      Promise.all(
        eachDayOfInterval({
          start: new Date(from),
          end: new Date(to),
        }).map(async (date) => {
          const response = await server
            .get(
              url({
                day: format(date, "yyyy-MM-dd"),
                venue,
                duration,
              })
            )
            .set(commonHeaders)
            .expect(200);

          expect(response.body.times).toUseAllBoxIds(boxIds);
          expect(response.body.times).toIncludeOnlyBoxIds(boxIds);
        })
      );

    it.each`
      day
      ${"2021-07-28"}
      ${"2021-07-29"}
      ${"2021-07-30"}
    `("closed on $day", ({ day }) =>
      server
        .get(
          url({
            day,
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200, {
          venue_id: 2,
          venue_code: venue,
          times: [],
        })
    );

    /*
     * There is extra availability of 60m for box 11, 12, 13 on Fridays and Saturdays (last slot of the night)
     * 2021-07-30 - Friday
     * 2021-07-31 - Saturday
     * 2021-08-06 - Friday
     * 2021-08-07 - Saturday
     */
    it("only boxes 1-4 and 10-13 from 2021-07-31 to 2021-08-04", () =>
      Promise.all([
        checkBoxes({
          from: "2021-07-31",
          to: "2021-07-31",
          boxIds: offsetIds([1, 2, 3, 4, 10, 11, 12, 13]),
        }),
        checkBoxes({
          from: "2021-08-01",
          to: "2021-08-04",
          boxIds: offsetIds([1, 2, 3, 4, 10]),
        }),
        checkBoxes({
          from: "2021-07-31",
          to: "2021-08-04",
          duration: 90,
          boxIds: offsetIds([4, 10, 11, 12, 13]),
        }),
      ]));

    it("only boxes 1-4 and 8-13 from 2021-08-05 to 2021-08-08", () =>
      Promise.all([
        checkBoxes({
          from: "2021-08-05",
          to: "2021-08-05",
          boxIds: offsetIds([1, 2, 3, 4, 8, 9, 10]),
        }),
        checkBoxes({
          from: "2021-08-06",
          to: "2021-08-07",
          boxIds: offsetIds([1, 2, 3, 4, 8, 9, 10, 11, 12, 13]),
        }),
        checkBoxes({
          from: "2021-08-08",
          to: "2021-08-08",
          boxIds: offsetIds([1, 2, 3, 4, 8, 9, 10]),
        }),
        checkBoxes({
          from: "2021-08-05",
          to: "2021-08-08",
          duration: 90,
          boxIds: offsetIds([4, 9, 10, 11, 12, 13]),
        }),
      ]));

    it("all boxes with box slots from 2021-08-09", () =>
      Promise.all([
        checkBoxes({
          from: "2021-08-09",
          to: "2021-08-10",
          boxIds: offsetIds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        }),
        checkBoxes({
          from: "2021-08-09",
          to: "2021-08-10",
          duration: 90,
          boxIds: offsetIds([4, 5, 6, 9, 10, 11, 12, 13]),
        }),
      ]));

    it("should show off-peak price inc vat on Mondays", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2021-12-13"), "yyyy-MM-dd"),
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200);

      expect(response.body.times.every(({ price }) => price === 3500)).toBe(
        true
      );
    });

    it("should show peak price inc vat on Wednesdays after 4pm", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2021-12-15"), "yyyy-MM-dd"),
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200);

      expect(
        response.body.times
          .filter(
            (availableTime) =>
              new Date(`2021-12-15 ${availableTime.start}`) >=
              new Date("2021-12-15 16:00")
          )
          .every(({ price }) => price === 7000)
      ).toBe(true);
    });

    it("should show super-peak price inc vat on Saturdays", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2021-12-18"), "yyyy-MM-dd"),
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200);

      expect(response.body.times.every(({ price }) => price === 8000)).toBe(
        true
      );
    });

    it("should show over_18 property in response when duration is 90 and off peak week day", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2022-04-20"), "yyyy-MM-dd"), // Day is a Wednesday
            venue,
            duration: 90,
          })
        )
        .set(commonHeaders)
        .expect(200);

      const over18Slots = response.body.times.filter(
        ({ over_18: over18 }) => over18 === true
      );

      expect(over18Slots.every(({ start }) => start > "17:30")).toBe(true);
    });

    it("should show over_18 property in response when duration is 90 and peak week day", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2022-04-23"), "yyyy-MM-dd"), // Day is a Saturday
            venue,
            duration: 90,
          })
        )
        .set(commonHeaders)
        .expect(200);

      const over18Slots = response.body.times.filter(
        ({ over_18: over18 }) => over18 === true
      );

      expect(over18Slots.every(({ start }) => start > "14:30")).toBe(true);
    });

    it("should show over_18 property in response when duration is 60 and off peak week day", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2022-04-20"), "yyyy-MM-dd"), // Day is a Wednesday
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200);

      const over18Slots = response.body.times.filter(
        ({ over_18: over18 }) => over18 === true
      );

      expect(over18Slots.every(({ start }) => start > "18:00")).toBe(true);
    });

    it("should show over_18 property in response when duration is 60 and peak week day", async () => {
      const response = await server
        .get(
          url({
            day: format(new Date("2022-04-23"), "yyyy-MM-dd"), // Day is a Saturday
            venue,
          })
        )
        .set(commonHeaders)
        .expect(200);

      const over18Slots = response.body.times.filter(
        ({ over_18: over18 }) => over18 === true
      );

      expect(over18Slots.every(({ start }) => start > "15:00")).toBe(true);
    });
  });
});
