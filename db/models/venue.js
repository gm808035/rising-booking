module.exports = (sequelize, DataTypes) => {
  class Venue extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Venue.hasMany(models.Booking);
      Venue.hasMany(models.Box);
      Venue.hasMany(models.VenueSchedule);
    }
  }
  Venue.init(
    {
      name: DataTypes.STRING,
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      timezone: {
        type: DataTypes.STRING,
        defaultValue: "Europe/London",
      },
    },
    {
      sequelize,
      tableName: "venue",
      underscored: true,
    }
  );
  return Venue;
};
