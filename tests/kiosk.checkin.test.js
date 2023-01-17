const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const url = `/dev/kiosk/checkin`;

describe("POST /kiosk/checkin", () => {
  it("when requesting confirm booking then return 200", async () => {
    const reference = "checkin-booking";
    const token = `Basic ${jwt.sign({ sub: reference }, "secret")}`;

    await server
      .post(`${url}/`)
      .set("Authorization", token)
      .set(commonHeaders)
      .expect(200);

    const getCheckedInResponse = await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", token)
      .set(commonHeaders)
      .expect(200);

    expect(getCheckedInResponse.body.checkin_at).toBeDefined();
  });

  it("when requesting confirm an unknown booking then return 404", () =>
    server
      .post(`${url}/`)
      .set(
        "Authorization",
        `Basic ${jwt.sign({ sub: "unknown-booking" }, "secret")}`
      )
      .set(commonHeaders)
      .expect(404));
});

describe("POST /kiosk/checkin/{reference}", () => {
  it("when requesting confirm future booking then return 404", async () => {
    const reference = "future-2031-checkin-booking";

    const token = `Basic ${jwt.sign({ sub: reference }, "secret")}`;

    await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", token)
      .set(commonHeaders)
      .expect(200);

    await server.post(`${url}/${reference}`).set(commonHeaders).expect(404);
  });

  it("when requesting confirm an unknown booking then return 404", () =>
    server.post(`${url}/unknown`).set(commonHeaders).expect(404));

  it("when requesting confirm booking then return 200", async () => {
    const reference = "checkin-ref-booking";
    await server.post(`${url}/${reference}`).set(commonHeaders).expect(200);

    const token = `Basic ${jwt.sign({ sub: reference }, "secret")}`;
    const getCheckedInResponse = await server
      .get(`/dev/bookings/${reference}`)
      .set("Authorization", token)
      .set(commonHeaders)
      .expect(200);

    expect(getCheckedInResponse.body.checkin_at).toBeDefined();
  });
});
