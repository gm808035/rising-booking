module.exports = (sequelize, DataTypes) => {
  class OpenTime extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OpenTime.belongsTo(models.Schedule);
      OpenTime.hasMany(models.Price);
    }
  }
  OpenTime.init(
    {
      start: DataTypes.TIME,
      end: DataTypes.TIME,
    },
    {
      sequelize,
      tableName: "open_time",
      underscored: true,
    }
  );
  return OpenTime;
};
