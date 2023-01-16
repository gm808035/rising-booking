module.exports = (sequelize, DataTypes) => {
  class Box extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Box.belongsTo(models.Venue);
      Box.belongsTo(models.BoxSection);
      Box.hasMany(models.BoxBooking);
      Box.hasMany(models.BoxSlot);
    }
  }
  Box.init(
    {
      name: DataTypes.STRING,
      // section: {
      //   type: DataTypes.INTEGER,
      //   defaultValue: 0,
      // },
    },
    {
      sequelize,
      tableName: "box",
      underscored: true,
    }
  );
  return Box;
};
