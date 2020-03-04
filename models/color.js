const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    color: DataTypes.STRING,
    displayName: DataTypes.STRING,
  });

  return Model;
};
