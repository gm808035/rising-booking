module.exports = (sequelize, DataTypes) => {
  class BoxSlot extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BoxSlot.belongsTo(models.Box);
      BoxSlot.belongsTo(models.Schedule);
      BoxSlot.hasMany(models.BoxSlotLink);
    }
  }
  BoxSlot.init(
    {
      start: DataTypes.TIME,
      duration: DataTypes.INTEGER,
    },
    {
      sequelize,
      tableName: "box_slot",
      underscored: true,
    }
  );
  return BoxSlot;
};
