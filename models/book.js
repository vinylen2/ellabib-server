const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
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
          this.belongsToMany(models.Genre, { through: 'BookGenre' });
          this.belongsToMany(models.Author, { through: 'BookAuthor' });
          this.belongsToMany(models.Reviewer, { through: 'BookReviewer' });
        },
      },
    },
  );
};
