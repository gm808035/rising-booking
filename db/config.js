require("dotenv").config();

module.exports = {
  development: {
    username: "admin",
    password:"adminpassword",
    database: "database-1",
    host: "database-1.cphbxirypjco.eu-west-2.rds.amazonaws.com",
    // replication: {
    //   read: [
    //     {
    //       host: process.env.DB_READER_HOST,
    //     },
    //   ],
    //   write: {
    //     host: process.env.DB_HOST,
    //   },
    // },
    dialect: "mysql",
    dialectOptions: {
      connectTimeout: 60000,
    },
    pool: {
      max: 1, // maximum number of connections, 1 connection is needed per lambda (no concurrent queries happening)
      min: 0, // minimum number of connections
      idle: 0, // max time allowed for connection to idle
      acquire: 3000, // max time to get connection to db
      evict: 6000, // The time interval after which sequelize-pool will remove idle connections, 3secs default timeout of lambda
    },
    seederStorage: "sequelize",
    retry: {
      max: 0,
    },
  },
  production: {
    username: "admin",
    password:"adminpassword",
    database: "database-1",
    host: "database-1.cphbxirypjco.eu-west-2.rds.amazonaws.com",
    // replication: {
    //   read: [
    //     {
    //       host: process.env.DB_READER_HOST,
    //     },
    //   ],
    //   write: {
    //     host: process.env.DB_HOST,
    //   },
    // },
    dialect: "mysql",
    dialectOptions: {
      connectTimeout: 60000,
    },
    pool: {
      max: 1, // maximum number of connections, 1 connection is needed per lambda (no concurrent queries happening)
      min: 0, // minimum number of connections
      idle: 0, // max time allowed for connection to idle
      acquire: 3000, // max time to get connection to db
      evict: 6000, // The time interval after which sequelize-pool will remove idle connections, 3secs default timeout of lambda
    },
    seederStorage: "sequelize",
    retry: {
      max: 0,
    },
  },
};
