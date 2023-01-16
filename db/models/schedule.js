module.exports = (sequelize, DataTypes) => {
  class Schedule extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Schedule.hasOne(models.OpenTime);
      Schedule.hasOne(models.VenueSchedule);
      Schedule.hasOne(models.Recurrence);
      Schedule.hasMany(models.BoxSlot);
    }
  }
  Schedule.init(
    {
      name: DataTypes.STRING,
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      from: DataTypes.DATEONLY,
      to: DataTypes.DATEONLY,
      applied_dates: DataTypes.JSON,
      order: DataTypes.INTEGER,
      date_of_apply: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: "schedule",
      underscored: true,
    }
  );
  return Schedule;
};
