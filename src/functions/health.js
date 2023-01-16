const baseService = require("../services/baseService");

const handler = async () =>
  baseService(async (sequelize) => {
    try {
      await sequelize.authenticate();
      return { body: { healthy: true } };
    } catch (error) {
      console.error("Failed to connect to RDS", error);
      return { body: { healthy: false } };
    }
  });

module.exports = { handler };
