const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function commentModule(db, DataTypes) {
  return db.define(
    tableName,
    {
      title: DataTypes.STRING,
      views: DataTypes.INTEGER,
      pages: DataTypes.INTEGER,
      pictureUrl: DataTypes.STRING,
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
