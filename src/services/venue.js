const { Op } = require("sequelize");
const { db } = require("../lib/db");
const { NotFoundError } = require("../lib/errors");
const baseService = require("./baseService");

const parseVenueList = (venue) => ({
  id: venue.id,
  code: venue.code,
  name: venue.name,
});

const parseVenue = (venue) => ({
  id: venue.id,
  code: venue.code,
  name: venue.name,
  boxes: venue.Boxes.map((b) => ({
    name: b.name,
    id: b.id,
    section: b.BoxSection.name,
  })),
});

const getAll = async () =>
  baseService(async (sequelize) => {
    const { Venue } = await db(sequelize);
    const venues = await Venue.findAll();

    return {
      body: venues.map(parseVenueList),
    };
  });

const getByCode = async (event) =>
  baseService(async (sequelize) => {
    const { code } = event.pathParameters;
    const { Venue, Box, BoxSection } = await db(sequelize);
    const result = await Venue.findOne({
      where: {
        code: {
          [Op.eq]: code,
        },
      },
      attributes: ["id", "name", "code"],
      include: {
        model: Box,
        attributes: ["id", "name"],
        include: {
          model: BoxSection,
          attributes: ["name"],
        },
      },
    });

    if (!result) {
      throw new NotFoundError("001");
    }

    return {
      body: parseVenue(result),
    };
  });

module.exports = {
  getAll,
  getByCode,
};
