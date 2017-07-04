const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    views: DataTypes.INTEGER,
    pages: DataTypes.INTEGER,
    pictureUrl: DataTypes.STRING,
    rating: DataTypes.INTEGER,
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Genre, { through: 'BookGenre' });
    this.belongsToMany(models.Author, { through: 'BookAuthor' });
    this.belongsToMany(models.Review, { through: 'BookReview' });
  };

  return Model;
};
