module.exports = (sequelize, DataTypes) => {
  class BoxSection extends sequelize.Sequelize.Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BoxSection.hasMany(models.Box);
    }
  }
  BoxSection.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      tableName: "box_section",
      underscored: true,
    }
  );
  return BoxSection;
};
