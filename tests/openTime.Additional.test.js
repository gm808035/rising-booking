const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");

/* 
appied schedule for venueId 6 on 2022-10-15
  *
  * Box slots for box 35:
      start      duration  end
      09:00:00  | 60     | 10:00:00
      10:00:00	| 60     | 11:00:00
      15:00:00	| 90     | 16:30:00 
      20:00:00	| 60     | 21:00:00
  *
  * Box slots for box 36:
      20:30:00	| 90     | 22:00:00
  *
  * Open times:
      * 09:00 to 23:00 - off peak all day
*/

describe("PATCH /openTime/{schedule}/{openTimeId}", () => {
  const token = jwt.sign({ sub: "any-token" }, "secret");

  const url = "/dev/openTime/test-schedule-open-time-test/35";
  const urlGetSlots = `/dev/boxSlots/filter`;

  it("should return 4 box slots after open time updating to 10:00:00-23:00:00", async () => {
    await server
      .patch(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ start: "10:00:00", end: "23:00:00" })
      .expect(204, "");

    const response = await server
      .post(urlGetSlots)
      .send({ schedule_id: 40 })
      .set(commonHeaders)
      .expect(200);
    expect(response.body.boxSlots).toHaveLength(4);
  });

  it("should return 3 box slots after open time updating to 10:00:00-21:30:00", async () => {
    await server
      .patch(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ start: "10:00:00", end: "21:30:00" })
      .expect(204, "");

    const response = await server
      .post(urlGetSlots)
      .send({ schedule_id: 40 })
      .set(commonHeaders)
      .expect(200);
    expect(response.body.boxSlots).toHaveLength(3);
  });

  it("should return 1 box slot after open time updating to 11:30:00-20:30:00", async () => {
    await server
      .patch(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ start: "11:30:00", end: "20:30:00" })
      .expect(204, "");

    const response = await server
      .post(urlGetSlots)
      .send({ schedule_id: 40 })
      .set(commonHeaders)
      .expect(200);
    expect(response.body.boxSlots).toHaveLength(1);
  });
});
