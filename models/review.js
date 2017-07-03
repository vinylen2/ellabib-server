const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function commentModule(db, DataTypes) {
  return db.define(
    tableName,
    {
      rating: DataTypes.INTEGER,
      views: DataTypes.INTEGER,
      description: DataTypes.STRING,
      descriptionAudioUrl: DataTypes.STRING,
      review: DataTypes.STRING,
      reviewAudioUrl: DataTypes.STRING,
    },
    {
      classMethods: {
        associate(models) {
          this.belongsToMany(models.Genre, { through: 'BookGenres' });
          this.belongsToMany(models.Author, { through: 'BookAuthors' });
          this.belongsToMany(models.Reviewer, { through: 'BookReviewers' });
        },
      },
    },
  );
};
