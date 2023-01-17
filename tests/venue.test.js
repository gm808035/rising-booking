const request = require("supertest");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const url = `/dev/venues`;

describe("GET /venues", () => {
  it("when getting venues then return 200", () =>
    server
      .get(url)
      .set(commonHeaders)
      .expect(200, [
        { id: 1, code: "test-venue", name: "Test venue" },
        { id: 2, code: "lon-o2", name: "London O2" },
        { id: 3, code: "lon-acton", name: "Labs" },
        { id: 4, code: "test-venue-schedule", name: "Test venue - schedule" },
        { id: 5, code: "test-venue-dbb", name: "Test Venue - DBB" },
        { id: 6, code: "test-venue-template", name: "Test venue template" },

        { id: 7, code: "empty-test-venue", name: "Empty test venue" },
      ]));
});

describe("GET /venues/:id", () => {
  it("when getting unknown venue then return 404", () =>
    server.get(`${url}/unknown`).set(commonHeaders).expect(404));

  it("when getting venue then return 200", () =>
    server
      .get(`${url}/test-venue`)
      .set(commonHeaders)
      .expect(200, {
        id: 1,
        code: "test-venue",
        name: "Test venue",
        boxes: [
          { name: "1", id: 1, section: "Midfield Bar" },
          { name: "2", id: 2, section: "Corner Bar" },
          { name: "3", id: 3, section: "Corner Bar" },
          { name: "4", id: 4, section: "Corner Bar" },
          { name: "5", id: 5, section: "Corner Bar" },
        ],
      }));
});
