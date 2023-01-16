const { getAll, getByCode } = require("../services/venue");

const getAllHandler = async (event) => getAll(event);
const getByCodeHandler = async (event) => getByCode(event);

module.exports = { getAllHandler, getByCodeHandler };
