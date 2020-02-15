const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    isbn: DataTypes.STRING,
  });
  Model.associate = function (models) {
    this.belongsTo(models.Book);
  };

  return Model;
};
