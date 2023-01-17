const request = require("supertest");
const jwt = require("jsonwebtoken");
const { format } = require("date-fns");
const { commonHeaders } = require("./config");

const server = request("http://localhost:3000");
const token = jwt.sign({ sub: "any-token" }, "secret");

const todayDate = format(new Date(), "yyyy-MM-dd");
const cleanSchedule = async (id) => {
  await server
    .delete(`/dev/schedule/type/${id}`)
    .set("Authorization", `Basic ${token}`)
    .set(commonHeaders)
    .expect(204);
};

describe("create box slots after delete 1st schedule", () => {
  let scheduleId;
  const url = "/dev/schedule";

  const venueCode = "test-venue-template";
  const name = "Create Test Schedule for slots";
  const order = 1;
  const openTime = {
    start: "09:00:00",
    end: "23:59:00",
  };
  const prices = [
    {
      start: "09:00:00",
      type: "off-peak",
      end: "23:59:00",
      price: 1001,
    },
  ];

  it("should return 200 when schedule with id 1 deleted and new box slots create", async () => {
    await cleanSchedule(1);

    const testSchedule = await server
      .post(`${url}/${venueCode}`)
      .send({ name, from: todayDate, to: todayDate, order, openTime, prices })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    scheduleId = testSchedule.body.id;

    await server
      .post(`/dev/boxSlots/`)
      .send({
        schedule_id: scheduleId,
        box_slots: [
          {
            start: "10:00:00",
            duration: 60,
            box_id: 35,
          },
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    await server
      .post("/dev/boxSlots/link/")
      .send({
        schedule_id: scheduleId,
        box_slots: [
          [
            {
              box_id: 35,
              duration: 60,
              start: "12:00:00",
            },
            {
              box_id: 36,
              duration: 60,
              start: "12:10:00",
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    await cleanSchedule(scheduleId);
  });
});
