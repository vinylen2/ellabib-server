const path = require('path');

const tableName = path.basename(__filename, '.js');
const { Review } = require('../models');

module.exports = function modelExport(db, DataTypes) {
  // add ISBN field
  const Model = db.define(tableName, {
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    pages: DataTypes.INTEGER,
    imageUrl: DataTypes.STRING,
    description: DataTypes.TEXT,
    // readCount: {
    //   type: DataTypes.INTEGER,
    //   default: 0,
    // },
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Genre, { through: 'BookGenre' });
    this.belongsToMany(models.Isbn, { through: 'BookIsbn' });
    this.hasMany(models.Isbn);
    this.hasMany(models.LibraryId);
    this.belongsToMany(models.Author, { through: 'BookAuthor' });
    this.belongsToMany(models.Review, { through: 'BookReview' });
  };
  return Model;
};
