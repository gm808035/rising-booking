const jwt = require("jsonwebtoken");

const getSessionId = (event) => {
  const [, token] = event.headers.Authorization.split(" ");
  const decoded = jwt.decode(token);
  return decoded.sub;
};

module.exports = {
  getSessionId,
};
