module.exports = (sequelize, DataTypes) => {
  class BoxSlotLink extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BoxSlotLink.belongsTo(models.BoxSlot);
    }
  }
  BoxSlotLink.init(
    {
      linked_box_slot_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      tableName: "box_slot_link",
      underscored: true,
    }
  );
  return BoxSlotLink;
};
