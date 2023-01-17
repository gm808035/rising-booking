const axios = require("axios");

describe("bookingEventsPublisher", () => {
  const EventBusName = "toca-host-terminal-service";

  it("should publish booking to event bridge", async () => {
    const response = await axios.put("http://localhost:1081/retrieve");
    const message = response.data
      .reverse()
      .find(
        (data) =>
          data.method === "POST" &&
          data.path === "/" &&
          data.body.json.Entries[0].EventBusName === EventBusName
      );
    const entry = message.body.json.Entries[0];
    expect(entry).toMatchObject({
      EventBusName,
      DetailType: "create",
      Source: "booking",
    });
  });
});
