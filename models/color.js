const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    color: DataTypes.STRING,
    displayName: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.hasMany(models.UserAvatar);
    // this.belongsToMany(models.Avatar, { through: 'UserAvatar' });
  };

  return Model;
};
