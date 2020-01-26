const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    type: DataTypes.STRING,
    displayName: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.hasMany(models.User);
  };

  return Model;
};
