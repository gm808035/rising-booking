const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");

/**
 * Bookings:
 * expired-booking - empty type, updated_at of at least 20 minutes and not paid - should be removed
 * paid-booking - empty type, updated_at of at least 20 minutes and paid - should be kept
 * expired-other-booking - type of other, updated_at of at least 20 minutes and not paid - should be kept
 * expired-kiosk-booking - empty type, source of walkin, updated_at of at least 5 minutes and not paid - should be removed
 */

describe("clearReservedBookings", () => {
  const server = request("http://localhost:3000");
  const url = "/dev/bookings";

  const getBooking = (reference) => {
    const token = jwt.sign({ sub: reference }, "secret");

    return server
      .get(`${url}/${reference}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  it("clears bookings that have updated_at of at least 20 minutes and not paid", () =>
    getBooking("expired-booking").expect(400));

  it("does not clear bookings that have updated_at of at least 20 minutes and have been paid", () =>
    getBooking("paid-booking").expect(200));

  it("does not clear bookings that have type other", () =>
    getBooking("expired-other-booking").expect(200));

  it("clears kiosk bookings that have updated_at of at least 5 minutes and not paid", () =>
    getBooking("expired-kiosk-booking").expect(400));
});
