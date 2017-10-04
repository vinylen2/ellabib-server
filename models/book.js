const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  // add ISBN field
  const Model = db.define(tableName, {
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    views: DataTypes.INTEGER,
    pages: DataTypes.INTEGER,
    imageUrl: DataTypes.STRING,
    localImage: DataTypes.BOOLEAN,
    rating: DataTypes.FLOAT,
    isbn: DataTypes.STRING(13),
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Genre, { through: 'BookGenre' });
    this.belongsToMany(models.Author, { through: 'BookAuthor' });
    this.belongsToMany(models.Review, { through: 'BookReview' });
  };

  return Model;
};
