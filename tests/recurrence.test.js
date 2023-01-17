const request = require("supertest");
const jwt = require("jsonwebtoken");
const { format } = require("date-fns");
const { commonHeaders } = require("./config");

const { calculateRecurrenceDates } = require("../src/services/recurrence");

const server = request("http://localhost:3000");
const todayDate = format(new Date(), "yyyy-MM-dd");

describe("POST /recurrences/{schedule}", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");
  let scheduleId;
  let scheduleCode;

  const schedulePayload = {
    name: "Schedule without recurrence",
    from: todayDate,
    to: todayDate,
    appliedDate: "[]",
    openTime: {
      start: "19:00:00",
      end: "20:00:00",
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

  const url = ({ schedule = scheduleCode } = {}) =>
    `/dev/recurrences/${schedule}`;

  const payload = {
    recurrence_type: "weekly",
    day_of_week: [1, 2],
    separation_count: 1,
    week_of_month: [],
    day_of_month: [],
    month_of_year: [],
  };

  const hook = () =>
    server
      .post(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);

  beforeAll(async () => {
    const response = await server
      .post("/dev/schedule/test-venue-template")
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(schedulePayload)
      .expect(200);
    scheduleId = response.body.id;
    scheduleCode = response.body.code;
  });

  afterAll(async () => {
    await server
      .delete(`/dev/schedule/type/${scheduleId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  });

  it("should return a 404 when an invalid schedule is provided", () =>
    server
      .post(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...payload })
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      }));

  it("should return a 404 when recurrence already exist on schedule", () =>
    server
      .post(url({ schedule: "test-schedule-template" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...payload })
      .expect(400, {
        code: "026",
        message: "recurrence already exists",
      }));

  it("should return a 400 an invalid recurrence_type is provided", () =>
    hook()
      .send({ ...payload, recurrence_type: "weeekday" })
      .expect(400, {
        code: "013",
        message: "recurrence type is not valid",
      }));

  it("should return a 400 an invalid day_of_week is provided", () =>
    hook()
      .send({ ...payload, day_of_week: [11, 2] })
      .expect(400, {
        code: "013",
        message:
          "'day_of_week' value must be number and in the range from 1 to 7",
      }));

  it("should return a 404 when an invalid separation_count is provided", () =>
    hook()
      .send({ ...payload, separation_count: "123" })
      .expect(400, {
        code: "013",
        message: "separation count must be an integer",
      }));
  it("should return a 404 when an invalid week_of_month is provided", () =>
    hook()
      .send({ ...payload, week_of_month: [1, 2, 44] })
      .expect(400, {
        code: "013",
        message:
          "'week_of_month' value must be number and in the range from 1 to 6",
      }));
  it("should return a 404 when an invalid day_of_month s provided", () =>
    hook()
      .send({ ...payload, day_of_month: [66] })
      .expect(400, {
        code: "013",
        message:
          "'day_of_month' value must be number and in the range from 1 to 31",
      }));
  it("should return a 404 when an invalid month_of_year s provided", () =>
    hook()
      .send({ ...payload, month_of_year: [13] })
      .expect(400, {
        code: "013",
        message:
          "'month_of_year' value must be number and in the range from 1 to 12",
      }));

  it("should return 204 when posting with correct payload and existing venue and opentime", () =>
    hook().send(payload).expect(204, ""));
});

describe("PATCH /recurrences/{id}", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");

  const url = ({ schedule = "test-schedule-template" } = {}) =>
    `/dev/recurrences/${schedule}`;
  const payload = {
    recurrence_type: "weekly",
    day_of_week: [1, 2],
    separation_count: 1,
    week_of_month: [],
    day_of_month: [],
    month_of_year: [],
  };

  const hook = () =>
    server
      .patch(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  it("should return a 404 when an invalid recurrence_id is provided", () =>
    server
      .post(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...payload })
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      }));

  it("should return a 400 an invalid recurrence_type is provided", () =>
    hook()
      .send({ ...payload, recurrence_type: "wrong-weekday" })
      .expect(400, {
        code: "013",
        message: "recurrence type is not valid",
      }));

  it("should return a 400 an invalid day_of_week is provided", () =>
    hook()
      .send({ ...payload, day_of_week: [11, 2] })
      .expect(400, {
        code: "013",
        message:
          "'day_of_week' value must be number and in the range from 1 to 7",
      }));

  it("should return a 404 when an invalid separation_count is provided", () =>
    hook()
      .send({ ...payload, separation_count: "123" })
      .expect(400, {
        code: "013",
        message: "separation count must be an integer",
      }));
  it("should return a 404 when an invalid week_of_month is provided", () =>
    hook()
      .send({ ...payload, week_of_month: [1, 2, 44] })
      .expect(400, {
        code: "013",
        message:
          "'week_of_month' value must be number and in the range from 1 to 6",
      }));
  it("should return a 404 when an invalid day_of_month s provided", () =>
    hook()
      .send({ ...payload, day_of_month: [66] })
      .expect(400, {
        code: "013",
        message:
          "'day_of_month' value must be number and in the range from 1 to 31",
      }));
  it("should return a 404 when an invalid month_of_year s provided", () =>
    hook()
      .send({ ...payload, month_of_year: [13] })
      .expect(400, {
        code: "013",
        message:
          "'month_of_year' value must be number and in the range from 1 to 12",
      }));

  it("should return 204 when patching with correct payload and existing venue and opentime", () =>
    hook().send(payload).expect(204, ""));
});

describe("Testing recurrence dates calculating", () => {
  const recurrence = {
    recurrenceType: "weekly",
    dayOfWeek: [],
    separationCount: 1,
    weekOfMonth: [],
    dayOfMonth: [],
    monthOfYear: [],
    OpenTimeId: 7,
  };
  const openTime = {
    from: "2022-02-01",
    to: "2022-02-03",
  };

  it("testing daily recurrence", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-02T00:00:00.000Z",
      "2022-02-03T00:00:00.000Z",
    ];
    expect(await calculateRecurrenceDates(null, openTime)).toEqual(expected);
  });

  it("testing weekly recurrence", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-07T00:00:00.000Z",
      "2022-02-08T00:00:00.000Z",
      "2022-02-14T00:00:00.000Z",
      "2022-02-15T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "weekly",
          dayOfWeek: [1, 2],
        },
        { ...openTime, from: "2022-02-01", to: "2022-02-20" }
      )
    ).toEqual(expected);
  });

  it("testing weekly recurrence with separation count", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-14T00:00:00.000Z",
      "2022-02-15T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "weekly",
          dayOfWeek: [1, 2],
          separationCount: 2,
        },
        { ...openTime, from: "2022-02-01", to: "2022-02-20" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence", async () => {
    const expected = ["2022-02-13T00:00:00.000Z", "2022-02-14T00:00:00.000Z"];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfMonth: [13, 14],
        },
        { ...openTime, from: "2022-02-01", to: "2022-02-20" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence with separation count", async () => {
    const expected = [
      "2022-01-13T00:00:00.000Z",
      "2022-01-14T00:00:00.000Z",
      "2022-03-13T00:00:00.000Z",
      "2022-03-14T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfMonth: [13, 14],
          separationCount: 2,
        },
        { ...openTime, from: "2022-01-01", to: "2022-03-20" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence with week of month", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-02T00:00:00.000Z",
      "2022-02-03T00:00:00.000Z",
      "2022-02-04T00:00:00.000Z",
      "2022-02-05T00:00:00.000Z",
      "2022-02-06T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          weekOfMonth: [1],
        },
        { ...openTime, from: "2022-02-01", to: "2022-02-06" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence with separation count and week of month", async () => {
    const expected = [
      "2021-12-01T00:00:00.000Z",
      "2021-12-02T00:00:00.000Z",
      "2021-12-03T00:00:00.000Z",
      "2021-12-04T00:00:00.000Z",
      "2021-12-05T00:00:00.000Z",
      "2022-02-01T00:00:00.000Z",
      "2022-02-02T00:00:00.000Z",
      "2022-02-03T00:00:00.000Z",
      "2022-02-04T00:00:00.000Z",
      "2022-02-05T00:00:00.000Z",
      "2022-02-06T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          weekOfMonth: [1],
          separationCount: 2,
        },
        { ...openTime, from: "2021-12-01", to: "2022-02-06" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence with week of month and day of week", async () => {
    const expected = ["2022-02-01T00:00:00.000Z"];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfWeek: [1, 2],
          weekOfMonth: [1],
        },
        { ...openTime, from: "2022-02-01", to: "2022-02-20" }
      )
    ).toEqual(expected);
  });

  it("testing monthly recurrence with separation count and week of month and day of week", async () => {
    const expected = [
      "2022-01-01T00:00:00.000Z",
      "2022-03-04T00:00:00.000Z",
      "2022-03-05T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfWeek: [5, 6],
          weekOfMonth: [1],
          separationCount: 2,
        },
        { ...openTime, from: "2022-01-01", to: "2022-03-15" }
      )
    ).toEqual(expected);
  });

  it("testing yearly recurrence with month of year", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-02T00:00:00.000Z",
      "2022-02-03T00:00:00.000Z",
      "2022-02-04T00:00:00.000Z",
      "2022-02-05T00:00:00.000Z",
      "2022-02-06T00:00:00.000Z",
      "2022-02-07T00:00:00.000Z",
      "2022-02-08T00:00:00.000Z",
      "2022-02-09T00:00:00.000Z",
      "2022-02-10T00:00:00.000Z",
      "2022-02-11T00:00:00.000Z",
      "2022-02-12T00:00:00.000Z",
      "2022-02-13T00:00:00.000Z",
      "2022-02-14T00:00:00.000Z",
      "2022-02-15T00:00:00.000Z",
      "2022-02-16T00:00:00.000Z",
      "2022-02-17T00:00:00.000Z",
      "2022-02-18T00:00:00.000Z",
      "2022-02-19T00:00:00.000Z",
      "2022-02-20T00:00:00.000Z",
      "2022-02-21T00:00:00.000Z",
      "2022-02-22T00:00:00.000Z",
      "2022-02-23T00:00:00.000Z",
      "2022-02-24T00:00:00.000Z",
      "2022-02-25T00:00:00.000Z",
      "2022-02-26T00:00:00.000Z",
      "2022-02-27T00:00:00.000Z",
      "2022-02-28T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [1],
        },
        { ...openTime, from: "2022-01-01", to: "2022-03-15" }
      )
    ).toEqual(expected);
  });

  it("testing yearly recurrence with month of year and separation count", async () => {
    const expected = [
      "2022-02-01T00:00:00.000Z",
      "2022-02-02T00:00:00.000Z",
      "2022-02-03T00:00:00.000Z",
      "2022-02-04T00:00:00.000Z",
      "2022-02-05T00:00:00.000Z",
      "2022-02-06T00:00:00.000Z",
      "2022-02-07T00:00:00.000Z",
      "2022-02-08T00:00:00.000Z",
      "2022-02-09T00:00:00.000Z",
      "2022-02-10T00:00:00.000Z",
      "2022-02-11T00:00:00.000Z",
      "2022-02-12T00:00:00.000Z",
      "2022-02-13T00:00:00.000Z",
      "2022-02-14T00:00:00.000Z",
      "2022-02-15T00:00:00.000Z",
      "2022-02-16T00:00:00.000Z",
      "2022-02-17T00:00:00.000Z",
      "2022-02-18T00:00:00.000Z",
      "2022-02-19T00:00:00.000Z",
      "2022-02-20T00:00:00.000Z",
      "2022-02-21T00:00:00.000Z",
      "2022-02-22T00:00:00.000Z",
      "2022-02-23T00:00:00.000Z",
      "2022-02-24T00:00:00.000Z",
      "2022-02-25T00:00:00.000Z",
      "2022-02-26T00:00:00.000Z",
      "2022-02-27T00:00:00.000Z",
      "2022-02-28T00:00:00.000Z",
      "2024-02-01T00:00:00.000Z",
      "2024-02-02T00:00:00.000Z",
      "2024-02-03T00:00:00.000Z",
      "2024-02-04T00:00:00.000Z",
      "2024-02-05T00:00:00.000Z",
      "2024-02-06T00:00:00.000Z",
      "2024-02-07T00:00:00.000Z",
      "2024-02-08T00:00:00.000Z",
      "2024-02-09T00:00:00.000Z",
      "2024-02-10T00:00:00.000Z",
      "2024-02-11T00:00:00.000Z",
      "2024-02-12T00:00:00.000Z",
      "2024-02-13T00:00:00.000Z",
      "2024-02-14T00:00:00.000Z",
      "2024-02-15T00:00:00.000Z",
      "2024-02-16T00:00:00.000Z",
      "2024-02-17T00:00:00.000Z",
      "2024-02-18T00:00:00.000Z",
      "2024-02-19T00:00:00.000Z",
      "2024-02-20T00:00:00.000Z",
      "2024-02-21T00:00:00.000Z",
      "2024-02-22T00:00:00.000Z",
      "2024-02-23T00:00:00.000Z",
      "2024-02-24T00:00:00.000Z",
      "2024-02-25T00:00:00.000Z",
      "2024-02-26T00:00:00.000Z",
      "2024-02-27T00:00:00.000Z",
      "2024-02-28T00:00:00.000Z",
      "2024-02-29T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [1],
          separationCount: 2,
        },
        { ...openTime, from: "2022-01-01", to: "2024-03-01" }
      )
    ).toEqual(expected);
  });

  it("testing yearly recurrence with month of year and day of month", async () => {
    const expected = [
      "2022-03-15T00:00:00.000Z",
      "2022-03-16T00:00:00.000Z",
      "2023-03-15T00:00:00.000Z",
      "2023-03-16T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [2],
          dayOfMonth: [15, 16],
        },
        { ...openTime, from: "2022-02-01", to: "2023-04-15" }
      )
    ).toEqual(expected);
  });

  it("testing yearly recurrence with month of year and day of month and separation count", async () => {
    const expected = [
      "2022-03-15T00:00:00.000Z",
      "2022-03-16T00:00:00.000Z",
      "2024-03-15T00:00:00.000Z",
      "2024-03-16T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [2],
          dayOfMonth: [15, 16],
          separationCount: 2,
        },
        { ...openTime, from: "2022-02-01", to: "2024-04-15" }
      )
    ).toEqual(expected);
  });

  it("testing yearly recurrence with month of year and week of month", async () => {
    const expected = [
      "2022-03-14T00:00:00.000Z",
      "2022-03-15T00:00:00.000Z",
      "2022-03-16T00:00:00.000Z",
      "2022-03-17T00:00:00.000Z",
      "2022-03-18T00:00:00.000Z",
      "2022-03-19T00:00:00.000Z",
      "2022-03-20T00:00:00.000Z",
      "2023-03-13T00:00:00.000Z",
      "2023-03-14T00:00:00.000Z",
      "2023-03-15T00:00:00.000Z",
      "2023-03-16T00:00:00.000Z",
      "2023-03-17T00:00:00.000Z",
      "2023-03-18T00:00:00.000Z",
      "2023-03-19T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [2],
          weekOfMonth: [3],
        },
        { ...openTime, from: "2022-02-01", to: "2023-04-15" }
      )
    ).toEqual(expected);
  });
  it("testing yearly recurrence with month of year and week of month and separation count", async () => {
    const expected = [
      "2022-03-14T00:00:00.000Z",
      "2022-03-15T00:00:00.000Z",
      "2022-03-16T00:00:00.000Z",
      "2022-03-17T00:00:00.000Z",
      "2022-03-18T00:00:00.000Z",
      "2022-03-19T00:00:00.000Z",
      "2022-03-20T00:00:00.000Z",
      "2024-03-11T00:00:00.000Z",
      "2024-03-12T00:00:00.000Z",
      "2024-03-13T00:00:00.000Z",
      "2024-03-14T00:00:00.000Z",
      "2024-03-15T00:00:00.000Z",
      "2024-03-16T00:00:00.000Z",
      "2024-03-17T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "yearly",
          monthOfYear: [2],
          weekOfMonth: [3],
          separationCount: 2,
        },
        { ...openTime, from: "2022-02-01", to: "2024-04-15" }
      )
    ).toEqual(expected);
  });
  it("testing Monthly recurrence on 5th week Friday", async () => {
    const expected = ["2022-06-24T00:00:00.000Z"];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          monthOfYear: [],
          weekOfMonth: [5],
          dayOfWeek: [5],
          separationCount: 1,
        },
        { ...openTime, from: "2022-06-01", to: "2022-07-15" }
      )
    ).toEqual(expected);
  });
  it("testing Monthly recurrence on 5th week Monday", async () => {
    const expected = ["2022-07-25T00:00:00.000Z"];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          monthOfYear: [],
          weekOfMonth: [5],
          dayOfWeek: [1],
          separationCount: 1,
        },
        { ...openTime, from: "2022-07-01", to: "2022-08-15" }
      )
    ).toEqual(expected);
  });
  it("testing Monthly recurrence on 31st day", async () => {
    const expected = [
      "2022-05-31T00:00:00.000Z",
      "2022-06-30T00:00:00.000Z",
      "2022-07-31T00:00:00.000Z",
      "2022-08-31T00:00:00.000Z",
    ];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfMonth: [31],
          separationCount: 1,
        },
        { ...openTime, from: "2022-05-01", to: "2022-09-15" }
      )
    ).toEqual(expected);
  });
  it("testing recurrence on February recurrence on 31st day", async () => {
    const expected = ["2024-01-31T00:00:00.000Z", "2024-02-28T00:00:00.000Z"];
    expect(
      await calculateRecurrenceDates(
        {
          ...recurrence,
          recurrenceType: "monthly",
          dayOfMonth: [31],
          separationCount: 1,
        },
        { ...openTime, from: "2024-01-01", to: "2024-03-15" }
      )
    ).toEqual(expected);
  });
});
