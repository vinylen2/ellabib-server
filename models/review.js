const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  return db.define(
    tableName,
    {
      rating: DataTypes.INTEGER,
      views: DataTypes.INTEGER,
      description: DataTypes.TEXT,
      descriptionAudioUrl: DataTypes.STRING,
      review: DataTypes.TEXT,
      reviewAudioUrl: DataTypes.STRING,
    },
    {
      classMethods: {
        associate(models) {
          this.belongsToMany(models.Genre, { through: 'BookGenre' });
          this.belongsToMany(models.Author, { through: 'BookAuthor' });
          this.belongsToMany(models.Reviewer, { through: 'BookReviewer' });
        },
      },
    },
  );
};
