const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    displayName: DataTypes.STRING,
    schoolUnitCode: DataTypes.STRING,
    pagesRead: {
      type: DataTypes.INTEGER,
      default: 0,
    },
    booksRead: {
      type: DataTypes.INTEGER,
      default: 0,
    },
    reviewsWritten: {
      type: DataTypes.INTEGER,
      default: 0,
    },
  });

  Model.associate = function (models) {
    this.belongsToMany(models.User, { through: 'UserSchoolUnit' });
    this.hasMany(models.Class);
  };

  return Model;
};
