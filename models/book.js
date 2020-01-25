const path = require('path');

const tableName = path.basename(__filename, '.js');
const { Review } = require('../models');

module.exports = function modelExport(db, DataTypes) {
  // add ISBN field
  const Model = db.define(tableName, {
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    views: DataTypes.INTEGER,
    pages: DataTypes.INTEGER,
    imageUrl: DataTypes.STRING,
    localImage: DataTypes.BOOLEAN,
    isbn: DataTypes.STRING(13),
    libraryId: DataTypes.INTEGER,
    originalDescription: DataTypes.STRING,
    rating: DataTypes.FLOAT,
    readCount: DataTypes.INTEGER,
  });

  Model.updateRating = async function (book, Review, id) {
    try {
      const reviews = await Review.findAll({
        where: { active: true },
        group: ['review.id'],
        attributes: [
          'rating',
          // [ Model.fn('AVG', 'review.rating'), 'avg rating' ],
        ],
        include: [
          {
            model: Model,
            attributes: [
              'id',
            ],
            where: { id },
          },
        ],
      });
      let totalSum = 0;
      reviews.forEach((review) => {
        totalSum += review.dataValues.rating;
      });
      const rating = totalSum / reviews.length;
      const roundedRating = Math.round(rating * 2)/2;

      book.update({
        rating: roundedRating,
      });

    } catch (e) {
      console.log(e);
    }
  };

  Model.associate = function (models) {
    this.belongsToMany(models.Genre, { through: 'BookGenre' });
    this.belongsToMany(models.Author, { through: 'BookAuthor' });
    this.belongsToMany(models.Review, { through: 'BookReview' });
  };

  return Model;
};
