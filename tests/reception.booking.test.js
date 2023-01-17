/* eslint-disable camelcase */
const request = require("supertest");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { commonHeaders } = require("./config");
const { convertLondonTimeToUTCString } = require("./test-utils");
const { TimestampMatch } = require("../src/services/const");

const server = request("http://localhost:3000");
const url = `/dev/reception/bookings`;

const createPostPayload = ({
  booking_session_id = "",
  guests_no = 1,
  booking_start = convertLondonTimeToUTCString("2021-01-20 03:07:40"),
  booking_end = convertLondonTimeToUTCString("2021-01-20 05:11:40"),
  box_id = 1,
  venue_id = 1,
  booking_notes = "Some notes",
  booking_source = "phone",
  booking_type = "other",
} = {}) => ({
  booking_session_id,
  booking_guests: {
    guests_no,
  },
  booking_location: {
    booking_start,
    booking_end,
    box_id,
    venue_id,
  },
  booking_notes,
  booking_source,
  booking_type,
});

describe("POST /reception/bookings/", () => {
  it("when creating booking with session id then return 200", async () => {
    const sessionId = "some-session-id";
    const token = jwt.sign({ sub: sessionId }, "secret");

    const response = await server
      .post(url)
      .send(createPostPayload({ booking_session_id: sessionId }))
      .set(commonHeaders)
      .expect(200);

    expect(response.body).toMatchObject({
      booking_key: expect.anything(),
      booking_start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      booking_box_slot_start: convertLondonTimeToUTCString(
        "2021-01-20 03:00:00"
      ),
      booking_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_box_slot_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_players: 1,
      booking_notes: "Some notes",
      booking_type: "other",
      booking_source: "phone",
      booking_status: "Paid",
      booking_checkin_at: null,
      booking_created_at: expect.stringMatching(TimestampMatch),
      booking_updated_at: expect.stringMatching(TimestampMatch),
      box_ids: [1],
      venue_id: 1,
      session_id: sessionId,
    });

    const reference = response.body.booking_key;
    const getResponse = await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body).toEqual({
      reference: expect.anything(),
      start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      box_slot_start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      box_slot_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      checkin_at: null,
      extras: null,
      packages: null,
      guests_no: 1,
      notes: "Some notes",
      price: null,
      source: "phone",
      status: "Paid",
      type: "other",
      box_ids: [1],
    });
  });

  it("when creating booking without session id then return 200", async () => {
    const response = await server
      .post(url)
      .send(createPostPayload())
      .set(commonHeaders)
      .expect(200);

    expect(response.body).toMatchObject({
      booking_key: expect.anything(),
      booking_start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      booking_box_slot_start: convertLondonTimeToUTCString(
        "2021-01-20 03:00:00"
      ),
      booking_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_box_slot_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_players: 1,
      booking_notes: "Some notes",
      booking_type: "other",
      booking_source: "phone",
      booking_status: "Paid",
      booking_checkin_at: null,
      booking_created_at: expect.stringMatching(TimestampMatch),
      booking_updated_at: expect.stringMatching(TimestampMatch),
      box_ids: [1],
      venue_id: 1,
      session_id: expect.anything(),
    });
  });

  it("when creating booking with end time of 23:59 then return 200", async () => {
    const response = await server
      .post(url)
      .send(
        createPostPayload({
          booking_end: convertLondonTimeToUTCString("2021-01-20 23:59"),
        })
      )
      .set(commonHeaders)
      .expect(200);

    expect(response.body).toMatchObject({
      booking_key: expect.anything(),
      booking_start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      booking_box_slot_start: convertLondonTimeToUTCString(
        "2021-01-20 03:00:00"
      ),
      booking_end: convertLondonTimeToUTCString("2021-01-20 23:59:00"),
      booking_box_slot_end: convertLondonTimeToUTCString("2021-01-20 23:59:00"),
      booking_players: 1,
      booking_notes: "Some notes",
      booking_type: "other",
      booking_source: "phone",
      booking_status: "Paid",
      booking_checkin_at: null,
      booking_created_at: expect.stringMatching(TimestampMatch),
      booking_updated_at: expect.stringMatching(TimestampMatch),
      box_ids: [1],
      venue_id: 1,
      session_id: expect.anything(),
    });
  });

  it.each`
    field               | value
    ${"booking_source"} | ${"some-wrong-source"}
    ${"booking_type"}   | ${"some-wrong-type"}
    ${"venue_id"}       | ${-1}
    ${"box_id"}         | ${-1}
  `(
    "when creating booking with wrong $field then return 400",
    ({ field, value }) =>
      server
        .post(url)
        .send(createPostPayload({ [field]: value }))
        .set(commonHeaders)
        .expect(400, { code: "007", message: "invalid payload" })
  );

  it("when creating booking with empty payload then return 400", () =>
    server.post(url).send({}).set(commonHeaders).expect(400, {
      code: "000",
      message:
        "venue_id required|box_id required|booking_start required|booking_start is invalid date|booking_end required|booking_end is invalid date",
    }));
});

describe("PATCH /reception/bookings/{bookingKey}", () => {
  let bookingKey;

  const createPatchPayload = ({
    booking_session_id = "",
    guests_no,
    booking_start,
    booking_end,
    box_ids,
    venue_id,
    booking_notes,
    booking_source,
    booking_type,
    justification,
  } = {}) => ({
    booking_session_id,
    booking_guests: {
      guests_no,
    },
    booking_location: {
      booking_start,
      booking_end,
      box_ids,
      venue_id,
    },
    booking_notes,
    booking_source,
    booking_type,
    justification,
  });

  beforeAll(async () => {
    // create booking to be updated
    const response = await server
      .post(url)
      .send(createPostPayload())
      .set(commonHeaders)
      .expect(200);
    bookingKey = response.body.booking_key;
  });

  it("should publish an event to eventbridge when a booking is updated", async () => {
    const sessionId = "eb-event-id";
    const token = jwt.sign({ sub: sessionId }, "secret");

    const response = await server
      .post(url)
      .send(createPostPayload())
      .set(commonHeaders)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const reference = response.body.booking_key;

    await server
      .patch(`${url}/${reference}`)
      .set(commonHeaders)
      .set("Authorization", `Bearer ${token}`)
      .send(
        createPatchPayload({
          booking_notes: "some notes that make sense",
          justification: "Customer couldn't make original time",
          booking_start: convertLondonTimeToUTCString("2022-02-14 14:00:00"),
          booking_end: convertLondonTimeToUTCString("2021-02-14 15:30:00"),
        })
      )
      .expect(200);

    const ebResponse = await axios.put("http://localhost:1081/retrieve");
    const ebEvent = ebResponse.data.find((event) => {
      const body = event.body.json.Entries[0];

      const detail = JSON.parse(body.Detail);

      return (
        body.DetailType === "audit" &&
        detail.context.from.reference === reference &&
        detail.context.to.reference === reference
      );
    });

    const eventData = ebEvent.body.json.Entries[0];

    expect(eventData.EventBusName).toEqual("toca-audit-api");
    expect(eventData.DetailType).toEqual("audit");
    expect(eventData.Source).toEqual("booking");

    const detail = JSON.parse(eventData.Detail);

    expect(detail.action).toEqual(
      "Updated start time to 2022-02-14T14:00:00.000Z. Updated end time to 2021-02-14T15:30:00.000Z. Updated notes to some notes that make sense."
    );
    expect(detail.userId).toEqual(sessionId);
    expect(detail.justification).toEqual(
      "Customer couldn't make original time"
    );
  });

  it("should not publish an event to eventbridge when no actions are performed", async () => {
    const sessionId = "eb-event-id";
    const token = jwt.sign({ sub: sessionId }, "secret");

    const response = await server
      .post(url)
      .send(createPostPayload())
      .set(commonHeaders)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const reference = response.body.booking_key;

    await server
      .patch(`${url}/${reference}`)
      .set(commonHeaders)
      .set("Authorization", `Bearer ${token}`)
      .send(createPatchPayload({}))
      .expect(200);

    const ebResponse = await axios.put("http://localhost:1081/retrieve");
    const ebEvent = ebResponse.data.find((event) => {
      const body = event.body.json.Entries[0];

      const detail = JSON.parse(body.Detail);

      return (
        body.DetailType === "audit" &&
        detail.context.from.reference === reference &&
        detail.context.to.reference === reference
      );
    });

    expect(ebEvent).toBeUndefined();
  });

  it("when updating booking with session id then return 200", async () => {
    const sessionId = "some-session-id";
    const token = jwt.sign({ sub: sessionId }, "secret");

    await server
      .get(`/dev/bookings/${bookingKey}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400);

    const response = await server
      .patch(`${url}/${bookingKey}`)
      .send(createPatchPayload({ booking_session_id: sessionId }))
      .set(commonHeaders)
      .set("Authorization", `Basic ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      booking_key: expect.anything(),
      booking_start: convertLondonTimeToUTCString("2021-01-20 03:00:00"),
      booking_box_slot_start: convertLondonTimeToUTCString(
        "2021-01-20 03:00:00"
      ),
      booking_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_box_slot_end: convertLondonTimeToUTCString("2021-01-20 05:10:00"),
      booking_players: 1,
      booking_notes: "Some notes",
      booking_type: "other",
      booking_source: "phone",
      booking_status: "Paid",
      booking_extras: null,
      booking_checkin_at: null,
      booking_created_at: expect.stringMatching(TimestampMatch),
      booking_updated_at: expect.stringMatching(TimestampMatch),
      box_ids: [1],
      venue_id: 1,
      session_id: expect.anything(),
    });

    await server
      .get(`/dev/bookings/${bookingKey}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
  });

  it.each`
    field               | returnedField               | value                                                  | expectedValue
    ${"venue_id"}       | ${"venue_id"}               | ${2}                                                   | ${2}
    ${"box_ids"}        | ${"box_ids"}                | ${[2]}                                                 | ${[2]}
    ${"booking_start"}  | ${"booking_start"}          | ${convertLondonTimeToUTCString("2021-01-20 04:06:50")} | ${convertLondonTimeToUTCString("2021-01-20 04:00:00")}
    ${"booking_start"}  | ${"booking_box_slot_start"} | ${convertLondonTimeToUTCString("2021-01-20 04:06:50")} | ${convertLondonTimeToUTCString("2021-01-20 04:00:00")}
    ${"booking_end"}    | ${"booking_end"}            | ${convertLondonTimeToUTCString("2021-01-20 06:12:50")} | ${convertLondonTimeToUTCString("2021-01-20 06:10:00")}
    ${"guests_no"}      | ${"booking_players"}        | ${2}                                                   | ${2}
    ${"booking_notes"}  | ${"booking_notes"}          | ${"some-updated-notes"}                                | ${"some-updated-notes"}
    ${"booking_source"} | ${"booking_source"}         | ${"reception"}                                         | ${"reception"}
    ${"booking_type"}   | ${"booking_type"}           | ${"event"}                                             | ${"event"}
  `(
    "when updating booking with $field then return 200",
    async ({ field, returnedField, value, expectedValue }) => {
      const token = jwt.sign({ sub: "some-session-id" }, "secret");

      const response = await server
        .patch(`${url}/${bookingKey}`)
        .send(createPatchPayload({ [field]: value }))
        .set(commonHeaders)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          [returnedField]: expectedValue,
        })
      );
    }
  );

  it.each`
    field               | value
    ${"booking_source"} | ${"some-wrong-source"}
    ${"booking_type"}   | ${"some-wrong-type"}
    ${"venue_id"}       | ${-1}
    ${"box_ids"}        | ${[-1]}
  `(
    "when updating booking with invalid $field then return 400",
    ({ field, value }) =>
      server
        .patch(`${url}/${bookingKey}`)
        .send(createPatchPayload({ [field]: value }))
        .set(commonHeaders)
        .expect(400, { code: "007", message: "invalid payload" })
  );
});

describe("DELETE /reception/bookings/{bookingKey}", () => {
  const sessionId = "some-session-id";
  let bookingKey;

  beforeAll(async () => {
    // create booking to be updated
    const response = await server
      .post(url)
      .send(createPostPayload({ booking_session_id: sessionId }))
      .set(commonHeaders)
      .expect(200);
    bookingKey = response.body.booking_key;
  });

  it("when deleting booking then return 200", async () => {
    const token = jwt.sign({ sub: sessionId }, "secret");

    await server
      .delete(`${url}/${bookingKey}`)
      .set(commonHeaders)
      .expect(200, { deletedBookings: 1 });

    await server
      .get(`/dev/bookings/${bookingKey}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400);
  });

  it("when deleting booking then what return 200", () =>
    server
      .delete(`${url}/some-wrong-booking-reference`)
      .set(commonHeaders)
      .expect(200, { deletedBookings: 0 }));
});
