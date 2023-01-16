module.exports = (sequelize, DataTypes) => {
  class Recurrence extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Recurrence.belongsTo(models.Schedule);
    }
  }
  Recurrence.init(
    {
      recurrenceType: DataTypes.ENUM("weekly", "monthly", "yearly"),
      dayOfWeek: DataTypes.JSON,
      separationCount: DataTypes.INTEGER,
      weekOfMonth: DataTypes.JSON,
      dayOfMonth: DataTypes.JSON,
      monthOfYear: DataTypes.JSON,
    },
    {
      sequelize,
      tableName: "recurrence",
      underscored: true,
    }
  );
  return Recurrence;
};
