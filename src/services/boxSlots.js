/* eslint-disable arrow-body-style */
const { isMatch, addMinutes, format, subMinutes } = require("date-fns");
const { Op } = require("sequelize");

const baseService = require("./baseService");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { db, retryWithTransaction } = require("../lib/db");
const { Cleanup, countDateWithTime, TimeFormat } = require("./const");
/* eslint-disable arrow-body-style */

const validateData = (data) => {
  const errors = [];

  if (data.start && !isMatch(data.start, TimeFormat)) {
    errors.push(`start time must be in the format ${TimeFormat}`);
  }

  if (data.duration && typeof data.duration !== "number") {
    errors.push("duration must be a number");
  }

  if (data.box_id && typeof data.box_id !== "number") {
    errors.push("box id must be a number");
  }

  if (data.slot_id && typeof data.slot_id !== "number") {
    errors.push("slot id must be a number");
  }

  if (errors.length) {
    throw new ValidationError("019", errors.join(", "));
  }
};

const validateScheduleId = (data) => {
  const errors = [];
  if (!data.schedule_id) {
    errors.push("schedule id required");
  }

  if (data.schedule_id && typeof data.schedule_id !== "number") {
    errors.push("schedule id must be a number");
  }

  if (errors.length) {
    throw new ValidationError("019", errors.join(", "));
  }
};

/**
Box slot end time doesn't store in db.
In this function we add "duration" minutes to "start" time, and get "end" time for box slot.
optionally we can add slotInterval, currently it's 10 min clean up time after each slot ended.
@param {String} start start time of box slot "HH:mm:ss"
@param {Integer} duration duration of box slot in minutes
@param {Integer} cleanUp *optionally  clean up time after each box slot "end"
@returns {String} "end" time of box slots "HH:mm:ss" 
*/
const countSlotEndTime = (start, duration, cleanUp = 0) => {
  return format(
    addMinutes(countDateWithTime(start), duration + cleanUp),
    TimeFormat
  );
};

/**
Function to subtract clean up time from "start" time of box slot for more convenient 
searching inside a checkDuplicateSlot function.
@param {String} start start time of box slot "HH:mm:ss"
@returns {String} time of box slots without clean up time "HH:mm:ss"  
*/
const subSlotInterval = (start) => {
  return format(subMinutes(countDateWithTime(start), Cleanup), TimeFormat);
};

/**
Search conflicted box slot ("b.s") that overlapped box slot ("new b.s") that we need to create/update
Checked such condition inside:

(b.s start < new b.s start time + clean Up 
AND
b.s end + clean Up > new b.s start)

OR
(b.s start >= new b.s start 
AND
b.s start < new b.s start + clean Up)

OR
(b.s end + clean Up > new b.s start 
AND
b.s end  <= new b.s end + clean Up)

@param {Integer} scheduleId id of specific schedule
@param {Integer} boxId id of specific box
@param {String} start start time of box slot "HH:mm:ss"
@param {Integer} duration duration of box slot in minutes
@param {Object} transaction The Transaction object
@param {Object} sequelize The Sequelize object
@returns {Array} array of object { start, duration, id, box }  
*/
const checkDuplicateSlot = async (
  scheduleId,
  boxId,
  start,
  duration,
  sequelize
) => {
  const { BoxSlot } = await db(sequelize);

  // sequelize function that count end time for box slot inside query
  const countEndTimeInSequelize = () => {
    return sequelize.fn(
      "ADDDATE",
      sequelize.col("BoxSlot.start"),
      sequelize.literal(`INTERVAL BoxSlot.duration MINUTE`)
    );
  };

  const result = await BoxSlot.findAll({
    attributes: ["start", "duration", "id", "BoxId"],
    where: {
      schedule_id: scheduleId,
      box_id: boxId,
      [Op.or]: [
        {
          [Op.and]: [
            {
              start: {
                [Op.lt]: countSlotEndTime(start, duration, Cleanup),
              },
            },
            {
              duration: sequelize.where(
                countEndTimeInSequelize(),
                ">",
                subSlotInterval(start)
              ),
            },
          ],
        },
        {
          start: {
            [Op.and]: [
              { [Op.gte]: start },
              {
                [Op.lt]: countSlotEndTime(start, duration, Cleanup),
              },
            ],
          },
        },
        {
          [Op.and]: [
            {
              duration: sequelize.where(
                countEndTimeInSequelize(),
                ">",
                subSlotInterval(start)
              ),
            },
            {
              duration: sequelize.where(
                countEndTimeInSequelize(),
                "<=",
                countSlotEndTime(start, duration, Cleanup)
              ),
            },
          ],
        },
      ],
    },
  });
  return result.map((slot) => {
    return {
      start: slot.start,
      duration: slot.duration,
      id: slot.id,
      box: slot.BoxId,
    };
  });
};

const updateSlot = async (slot, id, linkSlots, transaction, sequelize) => {
  const { BoxSlot } = await db(sequelize);

  const { start, duration, box_id: boxId } = slot;

  const boxSlot = await BoxSlot.findByPk(id, { transaction });

  if (!boxSlot) {
    throw new NotFoundError("016");
  }

  const conflictedSlots = await checkDuplicateSlot(
    boxSlot.ScheduleId,
    boxId,
    start,
    duration,
    sequelize
  );
  if (conflictedSlots.length > 1) {
    throw new ValidationError("033");
  }
  if (!linkSlots) {
    if (conflictedSlots.length === 1) {
      if (boxSlot.id !== conflictedSlots[0].id) {
        throw new ValidationError("033");
      }
    }
  }
  if (linkSlots) {
    if (conflictedSlots.length === 1) {
      if (
        linkSlots[0] !== conflictedSlots[0].id &&
        linkSlots[1] !== conflictedSlots[0].id
      ) {
        throw new ValidationError("033");
      }
    }
  }

  try {
    const update = await boxSlot.update(
      {
        start,
        duration,
      },
      { transaction }
    );
    await update.setBox(boxId, { transaction });
  } catch (error) {
    throw new ValidationError(error.code ?? 500, error.message);
  }
};

const updateBoxSlot = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const { id } = event.pathParameters;

    validateData(body);
    const transaction = await sequelize.transaction();
    try {
      await updateSlot(body, id, null, transaction, sequelize);
      await transaction.commit();
    } catch (error) {
      console.error("Error when updating box slot: ", error);
      await transaction.rollback();
      throw new ValidationError(error.code ?? 500, error.message);
    }
    return {
      statusCode: 204,
      body: null,
    };
  });
};

const updateLinkedBoxSlot = (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const { id } = event.pathParameters;

    body.slots.forEach((slot) => {
      validateData(slot);
    });

    const { BoxSlotLink } = await db(sequelize);
    const firstSlotId = body.slots[0]?.slot_id;
    const secondSlotId = body.slots[1]?.slot_id;

    const linkedSlot = await BoxSlotLink.findOne({
      where: {
        [Op.and]: [
          { id },
          { box_slot_id: firstSlotId },
          { linked_box_slot_id: secondSlotId },
        ],
      },
    });

    if (!linkedSlot) {
      throw new NotFoundError("018");
    }

    const transaction = await sequelize.transaction();
    try {
      await Promise.all(
        body.slots.map((slot) => {
          return updateSlot(
            slot,
            slot.slot_id,
            [firstSlotId, secondSlotId],
            transaction,
            sequelize
          );
        })
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Error when update box slot link: ", error);
      throw new ValidationError(error.code ?? 500, error.message);
    }
    return {
      statusCode: 204,
      body: null,
    };
  });
};

const filter = async (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received", event);
    const data = JSON.parse(event.body);

    validateScheduleId(data);

    const { Box, BoxSlot, BoxSlotLink, Schedule, BoxSection } = await db(
      sequelize
    );
    const schedule = await Schedule.findByPk(data.schedule_id);

    if (!schedule) {
      throw new NotFoundError("021");
    }

    const boxSlots = await BoxSlot.findAll({
      where: {
        schedule_id: schedule.id,
      },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Box,
          attributes: ["id", "name"],
          include: { model: BoxSection, attributes: ["id", "name"] },
        },
        { model: BoxSlotLink, attributes: ["id", "linked_box_slot_id"] },
      ],
    });

    return {
      body: { boxSlots },
    };
  });
};

const parseSlot = (slot = {}) => {
  return {
    id: slot.id,
    start: slot.start,
    duration: slot.duration,
    ScheduleId: slot.ScheduleId,
    BoxId: slot.BoxId,
  };
};

/**
 *  Copy boxslots without the validation that comes with creating boxSlots
 *  this is with the assumption that if a boxslots is to be copied it is already validated
 *  @param {Integer} ScheduleId API data in the path, which indicates to which particular schedule the slots are created
 *  @param {Array} boxSlots API data in the form [ {start-time, duration, boxId, scheduleId}, ... ]
 *  @param {Object} transaction The Transaction object
 *  @param {Object} sequelize The Sequelize object
 *  @returns {Array} Parsed slot data in the form [ {id, start, duration, ScheduleId, BoxId}, ... ]
 */

const createSlotHelper = async (
  ScheduleId,
  boxSlots,
  transaction,
  sequelize
) => {
  const createSlotsData = boxSlots.map(
    ({ start, duration, box_id: BoxId }) => ({
      start,
      duration,
      BoxId,
      ScheduleId,
    })
  );

  try {
    const { BoxSlot } = await db(sequelize);
    const boxSlot = await BoxSlot.bulkCreate(createSlotsData, { transaction });
    return boxSlot.map(parseSlot);
  } catch (error) {
    throw new ValidationError(error.code ?? 500, error.message);
  }
};

/**

Creates one or many slots across one or many boxes within a single schedule
The API data array can be supplied as one or many rows in the form described
Each row in the supplied data array will be supplied in the returned array
@param {Integer} ScheduleId API data in the path, which indicates to which particular schedule the slots are created
@param {Array} boxSlots API data in the form [ {start-time, duration, boxId, scheduleId}, ... ]
@param {Object} transaction The Transaction object
@param {Object} sequelize The Sequelize object
@returns {Array} Parsed slot data in the form [ {id, start, duration, ScheduleId, BoxId}, ... ]
*/
const createSlot = async (ScheduleId, boxSlots, transaction, sequelize) => {
  // create array of box ids without duplication
  const boxIds = [
    ...new Set(
      boxSlots.map((slot) => {
        return slot.box_id;
      })
    ),
  ];

  const { Box, VenueSchedule } = await db(sequelize);

  const boxes = await Box.findAll({
    where: { id: { [Op.in]: boxIds } },
    attributes: ["VenueId"],
  });
  // create array of unique venueId, we should have boxes from only 1 venue, so this array should contain only 1 venue
  const VenueId = [
    ...new Set(
      boxes.map((box) => {
        return box.VenueId;
      })
    ),
  ];

  if (boxes.length !== boxIds.length || VenueId.length !== 1) {
    throw new ValidationError("017");
  }

  const venueSchedule = await VenueSchedule.findOne({
    where: {
      venue_id: VenueId[0],
      schedule_id: ScheduleId,
    },
    attributes: ["ScheduleId"],
  });

  if (!venueSchedule) {
    throw new ValidationError("023");
  }
  await Promise.all(
    boxSlots.map(async ({ box_id: boxId, start, duration }) => {
      const slots = await checkDuplicateSlot(
        ScheduleId,
        boxId,
        start,
        duration,
        sequelize
      );

      if (slots.length) {
        throw new ValidationError("033");
      }
      return slots;
    })
  );

  const groupByBox = boxSlots.reduce((acc, slot) => {
    acc[slot.box_id] = acc[slot.box_id] || [];
    acc[slot.box_id].push(slot);
    return acc;
  }, []);

  const conflictedSlots = [];

  groupByBox.forEach((el) => {
    const sorted = el.sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (
        countSlotEndTime(sorted[i].start, sorted[i].duration, 9) >=
        sorted[i + 1].start
      ) {
        conflictedSlots.push([sorted[i], sorted[i + 1]]);
      }
    }
  });

  if (conflictedSlots.length) {
    throw new ValidationError("033");
  }

  const createdSlots = await createSlotHelper(
    ScheduleId,
    boxSlots,
    transaction,
    sequelize
  );
  return createdSlots;
};

/**

API action method to create one or more box slots
The JSON payload can come as an array in the form
{
  schedule_id: Number,
  box_slots: [
        {box_id, start, duration},
        {box_id, start, duration},
        ...
    ]
  ]
}
@url /boxSlots
@param {Request} Request payload in the form of a raw JSON
@returns {Response} JSON A single row or multi-row result

A db-transaction pre-wraps the call to the function to create the box-slots
and passes responsibility to Sequelize to auto-commit to resolve the latency
issue we experience with visibility of box-slots immediate after they are created
*/

const createBoxSlots = async (event) => {
  return baseService(async (sequelize) => {
    const data = JSON.parse(event.body);
    const { schedule_id: scheduleId, box_slots: boxSlots } = data;

    validateScheduleId(data);
    boxSlots.forEach((slot) => {
      validateData(slot);
    });

    try {
      const boxSlot = await sequelize.transaction(async (transaction) => {
        const slots = await createSlot(
          scheduleId,
          boxSlots,
          transaction,
          sequelize
        );
        return slots;
      });

      return {
        body: { boxSlot },
        statusCode: 200,
      };
    } catch (error) {
      console.error("[boxSlotCreate]: Error when creating box slot", error);
      throw new ValidationError(error.code ?? 500, error.message);
    }
  });
};

/**

API action method to create one or more linked box slots
The JSON payload come as an object of arrays in the form
{
  schedule_id: Number,
  box_slots: [
      [
        {box_id, start, duration},
        {box_id, start, duration},
      ],
      [
        {box_id, start, duration},
        {box_id, start, duration}
      ],
      ...
    ]
  ]
}
@url /boxSlots/link
@param {Request} Request payload in the form of a raw JSON
@returns {Response} JSON multi-row result

A db-transaction pre-wraps the call to the function to create the box-slots
and passes responsibility to Sequelize to auto-commit to resolve the latency
issue we experience with visibility of box-slots immediate after they are created
*/
const createLinkedBoxSlots = async (event) => {
  return baseService(async (sequelize) => {
    const data = JSON.parse(event.body);
    const { schedule_id: scheduleId, box_slots: boxSlotsLink } = data;

    const { BoxSlotLink } = await db(sequelize);

    validateScheduleId(data);
    boxSlotsLink.forEach((links) => {
      if (!links || links.length !== 2) {
        throw new ValidationError(
          "019",
          "two box slots are required to create availability for a double box booking"
        );
      }

      return links.forEach(validateData);
    });

    const slots = boxSlotsLink.reduce((acc, links) => {
      return [
        ...acc,
        ...links.map((slot) => {
          return slot;
        }),
      ];
    }, []);

    try {
      const boxSlotsById = await sequelize.transaction(async (transaction) => {
        const boxSlots = await createSlot(
          scheduleId,
          slots,
          transaction,
          sequelize
        );

        const createLinkData = boxSlots.reduce((acc, slot, i, arr) => {
          return i === 0 || (!(i % 2) && i < arr.length - 1)
            ? [
                ...acc,
                {
                  BoxSlotId: slot.id,
                  linked_box_slot_id: arr[i + 1].id,
                },
              ]
            : acc;
        }, []);

        const boxSlotLinked = await BoxSlotLink.bulkCreate(createLinkData, {
          transaction,
        });

        const result = boxSlots.reduce((acc, boxSlot) => {
          acc.push({
            ...parseSlot(boxSlot),
            BoxSlotLinks: boxSlotLinked
              .filter((link) => link.BoxSlotId === boxSlot.id)
              .map(({ id, linked_box_slot_id: slotId }) => ({
                id,
                linked_box_slot_id: slotId,
              })),
          });
          return acc;
        }, []);

        return result;
      });

      return {
        body: { boxSlotsById },
      };
    } catch (error) {
      console.error("Error creating boxSlotLink", error);
      throw new ValidationError(error.code ?? 500, error.message);
    }
  });
};

const copyBoxSlots = async (boxSlots, newScheduleId, transaction) => {
  return baseService(async (sequelize) => {
    const { BoxSlotLink } = await db(sequelize);
    const linkPairs = [];
    const result = [];

    boxSlots.forEach((link) => {
      if (link.boxSlotLink.length > 0) {
        const linkedSlot = boxSlots.find(
          (slot) => link.boxSlotLink[0].linked_box_slot_id === slot.id
        );
        linkPairs.push(link, linkedSlot);
      }
    });

    const singleSlots = boxSlots.filter((slot) => {
      return !linkPairs.includes(slot);
    });

    try {
      const createSingleSlots = await createSlotHelper(
        newScheduleId,
        singleSlots,
        transaction,
        sequelize
      );

      const createLinkedSlots = await createSlotHelper(
        newScheduleId,
        linkPairs,
        transaction,
        sequelize
      );
      const createLinkData = createLinkedSlots.reduce((acc, slot, i, arr) => {
        if (i === 0 || (!(i % 2) && i < arr.length - 1)) {
          return [
            ...acc,
            {
              BoxSlotId: slot.id,
              linked_box_slot_id: arr[i + 1].id,
            },
          ];
        }
        return acc;
      }, []);
      const boxSlotLinked = await BoxSlotLink.bulkCreate(createLinkData, {
        transaction,
      });

      const linked = createLinkedSlots.reduce((acc, boxSlot) => {
        acc.push({
          ...parseSlot(boxSlot),
          BoxSlotLinks: boxSlotLinked
            .filter((link) => link.BoxSlotId === boxSlot.id)
            .map(({ id, linked_box_slot_id: slotId }) => ({
              id,
              linked_box_slot_id: slotId,
            })),
        });
        return acc;
      }, []);
      result.push(createSingleSlots, linked);
    } catch (error) {
      console.error("Error while copying the slots of the schedule: ", error);
      throw new ValidationError(error.code, error.message);
    }

    return {
      body: {
        boxSlots: result,
      },
    };
  });
};

const deleteBoxSlots = async (event) => {
  return baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const data = JSON.parse(event.body);
    const { slots, schedule_id: scheduleId } = data;
    if (!Array.isArray(slots)) {
      throw new ValidationError("030");
    }
    const { BoxSlot, BoxSlotLink } = await db(sequelize);

    await retryWithTransaction(sequelize, async (transaction) => {
      // check the schedule_id against slots
      const checkBoxSlot = await BoxSlot.findAll({
        where: {
          schedule_id: scheduleId,
          id: {
            [Op.in]: slots,
          },
        },
        transaction,
      });
      if (checkBoxSlot.length) {
        const checkLinkedSlot = await BoxSlotLink.findAll({
          where: {
            [Op.or]: [{ box_slot_id: slots }, { linked_box_slot_id: slots }],
          },
          transaction,
        });

        if (checkLinkedSlot.length) {
          throw new ValidationError("029");
        }
        try {
          const deletedBoxSlot = await BoxSlot.destroy({
            where: {
              id: { [Op.in]: slots },
            },
            transaction,
          });
          console.log("Delete performed. Affected rows: ", deletedBoxSlot);
        } catch (error) {
          console.error("Error when deleting box slot", error);

          throw new ValidationError(error.code ?? 500, error.message);
        }
      }
    });

    return {
      statusCode: 204,
      body: null,
    };
  });
};

const deleteBoxSlotLink = async (event) => {
  return baseService(async (sequelize) => {
    const data = JSON.parse(event.body);
    console.log("Event received", event);
    const { schedule_id: scheduleId, slots: boxSlotLinkIds } = data;
    if (!Array.isArray(boxSlotLinkIds)) {
      throw new ValidationError("031");
    }
    const { BoxSlotLink, BoxSlot } = await db(sequelize);
    try {
      await sequelize.transaction(async (transaction) => {
        const boxSlotsLinked = await BoxSlotLink.findAll({
          where: {
            id: {
              [Op.in]: boxSlotLinkIds,
            },
          },
          transaction,
        });
        const boxSlotLinkIdsToDelete = [
          ...new Set(
            boxSlotsLinked.map((slot) => {
              return slot.id;
            })
          ),
        ];
        const slotIds = boxSlotsLinked.reduce((slots, curr) => {
          const { BoxSlotId, linked_box_slot_id: linkedBoxSlot } = curr;
          slots.push(BoxSlotId, linkedBoxSlot);
          return slots;
        }, []);

        const checkBoxSlot = await BoxSlot.findAll({
          where: {
            schedule_id: scheduleId,
            id: {
              [Op.in]: slotIds,
            },
          },
          transaction,
        });

        if (checkBoxSlot.length) {
          await BoxSlotLink.destroy({
            where: {
              id: { [Op.in]: boxSlotLinkIdsToDelete },
            },
            transaction,
          });
          await BoxSlot.destroy({
            where: {
              id: {
                [Op.in]: slotIds,
              },
            },
            transaction,
          });
        }
      });
    } catch (error) {
      console.error("Error deleting boxslot Links :", error);
      throw new ValidationError("032");
    }
    return {
      statusCode: 204,
      body: null,
    };
  });
};

module.exports = {
  updateBoxSlot,
  updateLinkedBoxSlot,
  filter,
  createBoxSlots,
  createLinkedBoxSlots,
  deleteBoxSlots,
  deleteBoxSlotLink,
  copyBoxSlots,
};
