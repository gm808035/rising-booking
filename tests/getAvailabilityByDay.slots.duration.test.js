const request = require("supertest");
const { commonHeaders } = require("./config");

/**
 * Test data
 * Schedule applied for
 * 2021-01-02 - Saturday
 * 2021-01-04 - Mondoay
 * With slots:
 *       start: "19:00", duration: 10, box_id: 35,
 *       start: "16:00", duration: 10, box_id: 35,
 *       start: "20:00", duration: 10,box_id: 35,
 *       start: "18:50", duration: 30, box_id: 37,
 *       start: "15:50", duration: 30, box_id: 37,
 *       start: "20:00", duration: 30, box_id: 38,
 *       start: "15:50", duration: 20, box_id: 39,
 *       start: "18:50", duration: 20, box_id: 39,
 *       start: "20:00", duration: 20, box_id: 39,
 */

describe("/availability/{venue}/{day}/{duration}", () => {
  const server = request("http://localhost:3000");

  const url = ({
    venue = "test-venue-template",
    day = "2021-01-02",
    duration = 10,
  }) => `/dev/availability/${venue}/${day}/${duration}`;

  const payload = (times = []) => ({
    venue_id: 6,
    venue_code: "test-venue-template",
    times,
  });

  it("10m slots for 2021-01-02 Saturday, all slots after 16:00 should be 18+", () =>
    server
      .get(url({}))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "16:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1664,
            type: "off-peak",
            price: 166,
            over_18: true,
          },
          {
            start: "19:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1663,
            type: "off-peak",
            price: 166,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1665,
            type: "off-peak",
            price: 166,
            over_18: true,
          },
        ])
      ));
  it("10m slots for 2021-01-04 Monday, all slots after 19:00 should be 18+", () =>
    server
      .get(url({ day: "2021-01-04" }))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "16:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1664,
            type: "off-peak",
            price: 166,
          },
          {
            start: "19:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1663,
            type: "off-peak",
            price: 166,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 10,
            box_id: 35,
            box_slot_id: 1665,
            type: "off-peak",
            price: 166,
            over_18: true,
          },
        ])
      ));
  it("20m slots for 2021-01-02 Saturday, all slots after 16:00 should be 18+", () =>
    server
      .get(url({ day: "2021-01-02", duration: 20 }))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "15:50",
            duration: 20,
            box_id: 39,
            box_slot_id: 1669,
            type: "off-peak",
            price: 333,
            over_18: true,
          },
          {
            start: "18:50",
            duration: 20,
            box_id: 39,
            box_slot_id: 1670,
            type: "off-peak",
            price: 333,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 20,
            box_id: 39,
            box_slot_id: 1671,
            type: "off-peak",
            price: 333,
            over_18: true,
          },
        ])
      ));
  it("20m slots for 2021-01-04 Monday, all slots after 19:00 should be 18+", () =>
    server
      .get(url({ day: "2021-01-04", duration: 20 }))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "15:50",
            duration: 20,
            box_id: 39,
            box_slot_id: 1669,
            type: "off-peak",
            price: 333,
          },
          {
            start: "18:50",
            duration: 20,
            box_id: 39,
            box_slot_id: 1670,
            type: "off-peak",
            price: 333,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 20,
            box_id: 39,
            box_slot_id: 1671,
            type: "off-peak",
            price: 333,
            over_18: true,
          },
        ])
      ));
  it("30m slots for 2021-01-02 Saturday, all slots after 16:00 should be 18+", () =>
    server
      .get(url({ day: "2021-01-02", duration: 30 }))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "15:50",
            duration: 30,
            box_id: 37,
            box_slot_id: 1667,
            type: "off-peak",
            price: 500,
            over_18: true,
          },
          {
            start: "18:50",
            duration: 30,
            box_id: 37,
            box_slot_id: 1666,
            type: "off-peak",
            price: 500,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 30,
            box_id: 38,
            box_slot_id: 1668,
            type: "off-peak",
            price: 500,
            over_18: true,
          },
        ])
      ));
  it("30m slots for 2021-01-04 Monday, all slots after 19:00 should be 18+", () =>
    server
      .get(url({ day: "2021-01-04", duration: 30 }))
      .set(commonHeaders)
      .expect(
        200,
        payload([
          {
            start: "15:50",
            duration: 30,
            box_id: 37,
            box_slot_id: 1667,
            type: "off-peak",
            price: 500,
          },
          {
            start: "18:50",
            duration: 30,
            box_id: 37,
            box_slot_id: 1666,
            type: "off-peak",
            price: 500,
            over_18: true,
          },
          {
            start: "20:00",
            duration: 30,
            box_id: 38,
            box_slot_id: 1668,
            type: "off-peak",
            price: 500,
            over_18: true,
          },
        ])
      ));
});
