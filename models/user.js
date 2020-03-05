const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    extId: DataTypes.STRING,
  });

  Model.associate = function (models) {
    this.belongsToMany(models.Review, { through: 'BookReviewer' });
    this.belongsTo(models.Role);
    this.hasMany(models.UserAvatar);
    // this.belongsTo(models.UserAvatar);
    // this.belongsToMany(models.Avatar, { through: 'UserAvatar' });
    this.belongsToMany(models.Class, { through: 'UserClass' });
    this.belongsToMany(models.SchoolUnit, { through: 'UserSchoolUnit' });
  };

  return Model;
};
