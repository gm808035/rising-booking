const request = require("supertest");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const { generate } = require("randomstring");
const { commonHeaders } = require("./config");
const { convertLondonTimeToUTCString } = require("./test-utils");
const { expectSQSMessageToBe } = require("./helpers/sqs");

const server = request("http://localhost:3000");
const url = `/dev/bookings`;

const dynamodb = new AWS.DynamoDB.DocumentClient({
  endpoint: "http://localhost:8000",
  region: "eu-west-2",
});

const generateGetResponsePayload = ({
  start = convertLondonTimeToUTCString("2021-03-01 18:00:00"),
  box_slot_start = null,
  box_slot_end = null,
  end = convertLondonTimeToUTCString("2021-03-01 19:00:00"),
  price = 2001,
  reference = "",
  status = null,
  guests_no = 1,
  source = "online",
  type = "social",
  extras = null,
  packages = null,
  notes = null,
  checkin_at = null,
  box_ids = [1],
}) => ({
  start,
  end,
  box_slot_start,
  box_slot_end,
  price,
  reference,
  status,
  guests_no,
  source,
  type,
  extras,
  notes,
  checkin_at,
  box_ids,
  packages,
});

const expectDynamoDbItemToBe = async (payload) => {
  const { Item } = await dynamodb
    .get({
      TableName: "email_content",
      Key: {
        id: payload.id,
      },
    })
    .promise();

  expect(Item).toEqual(payload);
};

describe("POST /bookings/", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");
  const hook = () =>
    server.post(url).set("Authorization", `Basic ${token}`).set(commonHeaders);

  const payload = ({
    guests_no = 1,
    booking_timestamp = convertLondonTimeToUTCString("2021-04-29 09:00:00"),
    booking_duration = 60,
    box_id = 1,
    venue_id = 1,
    box_slot_id = 1,
    linked_box_slot_id = null,
    booking_notes = "",
    booking_extras = "",
    booking_packages = "",
  } = {}) => ({
    booking_guests: {
      guests_no,
    },
    booking_location: {
      booking_timestamp,
      booking_duration,
      box_id,
      box_slot_id,
      linked_box_slot_id,
      venue_id,
    },
    booking_notes,
    booking_extras,
    booking_packages,
  });

  it("when creating booking with booking_timestamp which doesn't pass to any schedule", () =>
    hook()
      .send(
        payload({
          booking_timestamp: convertLondonTimeToUTCString(
            "2022-08-15 09:00:00"
          ),
        })
      )
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      }));

  it("when creating booking with empty payload then return 400", () =>
    hook().send({}).expect(400, {
      code: "000",
      message:
        "booking start time required|box required|box slot required|venue required|duration required|number of guests required",
    }));

  it("when creating booking with unknown venue then return 404", () =>
    hook()
      .send(payload({ venue_id: -1 }))
      .expect(404, { code: "001", message: "unknown venue" }));

  it("when creating booking without start time then return 400", () =>
    hook()
      .send(payload({ booking_timestamp: null }))
      .expect(400, { code: "000", message: "booking start time required" }));

  it("when creating booking with invalid box id then return 404", () =>
    hook()
      .send(payload({ box_id: -1 }))
      .expect(404, { code: "002", message: "unknown box" }));

  it("when creating booking with invalid box slot id then return 404", () =>
    hook()
      .send(payload({ box_slot_id: -1 }))
      .expect(404, { code: "003", message: "unknown box slot" }));

  it("when creating booking and box slot start different to booking_timestamp then return 400", () =>
    hook()
      .send(payload({ box_slot_id: 2 }))
      .expect(400, { code: "004", message: "wrong box slot" }));

  it("when creating booking and notes are greater than 255 characters then return 400", () =>
    hook()
      .send(
        payload({
          booking_notes: generate({ length: 256, charset: "alphabetic" }),
        })
      )
      .expect(400, {
        code: "000",
        message: "booking notes cannot be more than 255 characters",
      }));

  it("when creating booking and packages is not a string then return 400", () =>
    hook()
      .send(payload({ booking_packages: 1234 }))
      .expect(400, { code: "000", message: "packages must be a JSON string" }));

  it("when creating booking and guests number is less than 1 then return 400", () =>
    hook()
      .send(payload({ guests_no: -1 }))
      .expect(400, {
        code: "000",
        message: "number of guests must be between 1 and 30",
      }));

  it("when creating booking and guests number is more than 30 then return 400", () =>
    hook()
      .send(payload({ guests_no: 31 }))
      .expect(400, {
        code: "000",
        message: "number of guests must be between 1 and 30",
      }));

  it("when creating booking with invalid timestamp then return 400", () =>
    hook()
      .send(
        payload({
          booking_timestamp: "2021-01-01 19:00",
        })
      )
      .expect(400, {
        code: "000",
        message: "booking start time must be an ISO String",
      }));

  it("when creating booking and slot unavailable then return 400", () =>
    hook()
      .send(
        payload({
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-03-01 18:00:00"
          ),
          box_slot_id: 5,
        })
      )
      .expect(400, { code: "005", message: "slot unavailable" }));

  it.each`
    start                    | end                      | boxSlotStart             | boxSlotEnd               | boxSlotId | boxId | duration | price   | message
    ${"2021-04-29 09:00:00"} | ${"2021-04-29 10:00:00"} | ${"2021-04-29 09:00:00"} | ${"2021-04-29 10:00:00"} | ${1}      | ${1}  | ${60}    | ${1001} | ${"within off peak"}
    ${"2021-04-29 16:00:00"} | ${"2021-04-29 17:00:00"} | ${"2021-04-29 16:00:00"} | ${"2021-04-29 17:00:00"} | ${4}      | ${1}  | ${60}    | ${2001} | ${"on edge of peak"}
    ${"2021-04-29 18:00:00"} | ${"2021-04-29 19:00:00"} | ${"2021-04-29 18:00:00"} | ${"2021-04-29 19:00:00"} | ${5}      | ${1}  | ${60}    | ${2001} | ${"within peak"}
    ${"2021-04-30 18:00:00"} | ${"2021-04-30 19:00:00"} | ${"2021-04-30 18:00:00"} | ${"2021-04-30 19:00:00"} | ${5}      | ${1}  | ${60}    | ${3001} | ${"within super peak"}
    ${"2021-04-29 11:14:00"} | ${"2021-04-29 12:44:00"} | ${"2021-04-29 11:14:00"} | ${"2021-04-29 12:44:00"} | ${7}      | ${2}  | ${90}    | ${1501} | ${"within off peak and different start time from box slot start"}
  `(
    "when creating booking $message then return 200",
    async ({
      start,
      end,
      boxSlotStart,
      boxSlotEnd,
      boxSlotId,
      boxId,
      duration,
      price,
    }) => {
      const response = await hook()
        .send(
          payload({
            booking_timestamp: convertLondonTimeToUTCString(start),
            box_slot_id: boxSlotId,
            box_id: boxId,
            booking_duration: duration,
          })
        )
        .expect(200);

      expect(response.body.booking_key).toBeDefined();
      expect(response.body.expires_at).toBeDefined();

      const reference = response.body.booking_key;

      const getResponse = await server
        .get(`${url}/${reference}`)
        .set("Authorization", `Basic ${token}`)
        .set(commonHeaders)
        .expect(200);

      expect(getResponse.body).toEqual(
        generateGetResponsePayload({
          reference,
          price,
          start: convertLondonTimeToUTCString(start),
          end: convertLondonTimeToUTCString(end),
          box_slot_start: convertLondonTimeToUTCString(boxSlotStart),
          box_slot_end: convertLondonTimeToUTCString(boxSlotEnd),
          box_ids: [boxId],
        })
      );
    }
  );

  const createBooking = ({
    booking_timestamp = convertLondonTimeToUTCString("2021-04-22 18:00:00"),
    box_slot_id = 5,
    box_id = 1,
    booking_duration = 60,
  } = {}) =>
    hook().send(
      payload({
        booking_timestamp,
        box_id,
        booking_duration,
        box_slot_id,
      })
    );

  // TODO: fix concurrent booking functionality introduced by DBB feature
  it("handle two concurrent bookings with same box slot id", async () => {
    const responses = await Promise.all([
      await createBooking(),
      await createBooking(),
    ]);

    const [successfulResponse, failedResponse] = responses;

    expect(successfulResponse.statusCode).toBe(200);
    expect(successfulResponse.body.booking_key).toBeDefined();
    expect(successfulResponse.body.expires_at).toBeDefined();

    const reference = successfulResponse.body.booking_key;
    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body.reference).toBe(reference);

    expect(failedResponse.statusCode).toBe(400);
    expect(failedResponse.body).toEqual({
      code: "005",
      message: "slot unavailable",
    });
  });

  it("handle concurrent bookings with different box slot ids", async () => {
    const responses = await Promise.all([
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 09:00:00"),
        box_slot_id: 1,
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 13:00:00"),
        box_slot_id: 2,
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 14:00:00"),
        box_slot_id: 3,
        booking_duration: 90,
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 16:00:00"),
        box_slot_id: 4,
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 18:00:00"),
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 09:05:00"),
        box_id: 2,
        box_slot_id: 6,
      }),
      createBooking({
        booking_timestamp: convertLondonTimeToUTCString("2021-04-15 11:14:00"),
        box_id: 2,
        box_slot_id: 7,
        booking_duration: 90,
      }),
    ]);

    return Promise.all(
      responses.map(async (response) => {
        expect(response.statusCode).toBe(200);
        expect(response.body.booking_key).toBeDefined();
        expect(response.body.expires_at).toBeDefined();
        const reference = response.body.booking_key;

        const getResponse = await server
          .get(`${url}/${reference}`)
          .set("Authorization", `Basic ${token}`)
          .set(commonHeaders)
          .expect(200);

        expect(getResponse.body.reference).toBe(reference);
      })
    );
  }, 10000);

  it("should create a double box booking", async () => {
    const response = await hook()
      .send(
        payload({
          venue_id: 5,
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-12-06 14:20:00"
          ),
          box_id: 30,
          box_slot_id: 1488,
          linked_box_slot_id: 70,
          booking_duration: 90,
        })
      )
      .expect(200);

    expect(response.body.booking_key).toBeDefined();
    expect(response.body.expires_at).toBeDefined();

    const reference = response.body.booking_key;

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body.reference).toBe(reference);
    expect(getResponse.body.box_ids).toEqual([30, 31]);
    expect(getResponse.body.price).toEqual(3003);
  });

  it("should allow 2 bookings with similar slot times to be booked at separate occasions", async () => {
    await hook()
      .send(
        payload({
          venue_id: 5,
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-12-13 17:40:00"
          ),
          box_id: 32,
          box_slot_id: 320,
          booking_duration: 90,
        })
      )
      .expect(200);

    await hook()
      .send(
        payload({
          venue_id: 5,
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-12-13 17:40:00"
          ),
          box_id: 30,
          box_slot_id: 302,
          booking_duration: 90,
        })
      )
      .expect(200);
  });

  it("should create a booking with packages", async () => {
    const response = await hook()
      .send(
        payload({
          venue_id: 1,
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-12-16 09:00:00"
          ),
          box_id: 1,
          box_slot_id: 1,
          booking_duration: 90,
          booking_packages: `{"CK":{"price":1234,"name":"Cake","quantity":10}}`,
        })
      )
      .expect(200);

    const reference = response.body.booking_key;

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body.reference).toEqual(reference);
    expect(getResponse.body.packages).toEqual(
      `{"CK":{"price":1234,"name":"Cake","quantity":10}}`
    );
  });

  it("should create a double box booking with different price for double bookings and slots", async () => {
    const response = await hook()
      .send(
        payload({
          venue_id: 5,
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-12-06 16:00:00"
          ),
          box_id: 30,
          box_slot_id: 1489,
          linked_box_slot_id: 71,
          booking_duration: 90,
        })
      )
      .expect(200);

    expect(response.body.booking_key).toBeDefined();
    expect(response.body.expires_at).toBeDefined();

    const reference = response.body.booking_key;

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponse.body.reference).toBe(reference);
    expect(getResponse.body.box_ids).toEqual([30, 31]);
    expect(getResponse.body.price).toEqual(6003);

    // try create booking with time difference from box_slot start time
    await hook()
      .send(
        payload({
          venue_id: 5,
          booking_timestamp: convertLondonTimeToUTCString(
            // slot start "16:00:00", time difference not allowed
            "2021-12-06 16:10:00"
          ),
          box_id: 30,
          box_slot_id: 1489,
          linked_box_slot_id: 71,
          booking_duration: 90,
        })
      )
      .expect(400, { code: "004", message: "wrong box slot" });

    // double booking updated from second slot of double_box_slot pair
    await server
      .patch(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        update: true,
        booking_guests: { guests_no: 20 },
        booking_location: {
          booking_duration: 90,
          booking_timestamp: "2021-12-06T16:05:00.000Z",
          box_id: 31,
          box_slot_id: 1495,
          venue_id: 5,
          linked_box_slot_id: 71,
        },
      });

    const getResponseAfterFirstUpdate = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponseAfterFirstUpdate.body.reference).toBe(reference);
    expect(getResponseAfterFirstUpdate.body.box_ids).toEqual([31, 30]);
    expect(getResponseAfterFirstUpdate.body.price).toEqual(6003);

    await server
      .patch(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        update: true,
        booking_guests: { guests_no: 20 },
        booking_location: {
          booking_duration: 90,
          booking_timestamp: "2021-12-06T16:20:00.000Z",
          box_id: 34,
          box_slot_id: 1515,
          venue_id: 5,
        },
      });

    const getResponseAfterSecondUpdate = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(getResponseAfterSecondUpdate.body.reference).toBe(reference);
    expect(getResponseAfterSecondUpdate.body.box_ids).toEqual([34]);
    expect(getResponseAfterSecondUpdate.body.price).toEqual(3001);
  });
});

describe("PATCH /bookings/", () => {
  it("when updating booking guests then return 200", async () => {
    const reference = "update-booking-guests";
    const token = jwt.sign({ sub: reference }, "secret");
    const response = await server
      .patch(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        booking_guests: {
          guests_no: 3,
        },
      })
      .expect(200);
    expect(response.body.booking_key).toEqual(reference);
    expect(response.body.expires_at).toBeDefined();

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    expect(getResponse.body).toEqual(
      generateGetResponsePayload({
        reference,
        guests_no: 3,
        start: convertLondonTimeToUTCString("2021-03-01 19:00:00"),
        end: convertLondonTimeToUTCString("2021-03-01 20:00:00"),
      })
    );
  });

  it("when updating booking notes and extras then return 200", async () => {
    const reference = "update-booking-extras";
    const token = jwt.sign({ sub: reference }, "secret");
    const response = await server
      .patch(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        booking_notes: "Some booking notes",
        booking_extras: "Some booking extras",
      })
      .expect(200);
    expect(response.body.booking_key).toEqual(reference);
    expect(response.body.expires_at).toBeDefined();

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    expect(getResponse.body).toEqual(
      generateGetResponsePayload({
        reference,
        start: convertLondonTimeToUTCString("2021-03-01 19:00:00"),
        end: convertLondonTimeToUTCString("2021-03-01 20:00:00"),
        notes: "Some booking notes",
        extras: "Some booking extras",
      })
    );

    await expectSQSMessageToBe(
      {
        booking: expect.objectContaining({
          reference,
          sessionId: reference,
          notes: "Some booking notes",
          extras: "Some booking extras",
        }),
        type: "drinks-confirmation",
      },
      reference
    );

    await expectDynamoDbItemToBe({
      id: reference,
      booking_ref: reference,
      start_time: "19:00",
      booking_duration: 60,
      date_booking: convertLondonTimeToUTCString("2021-03-01 19:00:00"),
      players: 1,
      extras: "Some booking extras",
    });
  });

  it("when updating booking location then return 200", async () => {
    const reference = "update-booking-time";
    const token = jwt.sign({ sub: reference }, "secret");
    const response = await server
      .patch(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        booking_location: {
          booking_timestamp: convertLondonTimeToUTCString(
            "2021-03-01 14:00:00"
          ),
          booking_duration: 60,
          box_id: 1,
          box_slot_id: 3,
          venue_id: 1,
        },
      })
      .expect(200);
    expect(response.body.booking_key).toEqual(reference);
    expect(response.body.expires_at).toBeDefined();

    const getResponse = await server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    expect(getResponse.body).toEqual(
      generateGetResponsePayload({
        reference,
        price: 1001,
        start: convertLondonTimeToUTCString("2021-03-01 14:00:00"),
        end: convertLondonTimeToUTCString("2021-03-01 15:00:00"),
        box_slot_start: convertLondonTimeToUTCString("2021-03-01 14:00:00"),
        box_slot_end: convertLondonTimeToUTCString("2021-03-01 15:00:00"),
      })
    );
  });
});

describe("GET /bookings/", () => {
  const reference = "paid-booking";
  const token = jwt.sign({ sub: reference }, "secret");

  it("when requesting booking that does not exist then return 400", () =>
    server
      .get(`${url}/wrong-booking`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, { code: "006", message: "booking not found" }));

  it("when requesting booking that exists associated to this session then return 200", () =>
    server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(
        200,
        generateGetResponsePayload({
          reference,
          status: "Paid",
        })
      ));
});

describe("getBookingPrice", () => {
  const reference = "get-booking-price";
  const token = jwt.sign({ sub: reference }, "secret");

  it("when requesting booking price then return booking", () =>
    server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(
        200,
        generateGetResponsePayload({
          reference,
          status: "Payment in progress",
          start: convertLondonTimeToUTCString("2021-01-11 18:00:00"),
          end: convertLondonTimeToUTCString("2021-01-11 19:00:00"),
        })
      ));
});

describe("confirmBooking", () => {
  describe.each`
    reference                     | start                    | end                      | boxSlotStart             | startTime  | duration | peakType      | price
    ${"confirm-booking"}          | ${"2021-01-18 18:00:00"} | ${"2021-01-18 19:00:00"} | ${"2021-01-18 18:05:00"} | ${"18:00"} | ${60}    | ${"peak"}     | ${2001}
    ${"confirm-booking-90m"}      | ${"2021-01-18 18:00:00"} | ${"2021-01-18 19:30:00"} | ${null}                  | ${"18:00"} | ${90}    | ${"peak"}     | ${3001}
    ${"confirm-booking-off-peak"} | ${"2021-01-18 14:00:00"} | ${"2021-01-18 15:30:00"} | ${null}                  | ${"14:00"} | ${90}    | ${"off-peak"} | ${1501}
    ${"confirm-booking-bst-2022"} | ${"2022-04-07 09:00:00"} | ${"2022-04-07 10:30:00"} | ${null}                  | ${"09:00"} | ${90}    | ${"off-peak"} | ${1501}
  `(
    "$reference",
    ({
      reference,
      start,
      end,
      boxSlotStart,
      startTime,
      duration,
      peakType,
      price,
    }) => {
      const token = jwt.sign({ sub: reference }, "secret");

      it("when requesting confirm booking then return booking", () =>
        server
          .get(`${url}/${reference}`)
          .set("Authorization", `Basic ${token}`)
          .set(commonHeaders)
          .expect(
            200,
            generateGetResponsePayload({
              reference,
              status: "Paid",
              start: convertLondonTimeToUTCString(start),
              end: convertLondonTimeToUTCString(end),
              box_slot_start: boxSlotStart
                ? convertLondonTimeToUTCString(boxSlotStart)
                : null,
              price,
            })
          ));

      it("should send message to queue", () =>
        expectSQSMessageToBe(
          {
            booking: expect.objectContaining({
              reference,
              sessionId: reference,
            }),
            type: "booking-confirmation",
          },
          reference
        ));

      it("should store booking details in dynamodb", () =>
        expectDynamoDbItemToBe({
          id: reference,
          booking_ref: reference,
          start_time: startTime,
          booking_duration: duration,
          date_booking: convertLondonTimeToUTCString(start),
          players: 1,
          peak: peakType,
          extras: "",
          packages: "",
          number_of_boxes: 1,
        }));
    }
  );

  it("should send a different confirmation email when a booking is made from the kiosk", () => {
    const reference = "walkin-confirmed-booking";
    const token = jwt.sign({ sub: reference }, "secret");

    server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(
        200,
        generateGetResponsePayload({
          reference,
          status: "Paid",
          source: "walkin",
        })
      );

    expectSQSMessageToBe(
      {
        booking: expect.objectContaining({
          reference,
          sessionId: reference,
        }),
        type: "apollo-confirmation",
      },
      reference
    );
  });
});

describe("cancelBooking", () => {
  const reference = "cancel-booking";
  const token = jwt.sign({ sub: reference }, "secret");

  it("when requesting cancelled price then return booking", () =>
    server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(
        200,
        generateGetResponsePayload({
          reference,
          price: 1501,
          status: "Cancelled",
          start: convertLondonTimeToUTCString("2021-03-02 08:00:00"),
          end: convertLondonTimeToUTCString("2021-03-02 09:30:00"),
        })
      ));
});
