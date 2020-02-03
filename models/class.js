const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    displayName: DataTypes.STRING,
  });

  Model.bookRead = async function (type, classModel, pages) {
    switch (type) {
      case 'simple': 
        classModel.update({
          booksRead: 1,
          pagesRead: pages,
        });
        break;
      case 'review':
        classModel.update({
          booksRead: 1,
          reviewsWritten: 1,
          pagesRead: pages,
        });
        break;
    };
  };

  Model.associate = function (models) {
    this.belongsToMany(models.User, { through: 'UserClass' });
    this.belongsTo(models.SchoolUnit);
  };

  return Model;
};
