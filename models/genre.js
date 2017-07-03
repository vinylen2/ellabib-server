const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function commentModule(db, DataTypes) {
  return db.define(
    tableName,
    {
      name: DataTypes.STRING,
    },
    {
      classMethods: {
        associate(models) {
          this.belongsToMany(models.Book, { through: 'BookGenres' });
        },
      },
    },
  );
};
