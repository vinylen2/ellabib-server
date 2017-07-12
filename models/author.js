const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    firstname: DataTypes.STRING,
    lastname: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Book, { through: 'BookAuthor' });
  };

  return Model;
};
