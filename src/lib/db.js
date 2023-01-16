const { DataTypes, DatabaseError } = require("sequelize");
const fs = require("fs");
const path = require("path");
const Booking = require("../../db/models/booking");
const BoxSection = require("../../db/models/boxsection");
const Box = require("../../db/models/box");
const BoxBooking = require("../../db/models/boxbooking");
const BoxSlotLink = require("../../db/models/boxslotlink");
const BoxSlot = require("../../db/models/boxslot");
const OpenTime = require("../../db/models/opentime");
const Price = require("../../db/models/price");
const Venue = require("../../db/models/venue");
const Schedule = require("../../db/models/schedule");
const Recurrence = require("../../db/models/recurrence");
const VenueSchedule = require("../../db/models/venue-schedule");

const parseSQLFile = (file) =>
  fs
    .readFileSync(path.resolve(__dirname, `../sql/${file}.sql`), "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join(" ");

const getWaitingTimeSQL = parseSQLFile("getWaitingTime");
const getAvailabilityByDaySQL = parseSQLFile("getAvailabilityByDay");
const getAvailabilityByDateRangeSQL = parseSQLFile(
  "getAvailabilityByDateRange"
);

const db = async (sequelize) => {
  if (Object.keys(sequelize.models).length > 0) {
    return sequelize.models;
  }
  const models = [
    Booking,
    BoxSection,
    Box,
    BoxBooking,
    BoxSlotLink,
    BoxSlot,
    OpenTime,
    Price,
    Venue,
    Schedule,
    Recurrence,
    VenueSchedule,
  ];
  const instances = models.reduce((accumulator, model) => {
    const instance = model(sequelize, DataTypes);
    accumulator[instance.name] = instance;
    return accumulator;
  }, {});

  await Promise.all(
    Object.values(instances).map((model) => model.associate(instances))
  );

  return sequelize.models;
};

const retryWithTransaction = async (sequelize, fn, retry = 0) => {
  const transaction = await sequelize.transaction();
  try {
    const response = await fn(transaction);
    await transaction.commit();
    return response;
  } catch (error) {
    try {
      if (!transaction.finished) {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      console.info("Transaction rollback error", rollbackError);
    }
    if (error instanceof DatabaseError) {
      console.info(`DatabaseError, retry ${retry}`, error.message);
      // retry if DatabaseError, deadlock found
      if (retry > 10) {
        throw error;
      }
      // sleep for 100ms * retry
      await new Promise((resolve) => setTimeout(resolve, 100 * (retry + 1)));

      return retryWithTransaction(sequelize, fn, retry + 1);
    }
    throw error;
  }
};

module.exports = {
  db,
  retryWithTransaction,
  getAvailabilityByDateRangeSQL,
  getAvailabilityByDaySQL,
  getWaitingTimeSQL,
};
