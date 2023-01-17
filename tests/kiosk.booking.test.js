const request = require("supertest");
const jwt = require("jsonwebtoken");
const { add } = require("date-fns");
const { commonHeaders } = require("./config");
const { convertLondonTimeToUTCString } = require("./test-utils");

const server = request("http://localhost:3000");
const url = `/dev/kiosk/bookings`;

describe("POST /kiosk/bookings/", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");
  const hook = () =>
    server.post(url).set("Authorization", `Basic ${token}`).set(commonHeaders);

  const payload = ({
    guests_no = 1,
    from_timestamp = convertLondonTimeToUTCString("2021-05-27 09:01:02"),
    booking_duration = 60,
    venue_id = 1,
  } = {}) => ({
    booking_guests: {
      guests_no,
    },
    booking_location: {
      venue_id,
      from_timestamp,
      booking_duration,
    },
  });

  it("when creating booking with empty payload then return 400", () =>
    hook().send({}).expect(400, {
      code: "000",
      message:
        "from time required|venue required|duration required|number of guests required",
    }));

  it("when creating booking with unknown venue then return 404", () =>
    hook()
      .send(payload({ venue_id: -1 }))
      .expect(404, { code: "001", message: "unknown venue" }));

  it("when creating booking without start time then return 400", () =>
    hook()
      .send(payload({ from_timestamp: null }))
      .expect(400, { code: "000", message: "from time required" }));

  it("when creating booking with invalid timestamp then return 400", () =>
    hook()
      .send(
        payload({
          from_timestamp: "2021-01-01 19:00",
        })
      )
      .expect(400, {
        code: "000",
        message: "from time must be an ISO string",
      }));

  const createAndCheckBooking = async ({ start, boxSlotStart }) => {
    const response = await hook().send(payload()).expect(200);
    console.log(response.body);

    expect(response.body.booking_key).toBeDefined();
    expect(response.body.booking_price).toBeDefined();
    expect(response.body.expires_at).toBeDefined();
    expect(response.body.booking_start).toBe(start);
    const reference = response.body.booking_key;
    const getResponse = await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      reference,
      start,
      box_slot_start: boxSlotStart,
      end: add(new Date(start), { minutes: 60 }).toISOString(),
      box_slot_end: add(new Date(boxSlotStart), { minutes: 60 }).toISOString(),
      guests_no: 1,
    });

    return getResponse;
  };

  it("should create booking on correct box", async () => {
    // Venue closes at 19:00
    // Box section 1 closed
    // Booking on box 2 from 17:30 to 18:30
    const date = convertLondonTimeToUTCString("2021-05-20 16:25:00");
    const bookedDate = convertLondonTimeToUTCString("2021-05-20 16:30:00");
    await server
      .get(`/dev/kiosk/waitingtime/test-venue/60/${date}`)
      .set(commonHeaders)
      .expect(200, {
        venue_id: 1,
        venue_code: "test-venue",
        wait_times: [
          {
            wait_time: 10,
            price: 2001,
            slot_duration: 60,
          },
        ],
      });

    const response = await hook()
      .send(
        payload({
          from_timestamp: date,
        })
      )
      .expect(200);

    expect(response.body.booking_key).toBeDefined();
    expect(response.body.booking_price).toBeDefined();
    expect(response.body.expires_at).toBeDefined();
    expect(response.body.booking_start).toBe(bookedDate);

    const reference = response.body.booking_key;
    const getResponse = await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body.reference).toBe(reference);
    expect(getResponse.body.start).toBe(bookedDate);
    expect(getResponse.body.box_slot_start).toBe(bookedDate);
    expect(getResponse.body.guests_no).toBe(1);
    expect(getResponse.body.box_ids).toEqual([3]);

    return getResponse;
  });
  it("when 31 - 10 creating bookings on available day then return 200", async () => {
    // section 1
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
    });
    // section 2
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 09:20:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 09:10:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 09:30:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 09:20:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 09:40:00"),
    });

    // after first set of bookings
    // section 1
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 10:20:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 10:20:00"),
    });
    // section 2
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 10:20:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 10:20:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 10:20:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 10:30:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 10:30:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 10:40:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 10:30:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 10:50:00"),
    });

    // after second set of bookings
    // section 1
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 11:30:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 11:30:00"),
    });
    // section 2
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 11:30:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 11:30:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 11:40:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 11:40:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 11:40:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 11:50:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 11:40:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 12:00:00"),
    });

    // after third set of bookings
    // section 1
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 12:40:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 12:40:00"),
    });
    // section 2
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 12:50:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 12:50:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 12:50:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 13:00:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 12:50:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 13:10:00"),
    });
    await createAndCheckBooking({
      start: convertLondonTimeToUTCString("2021-05-27 13:00:00"),
      boxSlotStart: convertLondonTimeToUTCString("2021-05-27 13:20:00"),
    });
  }, 30000);
  it("handle create concurrent bookings", async () => {
    const responses = await Promise.all(
      Array(10)
        .fill()
        .map(() =>
          hook()
            .send(
              payload({
                from_timestamp: convertLondonTimeToUTCString(
                  "2021-05-20 09:00:00"
                ),
                duration: 90,
              })
            )
            .expect(200)
        )
    );

    const times = {};

    return Promise.all(
      responses.map(async (response) => {
        expect(response.body.booking_key).toBeDefined();
        expect(response.body.booking_price).toBeDefined();
        expect(response.body.expires_at).toBeDefined();
        expect(response.body.booking_start).toBeDefined();

        const reference = response.body.booking_key;

        const getResponse = await server
          .get(`/dev/bookings/${reference}`)
          .set("Authorization", `Basic ${token}`)
          .set(commonHeaders)
          .expect(200);

        expect(getResponse.body.reference).toBe(reference);

        if (getResponse.body.box_id === 1) {
          return Promise.resolve();
        }

        const { start, box_slot_start: boxSlotStart } = getResponse.body;
        if (!times[start]) {
          times[start] = {};
        }
        expect(times[start][boxSlotStart]).toBeUndefined();
        times[start][boxSlotStart] = true;
        return Promise.resolve();
      })
    );
  }, 30000);
});
