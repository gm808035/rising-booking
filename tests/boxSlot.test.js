const request = require("supertest");
const jwt = require("jsonwebtoken");
const { commonHeaders } = require("./config");
const { TimeFormat } = require("../src/services/const/index");
/* eslint-disable arrow-body-style */

const server = request("http://localhost:3000");
const token = jwt.sign({ sub: "any-token" }, "secret");

describe("POST /boxSlots/filter", () => {
  const url = `/dev/boxSlots/filter`;

  it("when no schedule id specified then expect 400", () => {
    return server
      .post(url)
      .send({})
      .set(commonHeaders)
      .expect(400, { code: "019", message: "schedule id required" });
  });

  it("when no shcedule id 400", () => {
    return server
      .post(url)
      .send({})
      .set(commonHeaders)
      .expect(400, { code: "019", message: "schedule id required" });
  });

  it("when unknown schedule then expect 404", () => {
    return server
      .post(url)
      .send({ schedule_id: -1 })
      .set(commonHeaders)
      .expect(404, {
        code: "021",
        message: "unknown schedule",
      });
  });

  it("when schedule id in wrong format then expect 404", () => {
    return server
      .post(url)
      .send({ schedule_id: "wrong-format" })
      .set(commonHeaders)
      .expect(400, {
        code: "019",
        message: "schedule id must be a number",
      });
  });

  it("when requesting filtered box slots then expect 200", () => {
    const boxSlotMatcher = {
      BoxId: expect.any(Number),
      Box: expect.any(Array),
      ScheduleId: expect.any(Number),
      BoxSlotLinks: expect.any(Array),
      duration: expect.any(Number),
      id: expect.any(Number),
      start: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    };
    server
      .post(url)
      .send({ day: "2022-02-08", schedule_id: 1 })
      .set(commonHeaders)
      .expect((response) => {
        expect(response.statusCode).toEqual(200);
        const { length } = response.body;

        expect(response.statusCode).toMatchInlineSnapshot(`200`);
        expect(length).toBe(18);
        expect(response.body).toMatchSnapshot({
          boxSlots: new Array(length).fill(boxSlotMatcher),
        });
      });
  });
});

describe("POST /boxSlots/", () => {
  const payload = {
    start: "13:00:00",
    duration: 20,
    box_id: 5,
  };
  const url = `/dev/boxSlots/`;

  const hook = () => {
    return server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  const clearDb = async (boxSlotId, scheduleId = 10) => {
    await server
      .post(`/dev/boxSlots/delete`)
      .send({ schedule_id: scheduleId, slots: boxSlotId })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  };

  it("should return a 400 when an invalid schedule id is provided", () => {
    return hook()
      .send({
        schedule_id: "wrond-format",
        box_slots: [payload],
      })
      .expect(400, {
        code: "019",
        message: "schedule id must be a number",
      });
  });

  it("should return a 400 when an unknown box id is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, box_id: 100000000 }],
      })
      .expect(400, {
        code: "017",
        message: `unknown box`,
      });
  });
  it("should return a 400 when box id from diferent venue is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, box_id: 18 }],
      })
      .expect(400, {
        code: "023",
        message: `this schedule is not associated to the venue`,
      });
  });

  it("should return a 400 when an invalid box slot start is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, start: "not-a-valid-box-slot-start" }],
      })
      .expect(400, {
        code: "019",
        message: `start time must be in the format ${TimeFormat}`,
      });
  });

  it("should return a 400 when an invalid box slot duration is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, duration: "not-a-valid-box-slot-duration" }],
      })
      .expect(400, {
        code: "019",
        message: "duration must be a number",
      });
  });

  it("should return a 400 when an invalid box id is provided", async () => {
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, box_id: "not-a-valid-box-id" }],
      })
      .expect(400, {
        code: "019",
        message: "box id must be a number",
      });
  });
  it("should return a 400 when conflicted slots time is provided", async () => {
    /**
     * create box slot for schedule_id: 10, box_id: 5, start: "13:00:00", end: "14:00:00"
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, duration: 60 }],
      });
    /**
     * create conflicted box slot, start: "13:00:00", end: "14:00:00",
     * that is conflicted with box slot: start: "13:00:00", end: "14:00:00"
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ ...payload, duration: 60 }],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     * create conflicted box slot:  start: "14:09:00", end: "16:09:00"
     * that is conflicted with box slot: start: "13:00:00", end: "14:00:00" + 10 min
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ start: "14:09:00", duration: 60, box_id: 5 }],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     * create conflicted box slot:  start: "12:30:00", end: "14:30:00"
     * that is conflicted with box slot: start: "13:00:00", end: "14:00:00" + 10 min
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ start: "12:30:00", duration: 120, box_id: 5 }],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     * create conflicted box slot:  start: "13:30:00", end: "13:40:00"
     * that is conflicted with box slot: start: "13:00:00", end: "14:00:00"
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ start: "13:30:00", duration: 10, box_id: 5 }],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     * create conflicted box slot: start: "11:51:00", end: "12:51:00" + 10 min clean Up
     * that is conflicted with box slot: start: "13:00:00", end: "14:00:00"
     */
    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [{ start: "11:51:00", duration: 60, box_id: 5 }],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });

    await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [
          { start: "11:51:00", duration: 60, box_id: 5 },
          { start: "12:10:00", duration: 60, box_id: 5 },
        ],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
  });

  it("should return a 200 when non-conflicted slots time is provided", async () => {
    const response = await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [
          { start: "11:50:00", duration: 60, box_id: 5 },
          { start: "14:10:00", duration: 60, box_id: 5 },
          { start: "09:00:00", duration: 30, box_id: 5 },
          { start: "09:40:00", duration: 30, box_id: 5 },
        ],
      });

    expect(response.body).toMatchObject({
      boxSlot: [
        {
          id: expect.anything(),
          start: "11:50:00",
          duration: 60,
          BoxId: 5,
          ScheduleId: 10,
        },
        {
          id: expect.anything(),
          start: "14:10:00",
          duration: 60,
          BoxId: 5,
          ScheduleId: 10,
        },
        {
          id: expect.anything(),
          start: "09:00:00",
          duration: 30,
          BoxId: 5,
          ScheduleId: 10,
        },
        {
          id: expect.anything(),
          start: "09:40:00",
          duration: 30,
          BoxId: 5,
          ScheduleId: 10,
        },
      ],
    });
    const slotIds = response.body.boxSlot.map((slot) => slot.id);
    clearDb(slotIds);
  });

  it("should return 200 when created with correct payload and existing box id", async () => {
    const response = await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [{ start: "10:50:00", duration: 60, box_id: 1 }],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const boxSlotId = response.body.boxSlot[0].id;

    expect(response.body.boxSlot[0]).toMatchObject({
      id: expect.anything(),
      start: "10:50:00",
      duration: 60,
      BoxId: 1,
      ScheduleId: 10,
    });
    clearDb([boxSlotId]);
  });

  it("should return 200 when create multi box slots with correct payload and existing box id", async () => {
    const response = await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          { start: "20:00:00", duration: 20, box_id: 2 },
          { start: "20:10:00", duration: 20, box_id: 3 },
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    expect(response.body).toMatchObject({
      boxSlot: [
        {
          id: expect.anything(),
          start: "20:00:00",
          duration: 20,
          BoxId: 2,
          ScheduleId: 10,
        },
        {
          id: expect.anything(),
          start: "20:10:00",
          duration: 20,
          BoxId: 3,
          ScheduleId: 10,
        },
      ],
    });

    const slotIds = response.body.boxSlot.map((slot) => {
      return slot.id;
    });

    const getResponse = await server
      .post(`/dev/boxSlots/filter`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ schedule_id: 10 })
      .expect(200);

    const slotsFromFilter = getResponse.body.boxSlots.map((slot) => {
      return slot.id;
    });
    const createdSlots = slotIds.some((slot) => {
      return slotsFromFilter.includes(slot);
    });
    expect(createdSlots).toBeTruthy();
    clearDb(slotIds);
  });
});

describe("POST /boxSlots/link", () => {
  const payload = [
    {
      box_id: 3,
      duration: 90,
      start: "09:00:00",
    },
    {
      box_id: 4,
      duration: 90,
      start: "09:10:00",
    },
  ];

  const url = `/dev/boxSlots/link/`;

  const hook = () => {
    return server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders);
  };

  const clearDb = async (boxSlotLinkId, scheduleId = 10) => {
    await server
      .post(`/dev/boxSlots/link/delete`)
      .set("Authorization", `Basic ${token}`)
      .send({ schedule_id: scheduleId, slots: boxSlotLinkId })
      .set(commonHeaders)
      .expect(204, "");
  };

  it("should return a 400 when an invalid box slot start is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [
          [
            { ...payload[0], start: "not-a-valid-box-slot-start" },
            { ...payload[1], start: "not-a-valid-box-slot-start" },
          ],
        ],
      })
      .expect(400, {
        code: "019",
        message: `start time must be in the format ${TimeFormat}`,
      });
  });
  it("should return a 400 when box ids from different venue are provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [
          [
            { ...payload[0], box_id: 18 },
            { ...payload[1], box_id: 18 },
          ],
        ],
      })
      .expect(400, {
        code: "023",
        message: `this schedule is not associated to the venue`,
      });
  });
  it("should return a 400 when an unknown box ids are provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [
          [
            { ...payload[0], box_id: 1000000 },
            { ...payload[1], box_id: 1000001 },
          ],
        ],
      })
      .expect(400, {
        code: "017",
        message: `unknown box`,
      });
  });

  it("should return a 400 when an invalid box slot duration is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [
          [
            { ...payload[0], duration: "not-a-valid-box-slot-duration" },
            { ...payload[1], duration: "not-a-valid-box-slot-duration" },
          ],
        ],
      })
      .expect(400, {
        code: "019",
        message: "duration must be a number",
      });
  });

  it("should return a 400 when an invalid box id is provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [
          [
            { ...payload[0], box_id: "not-a-valid-box-id" },
            { ...payload[1], box_id: "not-a-valid-box-id" },
          ],
        ],
      })
      .expect(400, {
        code: "019",
        message: "box id must be a number",
      });
  });
  it("should return a 400 when an invalid schedule id is provided", () => {
    return hook()
      .send({
        schedule_id: "wrong-format",
        box_slots: [[payload]],
      })
      .expect(400, {
        code: "019",
        message: "schedule id must be a number",
      });
  });

  it("should return a 400 when not two box slots provided", () => {
    return hook()
      .send({
        schedule_id: 10,
        box_slots: [[{ ...payload[0], box_id: "not-a-valid-box-id" }]],
      })
      .expect(400, {
        code: "019",
        message:
          "two box slots are required to create availability for a double box booking",
      });
  });

  it("should return a 400 when conflicted linked slots time is provided", async () => {
    /**
     * we have box slot for shedule_id: 10, box_id: 1 from seeder:
     *  start: "16:00:00", end: "17:00:00"
     *
     * create conflicted box_slot link:
     *  box: 1 start: "16:00:00", end: "17:30:00"
     *  box: 2 start: "16:00:00", end: "17:30:00"
     */
    await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 1,
              duration: 90,
              start: "16:00:00",
            },
            {
              box_id: 2,
              duration: 90,
              start: "16:10:00",
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * create conflicted box_slots link:
     ** box: 1 start: "16:10:00", end: "16:20:00" + 10 min clean Up
     *  box: 2 start: "16:20:00", end: "16:30:00"
     *
     * with start: "16:00:00", end: "17:00:00", box: 1
     */
    await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 1,
              duration: 10,
              start: "16:10:00",
            },
            {
              box_id: 2,
              duration: 10,
              start: "16:20:00",
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * create conflicted box_slots link:
     ** box: 1 start: "14:51:00", end: "15:51:00" + 10 min clean Up
     *  box: 2 start: "15:01:00", end: "16:01:00"
     *
     * with start: "16:00:00", end: "17:00:00", box: 1
     */
    await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 1,
              duration: 60,
              start: "14:51:00",
            },
            {
              box_id: 2,
              duration: 60,
              start: "15:01:00",
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * create conflicted box_slots link:
     *  box: 1 start: "15:30:00", end: "17:30:00"
     *  box: 2 start: "15:40:00", end: "17:40:00"
     *
     * with start: "16:00:00", end: "17:00:00", box: 1
     */
    await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 1,
              duration: 120,
              start: "15:30:00",
            },
            {
              box_id: 2,
              duration: 120,
              start: "15:40:00",
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
  });

  it("should return a 200 when non-conflicted linked slots time is provided", async () => {
    const response = await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 4,
              duration: 90,
              start: "16:00:00",
            },
            {
              box_id: 5,
              duration: 90,
              start: "16:10:00",
              schedule_id: 10,
            },
          ],
          [
            {
              box_id: 4,
              duration: 90,
              start: "18:40:00",
            },
            {
              box_id: 5,
              duration: 90,
              start: "18:50:00",
              schedule_id: 10,
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);

    expect(response.body.boxSlotsById).toEqual([
      {
        id: expect.any(Number),
        start: "16:00:00",
        duration: 90,
        ScheduleId: 10,
        BoxId: 4,
        BoxSlotLinks: expect.any(Array),
      },
      {
        id: expect.any(Number),
        duration: 90,
        start: "16:10:00",
        ScheduleId: 10,
        BoxId: 5,
        BoxSlotLinks: expect.any(Array),
      },
      {
        id: expect.any(Number),
        start: "18:40:00",
        duration: 90,
        ScheduleId: 10,
        BoxId: 4,
        BoxSlotLinks: expect.any(Array),
      },
      {
        id: expect.any(Number),
        duration: 90,
        start: "18:50:00",
        ScheduleId: 10,
        BoxId: 5,
        BoxSlotLinks: expect.any(Array),
      },
    ]);
    const createdLinkSlots = response.body.boxSlotsById
      .map((slot) => {
        return {
          id: slot.id,
          link: slot.BoxSlotLinks.length && {
            linkId: slot.BoxSlotLinks[0]?.id,
            linkedSlotId: slot.BoxSlotLinks[0]?.linked_box_slot_id,
          },
        };
      })
      .filter((el) => el.link);

    const boxSlotLinkIds = createdLinkSlots.map((slot) => {
      return slot.link.linkId;
    });

    const getResponse = await server
      .post(`/dev/boxSlots/filter`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ schedule_id: 10 })
      .expect(200);

    const slotsFromFilter = getResponse.body.boxSlots.filter((slot) => {
      return slot.BoxSlotLinks.length;
    });

    const checkSlots = createdLinkSlots.some((slot) => {
      return slotsFromFilter.some((slotFromDb) => {
        if (
          slot.id === slotFromDb.id &&
          slot.link.linkId === slotFromDb.BoxSlotLinks[0].id &&
          slot.link.linkedSlotId ===
            slotFromDb.BoxSlotLinks[0].linked_box_slot_id
        ) {
          return true;
        }
        return false;
      });
    });
    expect(checkSlots).toBeTruthy();
    clearDb(boxSlotLinkIds);
  });

  it("should return 200 when create box slots link with correct payload and existing venue", async () => {
    const response = await server
      .post(url)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 4,
              duration: 30,
              start: "22:00:00",
            },
            {
              box_id: 5,
              duration: 30,
              start: "22:10:00",
              schedule_id: 10,
            },
          ],
        ],
      })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    const boxSlotLinkId = response.body.boxSlotsById[0].BoxSlotLinks[0].id;

    expect(response.body.boxSlotsById).toEqual([
      {
        id: expect.any(Number),
        start: "22:00:00",
        duration: 30,
        ScheduleId: 10,
        BoxId: 4,
        BoxSlotLinks: expect.any(Array),
      },
      {
        id: expect.any(Number),
        duration: 30,
        start: "22:10:00",
        ScheduleId: 10,
        BoxId: 5,
        BoxSlotLinks: expect.any(Array),
      },
    ]);
    clearDb([boxSlotLinkId]);
  });
});

describe("PATCH /boxSlots/{id}", () => {
  let boxSlotId;

  const postPayload = {
    schedule_id: 10,
    box_slots: [
      {
        start: "15:00:00",
        duration: 20,
        box_id: 3,
      },
    ],
  };

  const url = `/dev/boxSlots/`;

  const patchPayload = {
    start: "14:00:00",
    duration: 60,
    box_id: 2,
    schedule_id: 10,
  };

  beforeAll(async () => {
    /**
     *
     * create box_slot before patch endpoint test:
     *  schedule: 10, box: 3, start: "15:00:00", end: "15:20:00" + 10 min
     *
     */
    const response = await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(postPayload)
      .expect(200);
    boxSlotId = response.body.boxSlot[0].id;
  });

  afterAll(async () => {
    /**
     *
     * delete box_slot after patch endpoint test:
     *  schedule: 10, box: 3, start: "15:00:00", end: "15:20:00" + 10 min
     *
     */
    await server
      .post(`/dev/boxSlots/delete`)
      .send({ schedule_id: postPayload.schedule_id, slots: [boxSlotId] })
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(204);
  });

  it("when updating box slot then return 200", async () => {
    /**
     *
     * update box_slot:
     *  schedule: 10, box: 3, start: "15:00:00", end: "15:20:00" + 10 min
     *
     * to box: 2, start: "14:00:00", end: "15:00:00" + 10 min
     *
     */

    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(patchPayload)
      .expect(204, "");
  });

  it("when updating box slot with conflicted time then return 400", async () => {
    /**
     *
     * update box_slot to:
     *  box: 1, start: "16:00:00", end: "17:00:00"
     *
     * receive conflict with:
     *  start: "16:00:00", end: "17:00:00"
     */

    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "16:00:00", box_id: 1 })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
  });
  it("when updating box slot with conflicted time(cleaning time overlap) then return 400", async () => {
    /**
     *
     * update box_slot:
     *  box: 1, start: "17:09:00", end: "18:09:00"
     *
     * receive conflict with:
     *  start: "16:00:00", end: "17:00:00" + 10 min clean Up
     */
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "17:09:00", box_id: 1 })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * update box_slot:
     *  box: 1, start: "16:10:00", end: "16:20:00"
     *
     * receive conflict with:
     *  start: "16:00:00", end: "17:00:00"
     */
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "16:10:00", box_id: 1, duration: 10 })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * update box_slot:
     *  box: 1, start: "15:30:00", end: "17:30:00"
     *
     * receive conflict with:
     *  start: "16:00:00", end: "17:00:00" + 10 min
     */
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "15:30:00", box_id: 1, duration: 120 })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
    /**
     *
     * update box_slot:
     *  box: 1, start: "15:41:00", end: "15:51:00" + 10 min
     *
     * receive conflict with:
     *  start: "16:00:00", end: "17:00:00"
     */
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "15:41:00", box_id: 1, duration: 10 })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });
  });
  it("when updating box slot with non-conflicted time then return 200", async () => {
    await server
      .post(`/dev/boxSlots/`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 38,
        box_slots: [{ start: "16:00:00", duration: 60, box_id: 38 }],
      });
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "17:10:00", schedule_id: 38, box_id: 38 })
      .expect(204);
  });
  it("when updating box slot with wrong start time then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, start: "wrong start time" })
      .expect(400, {
        code: "019",
        message: `start time must be in the format ${TimeFormat}`,
      });
  });

  it("when updating box slot with wrong duration then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, duration: "wrong-duration" })
      .expect(400, { code: "019", message: "duration must be a number" });
  });
  it("when updating box slot that doesn't exist then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/200000000`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload })
      .expect(400, { code: "016", message: "unknown box slot" });
  });

  it("should return a 400 when an invalid box id is provided", async () => {
    await server
      .patch(`/dev/boxSlots/${boxSlotId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({ ...patchPayload, box_id: "wrong-id" })
      .expect(400, {
        code: "019",
        message: "box id must be a number",
      });
  });
});

describe("PATCH /boxSlots/link/{id}", () => {
  let firstSlotId;
  let secondSlotId;
  let linkedId;

  const postPayload = {
    schedule_id: 10,
    box_slots: [
      [
        {
          box_id: 1,
          duration: 90,
          start: "09:00:00",
        },
        {
          box_id: 2,
          duration: 90,
          start: "09:10:00",
          schedule_id: 10,
        },
      ],
    ],
  };

  const url = `/dev/boxSlots/link/`;

  const patchPayload = {
    slots: [
      {
        start: "14:00:00",
        duration: 20,
        box_id: 3,
      },
      {
        start: "14:10:00",
        duration: 20,
        box_id: 4,
      },
    ],
  };

  beforeAll(async () => {
    /**
     *
     * create box_slot link before patch box slot link endpoint test:
     *  box: 3, duration: 90, start: "12:00:00",
     *  box_id: 4, duration: 90, start: "12:10:00",
     *
     */

    const response = await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send(postPayload)
      .expect(200);
    firstSlotId = response.body.boxSlotsById[0].id;
    secondSlotId = response.body.boxSlotsById[1].id;
    linkedId = response.body.boxSlotsById[0].BoxSlotLinks[0].id;
  });

  afterAll(async () => {
    /**
     *
     * delete box_slot link after patch box slot link endpoint test:
     *  box: 3, duration: 90, start: "12:00:00",
     *  box_id: 4, duration: 90, start: "12:10:00",
     *
     */
    await server
      .post(`/dev/boxSlots/link/delete`)
      .set("Authorization", `Basic ${token}`)
      .send({ schedule_id: 10, slots: [linkedId] })
      .set(commonHeaders)
      .expect(204, "");
  });

  it("when updating box slot then return 200", async () => {
    /**
     *
     * patch box slot link to:
     *  box: 3, start: "14:00:00", end: "14:20:00"
     *  box: 4, start: "14:10:00", end: "14:30:00"
     *
     */
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], slot_id: firstSlotId },
          { ...patchPayload.slots[1], slot_id: secondSlotId },
        ],
      })
      .expect(204, "");
  });

  it("when updating box slot link with conflicted time then return 400", async () => {
    /**
     *
     * create box slot link to compare with pathc link box slots:
     *  box: 4, start: "17:00:00", end: "18:00:00"
     *  box: 5, start: "17:10:00", end: "18:10:00"
     *
     */
    const response = await server
      .post(url)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        schedule_id: 10,
        box_slots: [
          [
            {
              box_id: 4,
              duration: 60,
              start: "17:00:00",
            },
            {
              box_id: 5,
              duration: 60,
              start: "17:10:00",
            },
          ],
        ],
      })
      .expect(200);

    const linkIdPatch = response.body.boxSlotsById[0].BoxSlotLinks[0].id;

    /**
     *
     * patch box slot link to:
     *  box: 4, start: "16:30:00", end: "18:30:00"
     *  box: 5, start: "16:40:00", end: "18:40:00"
     *
     * conflicted with:
     *  box: 4, start: "17:00:00", end: "18:00:00"
     *  box: 5, start: "17:10:00", end: "18:10:00"
     *
     */
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          {
            slot_id: firstSlotId,
            start: "16:30:00",
            duration: 120,
            box_id: 4,
          },
          {
            slot_id: secondSlotId,
            start: "16:40:00",
            duration: 120,
            box_id: 5,
          },
        ],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });

    /**
     *
     * patch box slot link to:
     *  box: 2, start: "17:00:00", end: "17:20:00"
     *  box: 5, start: "16:51:00", end: "17:01:00" + 10 min
     *
     * conflicted with:
     *  box: 5, start: "17:10:00", end: "18:10:00"
     *
     */
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          {
            slot_id: firstSlotId,
            start: "17:00:00",
            duration: 10,
            box_id: 2,
          },
          {
            slot_id: secondSlotId,
            start: "16:51:00",
            duration: 10,
            box_id: 5,
          },
        ],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });

    /**
     *
     * patch box slot link to:
     *  box: 4, start: "17:10:00", end: "17:20:00"
     *  box: 5, start: "17:20:00", end: "17:30:00"
     *
     * conflicted with:
     *  box: 4, start: "17:00:00", end: "18:00:00"
     *  box: 5, start: "17:10:00", end: "18:10:00"
     *
     */
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          {
            slot_id: firstSlotId,
            start: "17:10:00",
            duration: 10,
            box_id: 4,
          },
          {
            slot_id: secondSlotId,
            start: "17:20:00",
            duration: 10,
            box_id: 5,
          },
        ],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });

    /**
     *
     * patch box slot link to:
     *  box: 4, start: "18:09:00", end: "18:19:00"
     *  box: 5, start: "18:19:00", end: "18:29:00"
     *
     * conflicted with:
     *  box: 4, start: "17:00:00", end: "18:00:00" + 10 min
     *  box: 5, start: "17:10:00", end: "18:10:00" + 10 min
     *
     */
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          {
            slot_id: firstSlotId,
            start: "18:09:00",
            duration: 10,
            box_id: 4,
          },
          {
            slot_id: secondSlotId,
            start: "18:19:00",
            duration: 10,
            box_id: 5,
          },
        ],
      })
      .expect(400, {
        code: "033",
        message: "conflicted box slot",
      });

    await server
      .post(`/dev/boxSlots/link/delete`)
      .set("Authorization", `Basic ${token}`)
      .send({ schedule_id: 10, slots: [linkIdPatch] })
      .set(commonHeaders)
      .expect(204, "");
  });

  it("when updating box slot linked with wrong box id wrong format then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], box_id: "worng-id" },
          { ...patchPayload.slots[1], box_id: "worng-id" },
        ],
      })
      .expect(400, {
        code: "019",
        message: "box id must be a number",
      });
  });

  it("when updating box slot linked with wrong start time then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], start: "wrong start time" },
          { ...patchPayload.slots[1], start: "wrong start time" },
        ],
      })
      .expect(400, {
        code: "019",
        message: `start time must be in the format ${TimeFormat}`,
      });
  });

  it("when updating box slot linked with wrong duration then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], duration: "wrong-duration" },
          { ...patchPayload.slots[1], duration: "wrong-duration" },
        ],
      })
      .expect(400, { code: "019", message: "duration must be a number" });
  });

  it("when updating box slot linked with wrong box slot id format then return 400", async () => {
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], slot_id: "wrong-slot_id" },
          { ...patchPayload.slots[1], slot_id: "wrong-slot_id" },
        ],
      })
      .expect(400, { code: "019", message: "slot id must be a number" });
  });
  it("when updating linked box slot with wrong box slot id then return 404", async () => {
    await server
      .patch(`/dev/boxSlots/link/${linkedId}`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], slot_id: 10 },
          { ...patchPayload.slots[1], slot_id: 10000 },
        ],
      })
      .expect(404, { code: "018", message: "unknown linked box slot" });
  });
  it("when updating linked box slot with wrong link id then return 404", async () => {
    await server
      .patch(`/dev/boxSlots/link/10000000`)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .send({
        slots: [
          { ...patchPayload.slots[0], slot_id: firstSlotId },
          { ...patchPayload.slots[1], slot_id: secondSlotId },
        ],
      })
      .expect(404, {
        code: "018",
        message: "unknown linked box slot",
      });
  });
});

describe("POST /boxSlots/delete", () => {
  let id;
  const url = `/dev/boxSlots`;

  const payload = {
    schedule_id: 10,
    box_slots: [
      {
        start: "13:00:00",
        duration: 20,
        box_id: 4,
      },
    ],
  };

  beforeAll(async () => {
    const response = await server
      .post(url)
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    id = response.body.boxSlot[0].id;
  });

  it("Should return 204 when delete by id is successful", async () => {
    await server
      .post(`${url}/delete`)
      .send({ schedule_id: payload.schedule_id, slots: [id] })
      .set(commonHeaders)
      .expect(204);
  });

  it("Should return 400 when boxSlotIds is not an arrray", async () => {
    await server
      .post(`${url}/delete`)
      .send({ schedule_id: payload.schedule_id, slots: id })
      .set(commonHeaders)
      .expect(400, {
        code: "030",
        message: "box slot id's need to be passed in an array format",
      });
  });

  it("Should return 400 when passed one of the linked slots id", async () => {
    await server
      .post(`${url}/delete`)
      .send({ schedule_id: 4, slots: [296, 297] })
      .set(commonHeaders)
      .expect(400, {
        code: "029",
        message: "linked slots must be deleted together",
      });
  });
});

describe("POST /boxSlots/link/delete", () => {
  let id;
  const url = `/dev/boxSlots/link`;
  const payload = {
    schedule_id: 10,
    box_slots: [
      [
        {
          box_id: 4,
          duration: 90,
          start: "15:00:00",
        },
        {
          box_id: 5,
          duration: 90,
          start: "15:10:00",
          schedule_id: 10,
        },
      ],
    ],
  };

  beforeAll(async () => {
    const response = await server
      .post(url)
      .send(payload)
      .set("Authorization", `Basic ${token}`)
      .set(commonHeaders)
      .expect(200);
    id = response.body.boxSlotsById[0].BoxSlotLinks[0].id;
  });

  it("Should return 200 when delete by id is successful", async () => {
    await server
      .post(`${url}/delete`)
      .send({ schedule_id: payload.schedule_id, slots: [id] })
      .set(commonHeaders)
      .expect(204, "");
  });

  it("Should return 400 when boxSlotLinkIds is not an arrray", async () => {
    await server
      .post(`${url}/delete`)
      .send({ schedule_id: payload.schedule_id, slots: id })
      .set(commonHeaders)
      .expect(400, {
        code: "031",
        message: "box slot link ids need to be passed in an array format",
      });
  });
});
