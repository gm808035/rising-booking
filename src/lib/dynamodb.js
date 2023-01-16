const AWS = require("aws-sdk");
const https = require("https");
const { format, differenceInMinutes } = require("date-fns");
const { zonedTimeToUtc } = require("date-fns-tz");

const { DYNAMODB_ENDPOINT, EMAIL_CONTENT_TABLE } = process.env;

const getDynamoDbConfig = () => {
  if (DYNAMODB_ENDPOINT) {
    // offline for testing
    return {
      endpoint: DYNAMODB_ENDPOINT,
    };
  }
  return {
    httpOptions: {
      agent: new https.Agent({ keepAlive: true, rejectUnauthorized: true }),
    },
  };
};

const dynamoDb = new AWS.DynamoDB.DocumentClient(getDynamoDbConfig());

const updateItem = ({ booking }, peakType) => {
  const startTime = format(booking.start, "HH:mm");
  const duration = differenceInMinutes(booking.end, booking.start);

  const params = {
    TableName: EMAIL_CONTENT_TABLE,
    Key: {
      id: booking.sessionId,
    },
    UpdateExpression: `set
      date_booking = :dateBooking,
      players = :players,
      start_time = :startTime,
      booking_duration = :duration,
      booking_ref = :bookingRef,
      peak = :peak,
      extras = :extras,
      number_of_boxes = :numberOfBoxes,
      packages = :packages`,
    ExpressionAttributeValues: {
      ":dateBooking": zonedTimeToUtc(
        booking.start,
        booking.Venue.timezone
      ).toISOString(),
      ":players": booking.guestsNo,
      ":startTime": startTime,
      ":duration": duration,
      ":bookingRef": booking.reference,
      ":peak": peakType,
      ":extras": booking.extras ?? "",
      ":numberOfBoxes": booking.BoxBookings.length,
      ":packages": booking.packages ?? "",
    },
  };

  console.log("[DynamoDB] Updating item in db", params);

  return dynamoDb.update(params).promise();
};

const updatePartialItem = ({ booking }) => {
  const startTime = format(booking.start, "HH:mm");
  const duration = differenceInMinutes(booking.end, booking.start);

  const params = {
    TableName: EMAIL_CONTENT_TABLE,
    Key: {
      id: booking.sessionId,
    },
    UpdateExpression: `set
      date_booking = :dateBooking,
      players = :players,
      start_time = :startTime,
      booking_duration = :duration,
      booking_ref = :bookingRef,
      extras = :extras`,
    ExpressionAttributeValues: {
      ":dateBooking": zonedTimeToUtc(
        booking.start,
        booking.Venue.timezone
      ).toISOString(),
      ":players": booking.guestsNo,
      ":startTime": startTime,
      ":duration": duration,
      ":bookingRef": booking.reference,
      ":extras": booking.extras ?? "",
    },
  };

  console.log("[DynamoDB] Partially updating item in db", params);

  return dynamoDb.update(params).promise();
};

module.exports = {
  updateItem,
  updatePartialItem,
};
