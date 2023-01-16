module.exports = (sequelize) => {
  class BoxBooking extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BoxBooking.belongsTo(models.Booking);
      BoxBooking.belongsTo(models.Box);
    }
  }
  BoxBooking.init(
    {},
    {
      sequelize,
      tableName: "box_booking",
      underscored: true,
    }
  );
  return BoxBooking;
};
