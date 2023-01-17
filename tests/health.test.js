const request = require("supertest");

describe("/dev/health", () => {
  const server = request("http://localhost:3000");

  it("returns statusCode 200", () =>
    server.get("/dev/health").expect(200, { healthy: true }));
});
