const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");

describe("PATCH /openTime/{schedule}/{openTimeId}", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");

  const payload = {
    start: "09:00:00",
    end: "23:59:00",
  };
  const url = ({ schedule = "test-schedule-template", openTimeId = 33 } = {}) =>
    `/dev/openTime/${schedule}/${openTimeId}`;

  const hook = () =>
    server
      .patch(url())
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);

  it("should return a 400 when an invalid start time is provided", () =>
    hook()
      .send({ ...payload, start: "20:00" })
      .expect(400, {
        code: "013",
        message: "start time must be in the format HH:mm:ss",
      }));

  it("should return a 400 an invalid end time format is provided", () =>
    hook()
      .send({ ...payload, end: "20:00" })
      .expect(400, {
        code: "013",
        message: "end time must be in the format HH:mm:ss",
      }));

  it("should return a 400 an invalid end/start time is provided", () =>
    hook().send({ end: "20:00:00", start: "21:00:00" }).expect(400, {
      code: "013",
      message: "open start time must be less than open end time",
    }));

  it("should return a 404 when patching with a schedule that doesn't exist", () =>
    server
      .patch(url({ schedule: "not-a-schedule" }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(payload)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      }));

  it("should return a 404 when patching with a opentime that doesn't exist", () =>
    server
      .patch(url({ schedule: "test-schedule-template", openTimeId: 1234 }))
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(payload)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      }));

  it("should return 204 when patching with correct payload and existing schedule", () =>
    hook().send(payload).expect(204, ""));
});
