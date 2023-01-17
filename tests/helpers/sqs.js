const { put } = require("axios");

const expectSQSMessageToBe = async (payload, bookingReference) => {
  const response = await put("http://localhost:1080/mockserver/retrieve");
  const message = response.data
    .reverse()
    .find(
      (data) =>
        data.method === "POST" &&
        data.path === "/" &&
        data.body.string.includes(payload.type) &&
        data.body.string.includes(encodeURIComponent(`"${bookingReference}"`))
    );
  const params = new URLSearchParams(message.body.string);
  const messageBody = JSON.parse(params.get("MessageBody"));
  expect(payload).toEqual(messageBody);

  return message;
};

module.exports = {
  expectSQSMessageToBe,
};
