const request = require("supertest");
const { add } = require("date-fns");
const { commonHeaders } = require("./config");
const { convertLondonTimeToUTCString } = require("./test-utils");
const { TimestampMatch } = require("../src/services/const");

const server = request("http://localhost:3000");
const url = `/dev/reception/bookings/filter`;

describe("POST /reception/bookings/filter/", () => {
  it("when no day specified then expect 400", () =>
    server
      .post(url)
      .send({ venue_code: "test-venue" })
      .set(commonHeaders)
      .expect(400));

  it("when no venue code then expect 400", () =>
    server
      .post(url)
      .send({ day: "2021-03-01" })
      .set(commonHeaders)
      .expect(400));

  it("when invalid date then expect 400", () =>
    server
      .post(url)
      .send({ day: "some-invalid-date", venue_code: "test-venue" })
      .set(commonHeaders)
      .expect(400));

  it("when unknown venue code then expect 404", () =>
    server
      .post(url)
      .send({ day: "2021-03-01", venue_code: "unknow" })
      .set(commonHeaders)
      .expect(404));

  it("when requesting filtered bookings for empty day then expect 200", () =>
    server
      .post(url)
      .send({ day: "2021-01-19", venue_code: "test-venue" })
      .set(commonHeaders)
      .expect(200, {
        bookings: [],
      }));

  it("when requesting filtered bookings then expect 200", () =>
    server
      .post(url)
      .send({ day: "2021-01-18", venue_code: "test-venue" })
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        expect(response.body).toMatchObject({
          bookings: [
            {
              booking_key: "booking-updated-future",
              booking_start: convertLondonTimeToUTCString(
                "2021-01-18 08:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-01-18 08:00:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-01-18 09:30:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-01-18 09:30:00"
              ),
              booking_notes: "Booking for testing the from_timestamp",
              booking_type: "social",
              booking_source: "online",
              booking_status: "Paid",
              booking_extras: null,
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "booking-updated-future",
            },
            {
              booking_key: "confirm-booking-off-peak",
              booking_start: convertLondonTimeToUTCString(
                "2021-01-18 14:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-01-18 14:00:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-01-18 15:30:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-01-18 15:30:00"
              ),
              booking_notes: null,
              booking_type: "social",
              booking_source: "online",
              booking_status: "Paid",
              booking_extras: null,
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "confirm-booking-off-peak",
            },
            {
              booking_key: "confirm-booking",
              booking_start: convertLondonTimeToUTCString(
                "2021-01-18 18:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-01-18 18:05:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-01-18 19:00:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-01-18 19:05:00"
              ),
              booking_notes: null,
              booking_type: "social",
              booking_source: "online",
              booking_status: "Paid",
              booking_extras: null,
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "confirm-booking",
            },
            {
              booking_key: "confirm-booking-90m",
              booking_start: convertLondonTimeToUTCString(
                "2021-01-18 18:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-01-18 18:00:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-01-18 19:30:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-01-18 19:30:00"
              ),
              booking_notes: null,
              booking_type: "social",
              booking_source: "online",
              booking_status: "Paid",
              booking_extras: null,
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "confirm-booking-90m",
            },
          ],
        });
      }));

  it("should retrieve cancelled bookings as well when sending cancelled = true", () =>
    server
      .post(url)
      .send({ day: "2021-03-02", venue_code: "test-venue", cancelled: true })
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        expect(response.body).toMatchObject({
          bookings: [
            {
              booking_key: "cancel-booking",
              booking_start: convertLondonTimeToUTCString(
                "2021-03-02 08:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-03-02 08:00:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-03-02 09:30:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-03-02 09:30:00"
              ),
              booking_notes: null,
              booking_extras: null,
              booking_type: "social",
              booking_source: "online",
              booking_status: "Cancelled",
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "cancel-booking",
            },
          ],
        });
      }));

  it("when requesting filtered bookings with from_timestamp then expect 200", () =>
    server
      .post(url)
      .send({
        day: "2021-01-18",
        venue_code: "test-venue",
        from_timestamp: add(new Date(), { days: 1 }),
      })
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        expect(response.body).toMatchObject({
          bookings: [
            {
              booking_key: "booking-updated-future",
              booking_start: convertLondonTimeToUTCString(
                "2021-01-18 08:00:00"
              ),
              booking_box_slot_start: convertLondonTimeToUTCString(
                "2021-01-18 08:00:00"
              ),
              booking_players: 1,
              booking_end: convertLondonTimeToUTCString("2021-01-18 09:30:00"),
              booking_box_slot_end: convertLondonTimeToUTCString(
                "2021-01-18 09:30:00"
              ),
              booking_notes: "Booking for testing the from_timestamp",
              booking_type: "social",
              booking_source: "online",
              booking_status: "Paid",
              booking_extras: null,
              booking_checkin_at: null,
              booking_created_at: expect.stringMatching(TimestampMatch),
              booking_updated_at: expect.stringMatching(TimestampMatch),
              box_ids: [1],
              venue_id: 1,
              session_id: "booking-updated-future",
            },
          ],
        });
      }));
});
