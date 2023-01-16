module.exports = (sequelize, DataTypes) => {
  class Price extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Price.belongsTo(models.OpenTime);
    }
  }
  Price.init(
    {
      start: DataTypes.TIME,
      end: DataTypes.TIME,
      type: {
        type: DataTypes.STRING,
      },
      price: DataTypes.INTEGER,
      order: DataTypes.INTEGER,
    },
    {
      sequelize,
      tableName: "price",
      underscored: true,
    }
  );
  return Price;
};
