/* eslint-disable arrow-body-style */
const request = require("supertest");
const { addDays, subDays, format } = require("date-fns");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const token = jwt.sign({ sub: "any-token" }, "secret");

const cleanDb = async (id) => {
  await server
    .delete(`/dev/schedule/type/${id}`)
    .set("Authorization", `Basic ${token}`)
    .set(commonHeaders)
    .expect(204);
};

const todayDate = format(new Date(), "yyyy-MM-dd");
const tomorrowDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
const yesterdayDate = format(subDays(new Date(), 1), "yyyy-MM-dd");

describe("POST /apply/schedule/{venue}/{schedule}", () => {
  const url = ({
    venue = "test-venue-template",
    schedule = "test-schedule-template",
  } = {}) => {
    return `/dev/apply/schedule/${venue}/${schedule}`;
  };

  const hook = () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  it("should return a 404 when applying with a venue that doesn't exist", () => {
    return server
      .post(url({ venue: "not-a-venue", schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "020",
        message: "unknown venue",
      });
  });

  it("should return a 404 when applying with a schedule that doesn't belong to venue", () => {
    return server
      .post(url({ venue: "test-venue-template", schedule: "test-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "023",
        message: "this schedule is not associated to the venue",
      });
  });

  it("should return a 404 when applying with a schedule that doesn't exist", () => {
    return server
      .post(url({ venue: "test-venue-template", schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("should return 204 when applying with correct payload and existing venue", () => {
    return hook().expect(204);
  });
});

describe("GET /schedule/{venue}/{date}", () => {
  const url = ({ venue = "test-venue-template", date = "2022-03-15" } = {}) => {
    return `/dev/schedule/${venue}/${date}`;
  };

  it("should return a 404 when fetching with a venue that doesn't exist", () => {
    return server
      .get(url({ venue: "not-a-venue", date: "2022-03-15" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "020",
        message: "unknown venue",
      });
  });

  it("should return a 404 when fetching with a invalid date value", () => {
    return server
      .get(url({ venue: "test-venue-template", date: "2022-12" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "invalid parameters",
      });
  });

  it("should return a 204 when a suitable schedule is not found", () => {
    return server
      .get(url({ venue: "test-venue-template", date: "2022-04-25" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  });

  it("should return 200 when fetching with correct venue and date", () => {
    return server
      .get(url({ venue: "test-venue-schedule", date: "2021-01-05" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200, {
        id: 27,
        name: "Test venue - schedule Tuesday",
        code: "test-venue-schedule-tuesday",
        from: "2021-01-04",
        to: "2021-06-07",
        order: 1,
        openTime: {
          id: 22,
          start: "11:00:00",
          end: "24:30:00",
        },
        prices: [
          {
            id: 14,
            start: "11:00:00",
            end: "24:30:00",
            type: "off-peak",
            price: 10.01,
            order: 1,
          },
        ],
        recurrence: {
          id: 22,
          recurrenceType: "weekly",
          dayOfWeek: [2],
          separationCount: 1,
          weekOfMonth: [],
          dayOfMonth: [],
          monthOfYear: [],
        },
        boxes: [
          {
            id: 25,
            name: "1",
            section: "Midfield Bar",
            boxSlots: [
              {
                id: 1471,
                duration: 90,
                start: "11:00:00",
                BoxSlotLinks: [],
              },
              {
                id: 1472,
                duration: 60,
                start: "12:40:00",
                BoxSlotLinks: [],
              },
              {
                id: 1473,
                duration: 90,
                start: "13:50:00",
                BoxSlotLinks: [],
              },
              {
                id: 1474,
                duration: 60,
                start: "16:40:00",
                BoxSlotLinks: [],
              },
            ],
          },
        ],
      });
  });
});

describe("POST /schedule", () => {
  let scheduleId;
  const url = "/dev/schedule";

  const venueCode = "test-venue";
  const name = "Create Test Schedule";
  const to = format(addDays(new Date(todayDate), 15), "yyyy-MM-dd");
  const order = 1;
  const openTime = {
    start: "09:00:00",
    end: "23:59:00",
  };
  const prices = [
    {
      start: "09:00:00",
      type: "off-peak",
      end: "15:59:00",
      price: 1001,
    },
    {
      start: "16:00:00",
      type: "peak",
      end: "23:59:00",
      price: 2001,
    },
  ];
  const recurrence = {
    recurrence_type: "monthly",
    separation_count: 2,
    day_of_week: [],
    week_of_month: [],
    day_of_month: [1],
    month_of_year: [],
  };
  it("should return 400 if unknown venue code is provided", async () => {
    await server
      .post(`${url}/udefined`)
      .send({ name, from: todayDate, to, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "unknown venue",
      });
  });

  it("should return 400 if no name is provided", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({ from: todayDate, to, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "name is a required field",
      });
  });
  it("should return 400 if 'from' and 'to' fields are not provided", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({ name, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"from" is a required field, "to" is a required field',
      });
  });
  it("should return 400 if no open time is provided", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({ name, from: todayDate, to, order, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "openTime is a required field",
      });
  });

  it("should return 400 if open time 'start' and 'end' are in wrong format", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: todayDate,
        to,
        order,
        prices,
        openTime: { start: "08:00", end: "22:00" },
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message:
          "open time start value must be in the format HH:mm:ss, open time end value must be in the format HH:mm:ss",
      });
  });
  it("should return 400 if price fields are wrong", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: todayDate,
        to,
        order,
        prices: [
          {
            start: "09:00",
            type: 10,
            end: "15:59",
            price: "10.01",
            order: "1",
          },
        ],
        openTime,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message:
          "peak start time must be in the format HH:mm:ss, peak end time must be in the format HH:mm:ss, price must be an integer, order must be an integer, type must be a string",
      });
  });
  it("should return 400 if price is not provided", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: todayDate,
        to,
        order,
        openTime,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "price values are required",
      });
  });
  it("should return 400 if 'from' and 'to' fields are wrong", async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: "worng-format",
        to: "wrong-format",
        order,
        prices,
        openTime,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"from" is invalid date, "to" is invalid date',
      });
  });

  it('should return 400 if "to" date is less than "from" date', async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: todayDate,
        to: yesterdayDate,
        order,
        openTime,
        prices,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"to" date cannot be before "from" date',
      });
  });

  it('should return 400 if a wrong date is passed to "from" date', async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({ name, from: "wrong-date", to, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"from" is invalid date',
      });
  });

  it('should return 400 if date passed to "from" date is before today', async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: yesterdayDate,
        to: yesterdayDate,
        order,
        openTime,
        prices,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"from" date cannot be before today',
      });
  });

  it('should return 400 if a wrong date is passed for "to" date', async () => {
    await server
      .post(`${url}/${venueCode}`)
      .send({
        name,
        from: todayDate,
        to: "wrong-date",
        order,
        openTime,
        prices,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: '"to" is invalid date',
      });
  });

  it("should return 200 when a new schedule is created", async () => {
    const response = await server
      .post(`${url}/${venueCode}`)
      .send({ name, from: todayDate, to, order, openTime, prices, recurrence })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    scheduleId = response.body.id;
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
          start: "09:00:00",
          type: "off-peak",
          end: "15:59:00",
          price: 1001,
          order: 1,
        },
        {
          id: expect.any(Number),
          start: "16:00:00",
          type: "peak",
          end: "23:59:00",
          price: 2001,
          order: 2,
        },
      ],
      recurrence: {
        id: expect.any(Number),
        recurrenceType: expect.any(String),
        dayOfWeek: expect.any(Array),
        separationCount: expect.any(Number),
        weekOfMonth: expect.any(Array),
        dayOfMonth: expect.any(Array),
        monthOfYear: expect.any(Array),
      },
    });
    if (scheduleId) {
      await cleanDb(scheduleId);
    }
  });

  it("should return 200 when a new schedule without recurrence is created", async () => {
    const response = await server
      .post(`${url}/${venueCode}`)
      .send({ name, from: todayDate, to, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    scheduleId = response.body.id;
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
      prices: expect.any(Array),
    });
    if (scheduleId) {
      await cleanDb(scheduleId);
    }
  });
  it("should return 400 when duplicate schedule is created", async () => {
    const response = await server
      .post(`${url}/${venueCode}`)
      .send({
        name: "Test venue Monday",
        from: todayDate,
        to,
        order,
        openTime,
        prices,
        recurrence,
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, { code: "019", message: "schedule name already exists" });
    scheduleId = response.body.id;
  });
});

describe("PATCH /schedule/type/{id}", () => {
  let scheduleId;

  const postPayload = {
    name: "test-name-1",
    from: todayDate,
    to: tomorrowDate,
    appliedDate: "[]",
    order: 1,
    openTime: {
      start: "16:00:00",
      end: "23:50:00",
    },
    prices: [
      {
        type: "peak",
        price: 1001,
        start: "19:00:00",
        end: "20:00:00",
      },
    ],
  };
  const url = `/dev/schedule/type`;

  const checkUrl = ({ venue = "test-venue", date = todayDate } = {}) => {
    return `/dev/schedule/${venue}/${date}`;
  };

  const patchPayload = {
    name: "test-patch",
    from: todayDate,
    to: tomorrowDate,
  };

  afterAll(async () => {
    await server
      .delete(`/dev/schedule/type/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  });

  beforeAll(async () => {
    const response = await server
      .post("/dev/schedule/test-venue")
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(postPayload)
      .expect(200);
    scheduleId = response.body.id;
  });

  it("when updating schedule 'name' then return 204 and don't clean applied dates", async () => {
    await server
      .post(`/dev/apply/schedule/test-venue/test-name-1`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send()
      .expect(204, "");
    await server
      .patch(`${url}/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(patchPayload)
      .expect(204, "");
    await server
      .get(checkUrl())
      .set(commonHeaders)
      .set("Authorization", `Basic ${token}`)
      .expect(200);
  });

  it('when updating schedule with "from" date today and "to" date in future return 204 and clean applied dates', async () => {
    await server
      .patch(`${url}/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, from: tomorrowDate })
      .expect(204, "");

    await server
      .get(checkUrl())
      .set(commonHeaders)
      .set("Authorization", `Basic ${token}`)
      .expect(204);
  });

  it("when updating schedule with the wrong scheduleId", async () => {
    await server
      .patch(`/dev/schedule/type/wrong-id`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(patchPayload)
      .expect(400, { code: "021", message: "unknown schedule" });
  });

  it("when updating schedule without schedule id", async () => {
    await server
      .patch(`/dev/schedule/type/`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(patchPayload)
      .expect(404);
  });
  it("when updating schedule without 'name' field", async () => {
    await server
      .patch(`/dev/schedule/type/40`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ from: todayDate, to: todayDate })
      .expect(400, {
        code: "019",
        message: '"name" is required field for update',
      });
  });
  it("when updating schedule without 'from' field", async () => {
    await server
      .patch(`/dev/schedule/type/40`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ name: "some name", to: todayDate })
      .expect(400, {
        code: "019",
        message: '"from" is required field for update',
      });
  });
  it("when updating schedule without 'to' field", async () => {
    await server
      .patch(`/dev/schedule/type/40`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ from: todayDate, name: "some name" })
      .expect(400, {
        code: "019",
        message: '"to" is required field for update',
      });
  });
  it('when updating schedule with wrong "from" input', async () => {
    await server
      .patch(`/dev/schedule/type/${scheduleId}`)
      .send()
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, from: "wrong-date" })
      .expect(400, { code: "019", message: '"from" is invalid date' });
  });
  it('when updating schedule with "from" date before today', async () => {
    await server
      .patch(`/dev/schedule/type/${scheduleId}`)
      .send()
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, from: yesterdayDate })
      .expect(400, {
        code: "019",
        message: '"from" date cannot be before today',
      });
  });
  it('when updating schedule with wrong "to" input', async () => {
    await server
      .patch(`/dev/schedule/type/${scheduleId}`)
      .send()
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, to: "wrong-date" })
      .expect(400, {
        code: "019",
        message: '"to" is invalid date',
      });
  });
  it('when updating schedule with "to" date before "from" date', async () => {
    await server
      .patch(`/dev/schedule/type/${scheduleId}`)
      .send()
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, from: todayDate, to: yesterdayDate })
      .expect(400, {
        code: "019",
        message: '"to" date cannot be before "from" date',
      });
  });
  it('when updating schedule with "name" that already exist', async () => {
    await server
      .patch(`/dev/schedule/type/${scheduleId}`)
      .send()
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, name: "Test venue Monday" })
      .expect(400, {
        code: "025",
        message: "schedule name already exists",
      });
  });
});

describe("DELETE /schedule/type/{id}", () => {
  let id;
  const url = `/dev/schedule/type`;
  const payload = {
    name: "test-name-1",
    from: todayDate,
    to: tomorrowDate,
    appliedDate: "[]",
    order: 1,
    openTime: {
      start: "16:00:00",
      end: "23:50:00",
    },
    prices: [
      {
        type: "peak",
        price: 1001,
        start: "19:00:00",
        end: "20:00:00",
      },
    ],
  };

  beforeAll(async () => {
    const response = await server
      .post(`/dev/schedule/test-venue`)
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    id = response.body.id;
  });

  it("should return 404 when shcedule doesn't exist", async () => {
    await server.delete(`${url}/1000000`).set(commonHeaders).expect(404, {
      code: "021",
      message: "unknown schedule",
    });
  });

  it("should return 204 when delete by id is successfully", async () => {
    await server.delete(`${url}/${id}`).set(commonHeaders).expect(204, "");
  });
});

describe("GET /schedule/filter/{venueId}", () => {
  const url = `/dev/schedule/filter/`;

  it("when no venue specified then expect 404", () => {
    return server.get(url).set(commonHeaders).expect(404);
  });

  it("when unknown venue then expect 404", () => {
    return server.get(`${url}2000`).set(commonHeaders).expect(404, {
      code: "020",
      message: "unknown venue",
    });
  });
  it("when empty venue then expect 200", () => {
    return server.get(`${url}7`).set(commonHeaders).expect(200, []);
  });

  it("when requesting filtered schedule to Test Venue then expect 200", () => {
    const boxSlotMatcher = {
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      order: expect.any(Number),
    };
    server
      .get(`${url}1`)
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        const { length } = response.body;

        expect(response.statusCode).toMatchInlineSnapshot(`200`);
        expect(length).toBe(6);
        expect(response.body).toMatchSnapshot({
          boxSlots: new Array(length).fill(boxSlotMatcher),
        });
      });
  });
});

describe("POST /apply/schedule/avalability/{venue}/{schedule}", () => {
  const url = ({
    venue = "test-venue",
    schedule = "test-venue-sunday",
  } = {}) => {
    return `/dev/apply/schedule/availability/${venue}/${schedule}`;
  };

  const urlPost = "/dev/schedule/";
  const payload = {
    name: "Test Availability",
    from: "2023-12-25",
    to: "2023-12-26",
    appliedDate: "[]",
    order: 1,
    openTime: {
      start: "16:00:00",
      end: "23:50:00",
    },
    prices: [
      {
        type: "peak",
        price: 1001,
        start: "19:00:00",
        end: "20:00:00",
      },
    ],
  };

  it("should return a 404 when checked with a venue that doesn't exist", () => {
    return server
      .post(url({ venue: "not-a-venue", schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "020",
        message: "unknown venue",
      });
  });

  it("should return 404 when checked with a schedule that doesn't exist", () => {
    return server
      .post(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("should return 200 when checked on date with 2 conflicted schedules", async () => {
    const response = await server
      .post(`${urlPost}test-venue`)
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleCode = response.body.code;
    const scheduleId = response.body.id;

    server
      .post(url({ schedule: scheduleCode }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200, {
        isAbleToApply: false,
        conflictedSchedules: [
          {
            id: 6,
            name: "Test venue Monday",
            code: "test-venue-monday",
            conflicted_dates: ["2023-12-25T00:00:00.000Z"],
            recurrene: 1,
          },
          {
            id: 11,
            name: "Test venue Tuesday",
            code: "test-venue-tuesday",
            conflicted_dates: ["2023-12-26T00:00:00.000Z"],
            recurrene: 2,
          },
        ],
      });

    await cleanDb(scheduleId);
  });

  it("should return a 200 when checked on date with 1 conflicted schedule", async () => {
    const response = await server
      .post(`${urlPost}test-venue`)
      .send({
        ...payload,
        from: "2023-12-31",
        to: "2023-12-31",
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleCode = response.body.code;
    const scheduleId = response.body.id;

    server
      .post(url({ schedule: scheduleCode }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200, {
        isAbleToApply: false,
        conflictedSchedules: [
          {
            id: 10,
            name: "Test venue Sunday",
            code: "test-venue-sunday",
            conflicted_dates: ["2023-12-31T00:00:00.000Z"],
            recurrene: 5,
          },
        ],
      });

    await cleanDb(scheduleId);
  });

  it("should return 200 when checked on date without conflicted schedule", () => {
    return server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200, {
        isAbleToApply: true,
      });
  });
});

describe("GET /schedule/type/{id}", () => {
  const url = `/dev/schedule/type/`;

  const urlPost = "/dev/schedule/test-venue";
  const payload = {
    name: "Test Get By Id",
    from: todayDate,
    to: todayDate,
    appliedDate: "[]",
    order: 1,
    openTime: {
      start: "16:00:00",
      end: "23:50:00",
    },
    prices: [
      {
        type: "peak",
        price: 10.01,
        start: "19:00:00",
        end: "20:00:00",
      },
    ],
  };

  it("when no schedule specified then expect 404", () => {
    return server.get(url).set(commonHeaders).expect(404);
  });
  it("when unknown schedule then expect 404", () => {
    return server.get(`${url}2000`).set(commonHeaders).expect(404, {
      code: "021",
      message: "unknown schedule",
    });
  });

  it("when requesting filtered schedule to Test Schedule Template then expect 200", () => {
    const scheduleMatcher = {
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
      prices: expect.any(Array),
      recurrence: {
        id: expect.any(Number),
        recurrenceType: expect.any(String),
        dayOfWeek: expect.any(Array),
        separationCount: expect.any(Number),
        weekOfMonth: expect.any(Array),
        dayOfMonth: expect.any(Array),
        monthOfYear: expect.any(Array),
      },
    };
    server
      .get(`${url}38`)
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        const { length } = response.body;

        expect(response.statusCode).toMatchInlineSnapshot(`200`);
        expect(response.body).toMatchSnapshot({
          schedules: new Array(length).fill(scheduleMatcher),
        });
      });
  });
  it("should return 200 when filtred schedule without recurrence and box slots", async () => {
    const response = await server
      .post(urlPost)
      .send(payload)
      .set(commonHeaders)
      .expect(200);

    const scheduleId = response.body.id;

    const result = await server
      .get(`${url}${scheduleId}`)
      .set(commonHeaders)
      .expect(200);

    expect(result.body).toEqual({
      id: expect.any(Number),
      name: "Test Get By Id",
      code: "test-get-by-id",
      from: todayDate,
      to: todayDate,
      order: 1,
      openTime: { id: expect.any(Number), start: "16:00:00", end: "23:50:00" },
      prices: [
        {
          id: expect.any(Number),
          start: "19:00:00",
          end: "20:00:00",
          type: "peak",
          price: 10.01,
          order: 1,
        },
      ],
      recurrence: {},
      boxes: [],
    });

    await cleanDb(scheduleId);
  });
});

// describe("PATCH /schedule/", () => {
//   const url = `/dev/schedule`;

//   it("when changed schedules order without scheduleIds", async () => {
//     await server
//       .patch(url)
//       .set("Authorization", `Basic ${token}`)
//       .set(commonHeaders)
//       .send({ scheduleIds: [] })
//       .expect(400, {
//         code: "019",
//         message: "should be at least two schedule ids",
//       });
//   });

//   it("when changed schedules order with empty data", async () => {
//     await server
//       .patch(url)
//       .set("Authorization", `Basic ${token}`)
//       .set(commonHeaders)
//       .send({})
//       .expect(400, {
//         code: "019",
//         message: "should be at least two schedule ids",
//       });
//   });

//   it("when changed schedules order with one schedule id", async () => {
//     await server
//       .patch(url)
//       .set("Authorization", `Basic ${token}`)
//       .set(commonHeaders)
//       .send({ scheduleIds: [1] })
//       .expect(400, {
//         code: "019",
//         message: "should be at least two schedule ids",
//       });
//   });

//   it("when changed schedules order with schedule that doesn't exist", async () => {
//     await server
//       .patch(url)
//       .set("Authorization", `Basic ${token}`)
//       .set(commonHeaders)
//       .send({ scheduleIds: [2000, 1, 2] })
//       .expect(400, { code: "021", message: "unknown schedule" });
//   });

//   it("when changed schedules order then return 200", async () => {
//     await server
//       .patch(url)
//       .set("Authorization", `Basic ${token}`)
//       .set(commonHeaders)
//       .send({ scheduleIds: [39, 38] })
//       .expect(200, [
//         {
//           id: 39,
//           name: "Test Venue Schedule addition test",
//           code: "test-venue-schedule-addition-test",
//           order: 2,
//         },
//         {
//           id: 38,
//           name: "Test Schedule Template",
//           code: "test-schedule-template",
//           order: 1,
//         },
//       ]);
//   });
// });

describe("POST /schedule/type/{id}", () => {
  const url = `/dev/schedule/type`;
  const payload = {
    name: "testing-name-1",
  };

  it("should return 400 if unknown schedule Id is provided", async () => {
    await server
      .post(`${url}/2000`)
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("should return 400 if name is not provided", async () => {
    await server
      .post(`${url}/20`)
      .send({})
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "name is a required field",
      });
  });
  it("Should return 400 if schedule name already exist", async () => {
    await server
      .post(`${url}/20`)
      .send({ name: "Test Schedule" })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "025",
        message: "schedule name already exists",
      });
  });
  it("Should return 200 when schedule is successfully copied", async () => {
    const response = await server
      .post(`${url}/36`)
      .send({ name: "new schedule test name" })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleId = response.body.id;
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      order: expect.any(Number),
    });
    if (scheduleId) {
      await cleanDb(scheduleId);
    }
  });
  it("Should return 200 when schedule is successfully copied and order is +1", async () => {
    const response = await server
      .post(`${url}/36`)
      .send({ name: "new schedule test name" })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleId = response.body.id;
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      order: 2,
    });
    if (scheduleId) {
      await cleanDb(scheduleId);
    }
  });
  it("should return 200 when coppied schedule with recurrence for all day of week", async () => {
    const response = await server
      .post("/dev/schedule/test-venue")
      .send({
        name: "Test Schedule with all weekday recurrence",
        from: todayDate,
        to: todayDate,
        order: 1,
        openTime: {
          start: "09:00:00",
          end: "23:59:00",
        },
        prices: [
          {
            start: "09:00:00",
            type: "off-peak",
            end: "15:59:00",
            price: 1001,
          },
          {
            start: "16:00:00",
            type: "peak",
            end: "23:59:00",
            price: 2001,
          },
        ],
        recurrence: {
          recurrence_type: "weekly",
          separation_count: 1,
          day_of_week: [1, 2, 3, 4, 5, 6, 7],
          week_of_month: [],
          day_of_month: [],
          month_of_year: [],
        },
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleId = response.body.id;
    const copyResponse = await server
      .post(`${url}/${scheduleId}`)
      .send({ name: "new schedule test name" })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const scheduleIdCopy = copyResponse.body.id;
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
      order: expect.any(Number),
    });
    if (scheduleId) {
      await cleanDb(scheduleId);
    }

    if (scheduleIdCopy) {
      await cleanDb(scheduleIdCopy);
    }
  });
});
