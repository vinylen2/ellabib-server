const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    extId: DataTypes.STRING,
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

  Model.bookRead = function (userId, type, pages) {
    switch (type) {
      case 'simple':
        Model.increment({
          pagesRead: pages,
          booksRead: 1,
        }, { where: { id: userId }});
        break;
      case 'review':
        user.increment({
          pagesRead: pages,
          reviewsWritten: 1,
        });
        break;
    };
  };

  Model.associate = function (models) {
    this.belongsToMany(models.Review, { through: 'BookReviewer' });
    this.belongsTo(models.Role);
    this.belongsToMany(models.Class, { through: 'UserClass' });
    this.belongsToMany(models.SchoolUnit, { through: 'UserSchoolUnit' });
  };

  return Model;
};
