const request = require("supertest");

describe("/dev/ping", () => {
  const server = request("http://localhost:3000");

  it("returns statusCode 200", () => server.get("/dev/pong").expect(200));
});
