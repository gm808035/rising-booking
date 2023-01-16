/* eslint-disable max-classes-per-file */
const translateMessage = (code) => {
  switch (code) {
    case "000":
      return "";
    case "001":
      return "unknown venue";
    case "002":
      return "unknown box";
    case "003":
      return "unknown box slot";
    case "004":
      return "wrong box slot";
    case "005":
      return "slot unavailable";
    case "006":
      return "booking not found";
    case "007":
      return "invalid payload";
    case "009":
      return "unknown venue";
    case "010":
      return "unknown price point";
    case "011":
      return "unknown linked box slot";
    case "012":
      return "peak time already exists";
    case "013":
      return "invalid parameters";
    case "014":
      return "unknown venue";
    case "015":
      return "unknown recurrence";
    case "016":
      return "unknown box slot";
    case "017":
      return "unknown box";
    case "018":
      return "unknown linked box slot";
    case "019":
      return "invalid box slot parameters";
    case "020":
      return "unknown venue";
    case "021":
      return "unknown schedule";
    case "022":
      return "recurrence calculating error";
    case "023":
      return "this schedule is not associated to the venue";
    case "024":
      return "invalid parameters";
    case "025":
      return "schedule name already exists";
    case "026":
      return "recurrence already exists";
    case "027":
      return "unknown open time";
    case "028":
      return "unknown peak time";
    case "029":
      return "linked slots must be deleted together";
    case "030":
      return "box slot id's need to be passed in an array format";
    case "031":
      return "box slot link ids need to be passed in an array format";
    case "032":
      return "error deleting box slot links";
    case "033":
      return "conflicted box slot";
    default:
      return "error";
  }
};

class NotFoundError extends Error {
  constructor(code, message) {
    super(message || translateMessage(code));
    this.code = code;
    this.name = "NotFoundError";
    this.statusCode = 404;
    Error.captureStackTrace(this, NotFoundError);
  }
}

class ValidationError extends Error {
  constructor(code, message) {
    super(message || translateMessage(code));
    this.code = code;
    this.name = "ValidationError";
    this.statusCode = 400;
    Error.captureStackTrace(this, NotFoundError);
  }
}

module.exports = {
  NotFoundError,
  ValidationError,
};
