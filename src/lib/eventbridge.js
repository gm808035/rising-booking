const AWS = require("aws-sdk");
const https = require("https");

const { EVENTBRIDGE_ENDPOINT } = process.env;

const getEventBridgeConfig = () => {
  const defaultOptions = {
    apiVersion: "2015-10-07",
  };

  if (EVENTBRIDGE_ENDPOINT) {
    // offline for testing
    return {
      ...defaultOptions,
      endpoint: EVENTBRIDGE_ENDPOINT,
    };
  }
  return {
    ...defaultOptions,
    httpOptions: {
      agent: new https.Agent({ keepAlive: true, rejectUnauthorized: true }),
    },
  };
};

const eventBridge = new AWS.EventBridge(getEventBridgeConfig());

const publish = async (data, type, source, eventBus) => {
  const detail = JSON.stringify(data);

  try {
    const params = {
      Entries: [
        {
          EventBusName: eventBus,
          Detail: detail,
          DetailType: type,
          Source: source,
          Time: new Date(),
        },
      ],
    };
    console.log("[EventBridge] Publishing event to EventBrdige", params);
    await eventBridge.putEvents(params).promise();
  } catch (error) {
    console.error("[EventBridge] failed to publish event", error);
  }
};

module.exports = {
  publish,
};
