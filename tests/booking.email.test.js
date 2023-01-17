const { expectSQSMessageToBe } = require("./helpers/sqs");

describe("send 24h reminder email test", () => {
  it("publish sqs message for booking scheduled next day", async () => {
    const reference = "24h-reminder-booking";
    await expectSQSMessageToBe(
      {
        booking: expect.objectContaining({
          reference,
          sessionId: reference,
        }),
        type: "booking-reminder",
      },
      reference
    );
  });
});
