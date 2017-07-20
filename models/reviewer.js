const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    name: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Review, { through: 'BookReviewer' });
  };

  return Model;
};
