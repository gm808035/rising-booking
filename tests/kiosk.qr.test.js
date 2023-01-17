const request = require("supertest");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const url = `/dev/kiosk/sendqrcode`;

describe("POST /kiosk/sendqrcode/", () => {
  it("when trying to resend qr code for unknown booking return 404", () =>
    server
      .post(`${url}/`)
      .set(commonHeaders)
      .send({ booking_key: "unknown" })
      .expect(404));

  it("when trying to resend qr code without reference return 400", () =>
    server.post(`${url}/`).set(commonHeaders).send({}).expect(400));

  it("when trying to resend qr code for known booking return 200", () =>
    server
      .post(`${url}/`)
      .set(commonHeaders)
      .send({ booking_key: "checkin-booking" })
      .expect(200));
});
