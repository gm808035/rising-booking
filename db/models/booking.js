module.exports = (sequelize, DataTypes) => {
  class Booking extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Booking.belongsTo(models.Venue);
      Booking.hasMany(models.BoxBooking);
    }
  }
  Booking.init(
    {
      start: DataTypes.DATE,
      end: DataTypes.DATE,
      boxSlotStart: DataTypes.DATE,
      boxSlotEnd: DataTypes.DATE,
      price: DataTypes.INTEGER,
      reference: DataTypes.STRING,
      sessionId: DataTypes.STRING,
      guestsNo: DataTypes.INTEGER,
      extras: DataTypes.TEXT,
      packages: DataTypes.TEXT,
      notes: DataTypes.STRING,
      checkinAt: DataTypes.DATE,
      source: {
        type: DataTypes.ENUM("online", "walkin", "reception", "phone"),
        defaultValue: "online",
      },
      type: {
        type: DataTypes.ENUM("social", "event", "other"),
        defaultValue: "social",
      },
      status: {
        type: DataTypes.ENUM("Payment in progress", "Paid", "Cancelled"),
      },
    },
    {
      sequelize,
      tableName: "booking",
      paranoid: true,
      underscored: true,
    }
  );
  return Booking;
};
