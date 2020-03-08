const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    icon: DataTypes.STRING,
    displayName: DataTypes.STRING,
    pointRequirement: DataTypes.INTEGER,
  });

  Model.associate = function (models) {
    this.hasMany(models.UserAvatar);
    // this.belongsToMany(models.User, { through: 'UserAvatar' });
    // this.belongsToMany(models.Color, { through: 'UserAvatar' });
  };

  return Model;
};
