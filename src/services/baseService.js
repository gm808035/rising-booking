const { Sequelize } = require("sequelize");
const config = require("../../db/config");

let sequelize;

const loadSequelize = async () => {
  sequelize = new Sequelize(config.development);
  await sequelize.authenticate();
  return sequelize;
};

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

const baseService = async (fn) => {
  try {
    if (!sequelize) {
      sequelize = await loadSequelize();
    } else {
      sequelize.connectionManager.initPools();
      const getConnectionExists = Object.prototype.hasOwnProperty.call(
        sequelize.connectionManager,
        "getConnection"
      );
      if (getConnectionExists) {
        delete sequelize.connectionManager.getConnection;
      }
    }

    const connection = await sequelize.connectionManager.getConnection();
    await sequelize.connectionManager.releaseConnection(connection);

    const { statusCode = 200, body } = await fn(sequelize);
    console.log("[baseService] Function executed!");
    console.log({ statusCode }, body);
    return Promise.resolve({
      statusCode,
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[baseService] Something went wrong", error);
    return Promise.resolve({
      statusCode: error.statusCode ?? 500,
      headers,
      body: JSON.stringify({
        code: error.code,
        message: error.message ?? "Something went wrong",
      }),
    });
  } finally {
    await sequelize.connectionManager.close();
  }
};

module.exports = baseService;
