const {
  eachDayOfInterval,
  getDay,
  eachWeekOfInterval,
  eachMonthOfInterval,
  getWeekOfMonth,
  endOfWeek,
  getDate,
  endOfMonth,
  eachYearOfInterval,
  endOfYear,
  getMonth,
  startOfMonth,
  lastDayOfMonth,
  getWeeksInMonth,
  getYear,
} = require("date-fns");

const baseService = require("./baseService");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { db } = require("../lib/db");

const validateData = (data) => {
  const errors = [];

  const ALLOWED_RECURRENCE_TYPES = ["monthly", "weekly", "yearly"];

  if (!ALLOWED_RECURRENCE_TYPES.includes(data.recurrence_type)) {
    errors.push("recurrence type is not valid");
  }

  if (data.recurrence_type === "weekly" && data.day_of_week.length === 0) {
    errors.push("in a weekly recurrence, 'day_of_week' value is required");
  }

  if (
    data.recurrence_type === "monthly" &&
    data.day_of_month.length === 0 &&
    data.week_of_month.length === 0
  ) {
    errors.push(
      "in a monthly recurrence, 'day_of_month' or 'week_of_month' values are required"
    );
  }

  if (data.recurrence_type === "yearly" && data.month_of_year.length === 0) {
    errors.push("in a yearly recurrence, 'month_of_year' value is required");
  }
  data.day_of_week.forEach((el) =>
    el > 7 || el < 1
      ? errors.push(
          "'day_of_week' value must be number and in the range from 1 to 7"
        )
      : true
  );

  if (typeof data.separation_count !== "number") {
    errors.push("separation count must be an integer");
  }
  data.week_of_month.forEach((el) =>
    el < 1 || el > 6
      ? errors.push(
          "'week_of_month' value must be number and in the range from 1 to 6"
        )
      : true
  );

  data.day_of_month.forEach((el) =>
    el < 1 || el > 31
      ? errors.push(
          "'day_of_month' value must be number and in the range from 1 to 31"
        )
      : true
  );

  data.month_of_year.forEach((el) =>
    el < 1 || el > 12
      ? errors.push(
          "'month_of_year' value must be number and in the range from 1 to 12"
        )
      : true
  );

  if (errors.length) {
    throw new ValidationError("013", errors.join(","));
  }
};

const getValidLastWeek = (weeksCount, month, recDayOfWeek) => {
  const monthWeeks = eachWeekOfInterval(
    { start: month, end: endOfMonth(month) },
    { weekStartsOn: 1 }
  );

  let lastWeekDays;
  const recWeekDayMax = Math.max(...recDayOfWeek);
  const lastDayNumber = getDay(endOfMonth(month, { weekStartsOn: 1 }));

  if (weeksCount === 6) {
    if (lastDayNumber >= recWeekDayMax || lastDayNumber === 0) {
      lastWeekDays = eachDayOfInterval({
        start: monthWeeks[5],
        end: endOfWeek(monthWeeks[5], { weekStartsOn: 1 }),
      });
    } else {
      lastWeekDays = eachDayOfInterval({
        start: monthWeeks[4],
        end: endOfWeek(monthWeeks[4], { weekStartsOn: 1 }),
      });
    }
  }

  if (weeksCount === 5) {
    if (lastDayNumber >= recWeekDayMax || lastDayNumber === 0) {
      lastWeekDays = eachDayOfInterval({
        start: monthWeeks[4],
        end: endOfWeek(monthWeeks[4], { weekStartsOn: 1 }),
      });
    } else {
      lastWeekDays = eachDayOfInterval({
        start: monthWeeks[3],
        end: endOfWeek(monthWeeks[3], { weekStartsOn: 1 }),
      });
    }
  }
  return lastWeekDays;
};

const calculateRecurrenceDates = async (recurrence, schedule) => {
  const dates = [];
  try {
    const start = new Date(schedule.from);
    const end = new Date(schedule.to);

    if (!recurrence) {
      const daysBetween = eachDayOfInterval({ start, end });
      daysBetween.forEach((date) => {
        if (date >= start && date <= end) dates.push(date);
      });
    } else {
      if (recurrence.recurrenceType === "weekly") {
        if (recurrence.separationCount === 1) {
          const passedWeeks = eachWeekOfInterval(
            { start, end },
            { weekStartsOn: 0 }
          );

          for (let i = 0; i < passedWeeks.length; i += 1) {
            const weekDays = eachDayOfInterval({
              start: passedWeeks[i],
              end: endOfWeek(passedWeeks[i]),
            });

            weekDays.forEach((date) => {
              const weekDayNumber = getDay(date);

              recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                if (
                  weekDayNumber === recWeekDayNumber &&
                  date >= start &&
                  date <= end
                )
                  dates.push(date);
              });
            });
          }
        }

        if (recurrence.separationCount > 1) {
          const passedWeeks = eachWeekOfInterval(
            { start, end },
            { weekStartsOn: 0 }
          );

          let skipCount = null;

          for (let i = 0; i < passedWeeks.length - 1; i += 1) {
            if (
              skipCount != null &&
              skipCount < recurrence.separationCount - 1
            ) {
              skipCount += 1;
              i += 1;
            } else skipCount = null;

            const weekDays = eachDayOfInterval({
              start: passedWeeks[i],
              end: endOfWeek(passedWeeks[i]),
            });

            let isFound = false;
            weekDays.forEach((date) => {
              const weekDayNumber = getDay(date);

              recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                if (
                  weekDayNumber === recWeekDayNumber &&
                  date >= start &&
                  date <= end
                ) {
                  dates.push(date);
                  isFound = true;
                }
              });
            });
            if (isFound) skipCount = 0;
          }
        }
      }

      if (recurrence.recurrenceType === "monthly") {
        if (
          recurrence.separationCount === 1 &&
          recurrence.dayOfMonth.length > 0
        ) {
          const monthsBetween = eachMonthOfInterval({ start, end });

          monthsBetween.forEach((month) => {
            const monthDays = eachDayOfInterval({
              start: month,
              end: endOfMonth(month),
            });

            monthDays.forEach((date) => {
              const lastDay = getDate(lastDayOfMonth(date));

              recurrence.dayOfMonth.forEach((recDayOfMonth) => {
                const monthDay = getDate(date);
                if (
                  monthDay === recDayOfMonth &&
                  date >= start &&
                  date <= end
                ) {
                  dates.push(date);
                }

                if (
                  recDayOfMonth === 31 &&
                  lastDay < 31 &&
                  lastDayOfMonth(date) >= start &&
                  lastDayOfMonth(date) <= end
                ) {
                  if (getMonth(month) === 1) {
                    dates.push(new Date(getYear(date), 1, 28));
                  } else dates.push(lastDayOfMonth(date));
                }
              });
            });
          });
        }

        if (
          recurrence.separationCount > 1 &&
          recurrence.dayOfMonth.length > 0
        ) {
          const monthsBetween = eachMonthOfInterval({ start, end });
          let skipCount = null;

          for (let i = 0; i < monthsBetween.length - 1; i += 1) {
            if (
              skipCount != null &&
              skipCount < recurrence.separationCount - 1
            ) {
              skipCount += 1;
              i += 1;
            } else skipCount = null;

            const monthDays = eachDayOfInterval({
              start: monthsBetween[i],
              end: endOfMonth(monthsBetween[i]),
            });

            let isFound = false;

            monthDays.forEach((date) => {
              const lastDay = getDate(lastDayOfMonth(date));

              recurrence.dayOfMonth.forEach((recDayOfMonth) => {
                const monthDay = getDate(date);
                if (
                  monthDay === recDayOfMonth &&
                  date >= start &&
                  date <= end
                ) {
                  dates.push(date);
                  isFound = true;
                }

                if (
                  recDayOfMonth === 31 &&
                  lastDay < 31 &&
                  lastDayOfMonth(date) >= start &&
                  lastDayOfMonth(date) <= end
                ) {
                  dates.push(lastDayOfMonth(date));
                }
              });
            });
            if (isFound) skipCount = 0;
          }
        }

        if (
          recurrence.separationCount === 1 &&
          recurrence.weekOfMonth.length > 0
        ) {
          const monthsBetween = eachMonthOfInterval({ start, end });

          monthsBetween.forEach((month) => {
            const monthWeeks = eachWeekOfInterval(
              { start: month, end: endOfMonth(month) },
              { weekStartsOn: 1 }
            );

            monthWeeks.forEach((weeks) => {
              if (weeks < start) weeks = startOfMonth(start); // eslint-disable-line no-param-reassign

              const weekNumber = getWeekOfMonth(weeks, { weekStartsOn: 1 });
              const weekDays = eachDayOfInterval({
                start: weeks,
                end: endOfWeek(weeks, { weekStartsOn: 1 }),
              });

              recurrence.weekOfMonth.forEach((recWeekOfMonth) => {
                const weeksCount = getWeeksInMonth(month, { weekStartsOn: 1 });
                const lastWeekDays = getValidLastWeek(
                  weeksCount,
                  month,
                  recurrence.dayOfWeek ?? [1]
                );

                if (recWeekOfMonth > 4 && weeksCount > 4) {
                  lastWeekDays.forEach((date) => {
                    const weekDayNumber = getDay(date, { weekStartsOn: 1 });

                    if (
                      recurrence.dayOfWeek.length === 0 &&
                      date >= start &&
                      date <= end
                    )
                      dates.push(date);

                    recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                      if (
                        weekDayNumber === recWeekDayNumber &&
                        date >= start &&
                        date <= end
                      )
                        dates.push(date);
                    });
                  });
                } else if (weekNumber === recWeekOfMonth) {
                  weekDays.forEach((date) => {
                    const weekDayNumber = getDay(date);

                    if (
                      recurrence.dayOfWeek.length === 0 &&
                      date >= start &&
                      date <= end
                    )
                      dates.push(date);

                    recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                      if (
                        weekDayNumber === recWeekDayNumber &&
                        date >= start &&
                        date <= end
                      )
                        dates.push(date);
                    });
                  });
                }
              });
            });
          });
        }

        if (
          recurrence.separationCount > 1 &&
          recurrence.weekOfMonth.length > 0
        ) {
          const monthsBetween = eachMonthOfInterval({ start, end });
          let skipCount = null;

          for (let i = 0; i < monthsBetween.length - 1; i += 1) {
            if (
              skipCount != null &&
              skipCount < recurrence.separationCount - 1
            ) {
              skipCount += 1;
              i += 1;
            } else skipCount = null;

            const monthWeeks = eachWeekOfInterval(
              { start: monthsBetween[i], end: endOfMonth(monthsBetween[i]) },
              { weekStartsOn: 1 }
            );
            let isFound = false;

            monthWeeks.forEach((weeks) => {
              if (weeks < monthsBetween[i])
                weeks = startOfMonth(monthsBetween[i]); // eslint-disable-line no-param-reassign

              const weekNumber = getWeekOfMonth(weeks, { weekStartsOn: 1 });
              const weekDays = eachDayOfInterval({
                start: weeks,
                end: endOfWeek(weeks, { weekStartsOn: 1 }),
              });

              recurrence.weekOfMonth.forEach((recWeekOfMonth) => {
                const weeksCount = getWeeksInMonth(monthsBetween[i], {
                  weekStartsOn: 1,
                });
                const lastWeekDays = getValidLastWeek(
                  weeksCount,
                  monthsBetween[i],
                  recurrence.dayOfWeek
                );

                if (recWeekOfMonth > 4 && weeksCount > 4) {
                  lastWeekDays.forEach((date) => {
                    const weekDayNumber = getDay(date);

                    if (
                      recurrence.dayOfWeek.length === 0 &&
                      date >= start &&
                      date <= end
                    ) {
                      dates.push(date);
                      isFound = true;
                    }

                    recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                      if (
                        weekDayNumber === recWeekDayNumber &&
                        date >= start &&
                        date <= end
                      ) {
                        dates.push(date);
                        isFound = true;
                      }
                    });
                  });
                } else if (weekNumber === recWeekOfMonth) {
                  weekDays.forEach((date) => {
                    const weekDayNumber = getDay(date);

                    if (
                      recurrence.dayOfWeek.length === 0 &&
                      date >= start &&
                      date <= end
                    ) {
                      dates.push(date);
                      isFound = true;
                    } else {
                      recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                        if (
                          weekDayNumber === recWeekDayNumber &&
                          date >= start &&
                          date <= end
                        ) {
                          dates.push(date);
                          isFound = true;
                        }
                      });
                    }
                  });
                }
              });
            });
            if (isFound) skipCount = 0;
          }
        }
      }

      if (recurrence.recurrenceType === "yearly") {
        if (
          recurrence.separationCount === 1 &&
          recurrence.monthOfYear.length > 0 &&
          recurrence.weekOfMonth.length === 0
        ) {
          const yearsBetween = eachYearOfInterval({ start, end });

          yearsBetween.forEach((year) => {
            const passedMonth = eachMonthOfInterval({
              start: year,
              end: endOfYear(year),
            });

            passedMonth.forEach((month) => {
              recurrence.monthOfYear.forEach((recMonthOfYear) => {
                const monthNumber = getMonth(month);
                if (monthNumber === recMonthOfYear) {
                  const monthDays = eachDayOfInterval({
                    start: month,
                    end: endOfMonth(month),
                  });

                  monthDays.forEach((date) => {
                    if (
                      recurrence.dayOfMonth.length === 0 &&
                      date >= start &&
                      date <= end
                    ) {
                      dates.push(date);
                    }

                    recurrence.dayOfMonth.forEach((recDayOfMonth) => {
                      const monthDay = getDate(date);
                      if (
                        monthDay === recDayOfMonth &&
                        date >= start &&
                        date <= end
                      )
                        dates.push(date);
                    });
                  });
                }
              });
            });
          });
        }

        if (
          recurrence.separationCount > 1 &&
          recurrence.monthOfYear.length > 0 &&
          recurrence.weekOfMonth.length === 0
        ) {
          const yearsBetween = eachYearOfInterval({ start, end });
          let skipCount = null;

          for (let i = 0; i < yearsBetween.length - 1; i += 1) {
            if (
              skipCount != null &&
              skipCount < recurrence.separationCount - 1
            ) {
              skipCount += 1;
              i += 1;
            } else skipCount = null;

            const passedMonth = eachMonthOfInterval({
              start: yearsBetween[i],
              end: endOfYear(yearsBetween[i]),
            });
            let isFound = false;

            passedMonth.forEach((month) => {
              recurrence.monthOfYear.forEach((recMonthOfYear) => {
                const monthNumber = getMonth(month);
                if (monthNumber === recMonthOfYear) {
                  const monthDays = eachDayOfInterval({
                    start: month,
                    end: endOfMonth(month),
                  });

                  monthDays.forEach((date) => {
                    if (
                      recurrence.dayOfMonth.length === 0 &&
                      date >= start &&
                      date <= end
                    ) {
                      dates.push(date);
                      isFound = true;
                    }

                    recurrence.dayOfMonth.forEach((recDayOfMonth) => {
                      const monthDay = getDate(date);
                      if (
                        monthDay === recDayOfMonth &&
                        date >= start &&
                        date <= end
                      ) {
                        dates.push(date);
                        isFound = true;
                      }
                    });
                  });
                }
              });
            });
            if (isFound) skipCount = 0;
          }
        }

        if (
          recurrence.separationCount === 1 &&
          recurrence.monthOfYear.length > 0 &&
          recurrence.weekOfMonth.length > 0
        ) {
          const yearsBetween = eachYearOfInterval({ start, end });
          yearsBetween.forEach((year) => {
            const passedMonth = eachMonthOfInterval({
              start: year,
              end: endOfYear(year),
            });

            passedMonth.forEach((month) => {
              recurrence.monthOfYear.forEach((recMonthOfYear) => {
                const monthNumber = getMonth(month);
                if (monthNumber === recMonthOfYear) {
                  const monthWeeks = eachWeekOfInterval(
                    { start: month, end: endOfMonth(month) },
                    { weekStartsOn: 1 }
                  );

                  monthWeeks.forEach((weeks) => {
                    const weekNumber = getWeekOfMonth(weeks);
                    const weekDays = eachDayOfInterval({
                      start: weeks,
                      end: endOfWeek(weeks, { weekStartsOn: 1 }),
                    });

                    recurrence.weekOfMonth.forEach((recWeekOfMonth) => {
                      if (weekNumber === recWeekOfMonth) {
                        weekDays.forEach((date) => {
                          const weekDayNumber = getDay(date);

                          if (
                            recurrence.dayOfWeek.length === 0 &&
                            date >= start &&
                            date <= end
                          ) {
                            dates.push(date);
                          }

                          recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                            if (
                              weekDayNumber === recWeekDayNumber &&
                              date >= start &&
                              date <= end
                            )
                              dates.push(date);
                          });
                        });
                      }

                      const weeksCount = getWeeksInMonth(month, {
                        weekStartsOn: 1,
                      });
                      const lastWeekDays = getValidLastWeek(
                        weeksCount,
                        month,
                        recurrence.dayOfWeek ?? [1]
                      );

                      if (recWeekOfMonth > 4 && weeksCount > 4) {
                        lastWeekDays.forEach((date) => {
                          const weekDayNumber = getDay(date);

                          if (
                            recurrence.dayOfWeek.length === 0 &&
                            date >= start &&
                            date <= end
                          ) {
                            dates.push(date);
                          }

                          recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                            if (
                              weekDayNumber === recWeekDayNumber &&
                              date >= start &&
                              date <= end
                            )
                              dates.push(date);
                          });
                        });
                      }
                    });
                  });
                }
              });
            });
          });
        }

        if (
          recurrence.separationCount > 1 &&
          recurrence.monthOfYear.length > 0 &&
          recurrence.weekOfMonth.length > 0
        ) {
          const yearsBetween = eachYearOfInterval({ start, end });
          let skipCount = null;

          for (let i = 0; i < yearsBetween.length - 1; i += 1) {
            if (
              skipCount != null &&
              skipCount < recurrence.separationCount - 1
            ) {
              skipCount += 1;
              i += 1;
            } else skipCount = null;

            const passedMonth = eachMonthOfInterval({
              start: yearsBetween[i],
              end: endOfYear(yearsBetween[i]),
            });
            let isFound = false;

            passedMonth.forEach((month) => {
              recurrence.monthOfYear.forEach((recMonthOfYear) => {
                const monthNumber = getMonth(month);
                if (monthNumber === recMonthOfYear) {
                  const monthWeeks = eachWeekOfInterval(
                    { start: month, end: endOfMonth(month) },
                    { weekStartsOn: 1 }
                  );

                  monthWeeks.forEach((weeks) => {
                    const weekNumber = getWeekOfMonth(weeks);
                    const weekDays = eachDayOfInterval({
                      start: weeks,
                      end: endOfWeek(weeks, { weekStartsOn: 1 }),
                    });

                    recurrence.weekOfMonth.forEach((recWeekOfMonth) => {
                      const weeksCount = getWeeksInMonth(month, {
                        weekStartsOn: 1,
                      });
                      const lastWeekDays = getValidLastWeek(
                        weeksCount,
                        month,
                        recurrence.dayOfWeek ?? [1]
                      );

                      if (recWeekOfMonth > 4 && weeksCount > 4) {
                        lastWeekDays.forEach((date) => {
                          const weekDayNumber = getDay(date);

                          if (
                            recurrence.dayOfWeek.length === 0 &&
                            date >= start &&
                            date <= end
                          ) {
                            dates.push(date);
                            isFound = true;
                          }

                          recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                            if (
                              weekDayNumber === recWeekDayNumber &&
                              date >= start &&
                              date <= end
                            ) {
                              dates.push(date);
                              isFound = true;
                            }
                          });
                        });
                      }

                      if (weekNumber === recWeekOfMonth) {
                        weekDays.forEach((date) => {
                          const weekDayNumber = getDay(date);

                          if (
                            recurrence.dayOfWeek.length === 0 &&
                            date >= start &&
                            date <= end
                          ) {
                            dates.push(date);
                            isFound = true;
                          }

                          recurrence.dayOfWeek.forEach((recWeekDayNumber) => {
                            if (
                              weekDayNumber === recWeekDayNumber &&
                              date >= start &&
                              date <= end
                            ) {
                              dates.push(date);
                              isFound = true;
                            }
                          });
                        });
                      }
                    });
                  });
                }
              });
            });
            if (isFound) skipCount = 0;
          }
        }
      }
    }

    return [...new Set(dates.map((el) => el.toISOString()))];
  } catch (error) {
    throw new ValidationError("022", error);
  }
};

const createRecurrence = async (body, schedule, transaction, sequelize) => {
  try {
    validateData(body);
    const { Recurrence } = await db(sequelize);

    const recurrence = Recurrence.build(
      {
        recurrenceType: body.recurrence_type,
        dayOfWeek: body.day_of_week.map((el) => (el === 7 ? 0 : el)),
        separationCount: body.separation_count,
        weekOfMonth: body.week_of_month,
        dayOfMonth: body.day_of_month,
        monthOfYear: body.month_of_year.map((el) => el - 1),
      },
      {
        transaction,
      }
    );

    await recurrence.setSchedule(schedule.id, { transaction });
    await recurrence.save({ transaction });

    return recurrence;
  } catch (error) {
    throw new ValidationError(error.code ?? 500, error.message);
  }
};

const createRecurrenceHandler = (event) =>
  baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const {
      pathParameters: { schedule: scheduleCode },
    } = event;

    const { Schedule, Recurrence } = await db(sequelize);

    const schedule = await Schedule.findOne({
      where: {
        code: scheduleCode,
      },
    });

    if (!schedule) {
      throw new NotFoundError("021");
    }

    const isRecurrenceExists = await Recurrence.findOne({
      where: {
        schedule_id: schedule.id,
      },
    });

    if (isRecurrenceExists) {
      throw new ValidationError("026");
    }

    const transaction = await sequelize.transaction();

    try {
      await createRecurrence(body, schedule, transaction, sequelize);
      await transaction.commit();
    } catch (error) {
      console.error("Error creating recurrence: ", error);
      await transaction.rollback();
      throw new ValidationError(error.code ?? "019", `${error.message}`);
    }

    console.log("recurrence was successfully inserted");
    return {
      statusCode: 204,
      body: null,
    };
  });

const updateRecurrence = (event) =>
  baseService(async (sequelize) => {
    console.log("Event received: ", event);

    const body = JSON.parse(event.body);
    const {
      pathParameters: { schedule: scheduleCode },
    } = event;

    const { Recurrence, Schedule } = await db(sequelize);

    const schedule = await Schedule.findOne({
      where: {
        code: scheduleCode,
      },
    });

    if (!schedule) {
      throw new NotFoundError("021");
    }

    const recurrence = await Recurrence.findOne({
      where: {
        schedule_id: schedule.id,
      },
    });

    if (!recurrence) {
      throw new NotFoundError("015");
    }

    if (body.separation_count === 0) {
      await Recurrence.destroy({
        where: {
          schedule_id: schedule.id,
        },
      });

      console.log("recurrence was successfully deleted: ");
      return {
        statusCode: 204,
        body: null,
      };
    }
    validateData(body);

    const update = await Recurrence.update(
      {
        recurrenceType: body.recurrence_type,
        dayOfWeek: body.day_of_week.map((el) => (el === 7 ? 0 : el)),
        separationCount: body.separation_count,
        weekOfMonth: body.week_of_month,
        dayOfMonth: body.day_of_month,
        monthOfYear: body.month_of_year.map((el) => el - 1),
      },
      {
        where: {
          id: recurrence.id,
        },
      }
    );

    console.log("recurrence was successfully updated: ", update);
    return {
      statusCode: 204,
      body: null,
    };
  });

module.exports = {
  createRecurrenceHandler,
  createRecurrence,
  updateRecurrence,
  calculateRecurrenceDates,
};
