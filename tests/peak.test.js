/* eslint-disable arrow-body-style */
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { format } = require("date-fns");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const token = jwt.sign({ sub: "any-token" }, "secret");
describe("POST /peakTimes/{schedule}", () => {
  const payload = {
    start: "07:00",
    end: "08:59",
    type: "peak",
    price: 1234,
  };

  const arrayPayload = [
    {
      start: "06:00",
      end: "06:59",
      type: "off-peak",
      price: 1001,
    },
    {
      start: "07:00",
      end: "07:59",
      type: "peak",
      price: 2001,
    },
  ];
  const url = ({ schedule = "test-schedule-template" } = {}) => {
    return `/dev/peakTimes/${schedule}`;
  };

  const hook = () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  const cleanDb = async (schedule, peakId) => {
    await server
      .delete(`/dev/peakTimes/${schedule}`)
      .send({ id: peakId })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  };
  const scheduleCode = "test-venue-thursday";

  it("should return a 400 an invalid start time format is provided", () => {
    return hook()
      .send({ ...payload, start: 1234 })
      .expect(400, {
        code: "007",
        message: "start time must be in the format HH:mm",
      });
  });

  it("should return a 400 an invalid start time format is provided in array of peak object", () => {
    return hook()
      .send([{ ...arrayPayload[0], start: 1234 }, { ...arrayPayload[1] }])
      .expect(400, {
        code: "007",
        message: "start time must be in the format HH:mm",
      });
  });
  it("should return a 400 an invalid end time format is provided", () => {
    return hook()
      .send({ ...payload, end: 1234 })
      .expect(400, {
        code: "007",
        message: "end time must be in the format HH:mm",
      });
  });

  it("should return a 400 an invalid end time format is provided in array of peak object", () => {
    return hook()
      .send([{ ...arrayPayload[0], end: 1234 }, { ...arrayPayload[1] }])
      .expect(400, {
        code: "007",
        message: "end time must be in the format HH:mm",
      });
  });

  it("should return a 400 an invalid price format is provided", () => {
    return hook()
      .send({ ...payload, price: "1234" })
      .expect(400, {
        code: "007",
        message: "price must be an integer",
      });
  });

  it("should return a 400 an invalid price format is provided in array of peak object", () => {
    return hook()
      .send([{ ...arrayPayload[0], price: "1234" }, { ...arrayPayload[1] }])
      .expect(400, {
        code: "007",
        message: "price must be an integer",
      });
  });

  it("should return a 400 an invalid type format is provided", () => {
    return hook()
      .send({ ...payload, type: 1234 })
      .expect(400, {
        code: "007",
        message: "type must be a string",
      });
  });

  it("should return a 400 an invalid type format is provided in array of peak object", () => {
    return hook()
      .send([{ ...arrayPayload[0], type: 1234 }, { ...arrayPayload[1] }])
      .expect(400, {
        code: "007",
        message: "type must be a string",
      });
  });

  it("should return a 404 when creating with a schedule that doesn't exist", () => {
    return server
      .post(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(payload)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("should return a 400 when create price that overlapped existed price by end time", () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...payload, end: "15:00" })
      .expect(400, {
        code: "012",
        message: "peak time already exists",
      });
  });

  it("should return a 400 when create price that overlapped existed price by end time in array of peak object", () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send([{ ...arrayPayload[0], end: "15:00" }, { ...arrayPayload[1] }])
      .expect(400, {
        code: "012",
        message: "peak time already exists",
      });
  });

  it("should return a 400 when create price which time inside existed price", () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...payload, start: "19:00", end: "20:00" })
      .expect(400, {
        code: "012",
        message: "peak time already exists",
      });
  });

  it("should return a 400 when create price which time inside existed price in array of peak object", () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send([
        { ...arrayPayload[0], start: "19:00", end: "20:00" },
        { ...arrayPayload[1] },
      ])
      .expect(400, {
        code: "012",
        message: "peak time already exists",
      });
  });

  it("should return a 400 when an invalid order format is provided", () => {
    return hook()
      .send({ ...payload, order: "wrong-format" })
      .expect(400, {
        code: "007",
        message: "order must be an integer",
      });
  });

  it("should return 200 when creating with correct payload and existing schedule", async () => {
    const response = await server
      .post(url({ schedule: "test-venue-thursday" }))
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const { id } = response.body;
    expect(response.body).toMatchObject({
      id: expect.anything(),
      start: expect.anything(),
      end: expect.anything(),
      type: expect.anything(),
      price: expect.anything(),
    });
    if (id) {
      await cleanDb(scheduleCode, id);
    }
  });

  it("should return 200 when creating with correct payload and existing schedule in array of peak object", async () => {
    const response = await server
      .post(url({ schedule: "test-venue-thursday" }))
      .send(arrayPayload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const result = response.body;
    expect(response.body).toMatchObject([
      {
        id: expect.anything(),
        start: expect.anything(),
        end: expect.anything(),
        type: expect.anything(),
        price: expect.anything(),
      },
      {
        id: expect.anything(),
        start: expect.anything(),
        end: expect.anything(),
        type: expect.anything(),
        price: expect.anything(),
      },
    ]);
    if (result.length) {
      result.map(async (element) => {
        await cleanDb(scheduleCode, element.id);
      });
    }
  });
});

describe("PATCH /peakTimes/{schedule}", () => {
  const payload = {
    id: 23,
    start: "16:00",
    end: "19:00",
    price: 1234,
    type: "peak",
  };
  const arrayPayload = [
    {
      id: 23,
      start: "16:00",
      end: "19:00",
      price: 1234,
      type: "peak",
    },
  ];
  const url = ({ schedule = "test-venue-monday" } = {}) => {
    return `/dev/peakTimes/${schedule}`;
  };

  const hook = () => {
    return server
      .patch(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  afterAll(async () => {
    await hook()
      .send({ ...payload, price: 20.01 })
      .expect(204, "");
  });

  it("should return a 400 when id is not provided", () => {
    return hook().send({}).expect(400, {
      code: "007",
      message: "id is required field",
    });
  });
  it("should return a 400 an invalid id format is provided", () => {
    return hook()
      .send({ ...payload, id: "wrong-format" })
      .expect(400, {
        code: "007",
        message: "id must be an integer",
      });
  });

  it("should return a 400 an invalid start time format is provided", () => {
    return hook()
      .send({ ...payload, start: 1234 })
      .expect(400, {
        code: "007",
        message: "start time must be in the format HH:mm",
      });
  });

  it("should return a 400 an invalid end time format is provided", () => {
    return hook()
      .send({ ...payload, end: 1234 })
      .expect(400, {
        code: "007",
        message: "end time must be in the format HH:mm",
      });
  });

  it("should return a 400 an invalid price format is provided", () => {
    return hook()
      .send({ ...payload, price: "1234" })
      .expect(400, {
        code: "007",
        message: "price must be an integer",
      });
  });

  it("should return a 404 when patching with a schedule that doesn't exist", () => {
    return server
      .patch(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(payload)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("should return 204 when patching with correct payload and existing schedule", () => {
    return hook().send(payload).expect(204, "");
  });

  it("should return 204 when patching with correct array payload and existing schedule", () => {
    return hook().send(arrayPayload).expect(204, "");
  });
});

describe("DELETE /peakTimes/{schedule}", () => {
  const url = ({ schedule = "second-schedule-overlap-test" } = {}) => {
    return `/dev/peakTimes/${schedule}`;
  };

  const hook = () => {
    return server
      .delete(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  const hookPost = () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  const payload = {
    start: "05:00",
    end: "05:59",
    type: "peak",
    price: 12.34,
  };

  it("should return a 400 an invalid schedule code is provided", () => {
    return server
      .delete(url({ schedule: "some-wrong-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });
  it("should return a 400 when id is not provided", () => {
    return server
      .delete(url({ schedule: "test-venue-thursday" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        start: "07:00",
        end: "08:59",
        type: "peak",
        price: 1234,
      })
      .expect(400, {
        code: "007",
        message: "id is required field",
      });
  });

  it("should return a 400 when id is not provided in the array of peaks", () => {
    return server
      .delete(url({ schedule: "test-venue-thursday" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send([
        {
          start: "07:00",
          end: "08:59",
          type: "peak",
          price: 1234,
        },
      ])
      .expect(400, {
        code: "007",
        message: "id is required field",
      });
  });

  it("should return a 400 when not existed price id is provided", () => {
    return server
      .delete(url({ schedule: "test-venue-thursday" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send([
        {
          id: 5000000,
        },
      ])
      .expect(400, {
        code: "028",
        message: "unknown peak time",
      });
  });

  it("should return a 400 when price id from foreign schedule is provided", () => {
    return server
      .delete(url({ schedule: "test-venue-thursday" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send([
        {
          id: 1,
        },
      ])
      .expect(400, {
        code: "028",
        message: "unknown peak time",
      });
  });

  it("should return a 204 if delete was successful", async () => {
    const response = await hookPost().send(payload).expect(200);
    const { id } = response.body;

    await hook().send({ id }).expect(204, "");
  });

  it("should return a 204 if delete was successful in array of peak object", async () => {
    const response = await hookPost().send(payload).expect(200);
    const { id } = response.body;

    await hook().send([{ id }]).expect(204, "");
  });
});

describe("PATCH /peakTimes/{schedule} changing order", () => {
  let scheduleId;

  const todayDate = format(new Date(), "yyyy-MM-dd");

  const name = "Schedule price test";
  const openTime = {
    start: "09:00:00",
    end: "23:59:00",
  };
  const prices = [
    {
      start: "09:00:00",
      type: "off-peak",
      end: "09:59:00",
      price: 1001,
    },
    {
      start: "10:00:00",
      type: "peak",
      end: "10:59:00",
      price: 2001,
    },
    {
      start: "11:00:00",
      type: "super-peak",
      end: "11:59:00",
      price: 3001,
    },
  ];

  afterAll(async () => {
    await server
      .delete(`/dev/schedule/type/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  });

  it("should return 204 when patching with correct payload and existing schedule", async () => {
    const responseCreate = await server
      .post("/dev/schedule/test-venue-template")
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ name, openTime, prices, from: todayDate, to: todayDate })
      .expect(200);
    expect(responseCreate.body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      from: expect.any(String),
      to: expect.any(String),
      order: expect.any(Number),
      openTime: {
        id: expect.any(Number),
        start: expect.any(String),
        end: expect.any(String),
      },
      prices: [
        {
          id: expect.any(Number),
          start: "09:00:00",
          type: "off-peak",
          end: "09:59:00",
          price: 1001,
          order: 1,
        },
        {
          id: expect.any(Number),
          start: "10:00:00",
          type: "peak",
          end: "10:59:00",
          price: 2001,
          order: 2,
        },
        {
          id: expect.any(Number),
          start: "11:00:00",
          type: "super-peak",
          end: "11:59:00",
          price: 3001,
          order: 3,
        },
      ],
    });

    scheduleId = responseCreate.body.id;
    /**
     * function to revert order for prices, and cahnge format for "start", "and" date to "HH:mm"
     */
    const reversedPrice = responseCreate.body.prices
      .map((price) => {
        return {
          id: price.id,
          start: price.start.split(":").slice(0, 2).join(":"),
          end: price.end.split(":").slice(0, 2).join(":"),
          price: price.price,
          type: price.type,
        };
      })
      .reverse();
    /**
     * patch prices to obtain price list with revert order comparing with origin
     */
    await server
      .patch(`/dev/peakTimes/schedule-price-test`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(reversedPrice)
      .expect(204);

    /**
     * check price after puch complete, should receive price in revert oorder
     */
    const response = await server
      .get(`/dev/schedule/type/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      from: expect.any(String),
      to: expect.any(String),
      order: expect.any(Number),
      openTime: {
        id: expect.any(Number),
        start: expect.any(String),
        end: expect.any(String),
      },
      prices: [
        {
          id: expect.any(Number),
          start: "11:00:00",
          type: "super-peak",
          end: "11:59:00",
          price: 3001,
          order: 1,
        },
        {
          id: expect.any(Number),
          start: "10:00:00",
          type: "peak",
          end: "10:59:00",
          price: 2001,
          order: 2,
        },
        {
          id: expect.any(Number),
          start: "09:00:00",
          type: "off-peak",
          end: "09:59:00",
          price: 1001,
          order: 3,
        },
      ],
    });
  });
});
