const AWS = require("aws-sdk");
const https = require("https");

const { EMAIL_QUEUE_URL: QueueUrl, SQS_ENDPOINT } = process.env;

const getSQSConfig = () => {
  if (SQS_ENDPOINT) {
    // offline for testing
    return {
      endpoint: SQS_ENDPOINT,
    };
  }
  return {
    httpOptions: {
      agent: new https.Agent({ keepAlive: true, rejectUnauthorized: true }),
    },
  };
};

const sqs = new AWS.SQS(getSQSConfig());

const sendMessage = async ({ booking, type }) => {
  const MessageBody = JSON.stringify({
    booking,
    type,
  });

  console.log("[SQS] Sending message to queue", QueueUrl, MessageBody);

  try {
    await sqs.sendMessage({ MessageBody, QueueUrl }).promise();
  } catch (error) {
    console.error("[SQS] failed to send sqs message", error);
  }
};

module.exports = {
  sendMessage,
};
