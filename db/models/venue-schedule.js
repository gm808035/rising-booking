module.exports = (sequelize) => {
  class VenueSchedule extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      VenueSchedule.belongsTo(models.Venue);
      VenueSchedule.belongsTo(models.Schedule);
    }
  }
  VenueSchedule.init(
    {},
    {
      sequelize,
      tableName: "venue_schedule",
      underscored: true,
    }
  );
  return VenueSchedule;
};
