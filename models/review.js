const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    rating: DataTypes.INTEGER,
    views: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    descriptionAudioUrl: DataTypes.STRING,
    descriptionPlays: DataTypes.INTEGER,
    review: DataTypes.TEXT,
    reviewAudioUrl: DataTypes.STRING,
    reviewPlays: DataTypes.INTEGER,
    active: DataTypes.BOOLEAN,
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Book, { through: 'BookReview' });
    this.belongsToMany(models.User, { through: 'BookReviewer' });
  };

  return Model;
};
