const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    rating: DataTypes.INTEGER,
    views: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    descriptionAudioUrl: DataTypes.STRING,
    review: DataTypes.TEXT,
    reviewAudioUrl: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Book, { through: 'BookReview' });
    this.belongsToMany(models.Reviewer, { through: 'BookReviewer' });
  };

  return Model;
};
