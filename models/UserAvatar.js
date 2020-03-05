const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    // userId: {
    //   type: DataTypes.INTEGER,
    //   primaryKey: true,
    // },
    // colorId: {
    //   type: DataTypes.INTEGER,
    //   primaryKey: true,
    // },
    // avatarId: {
    //   type: DataTypes.INTEGER,
    //   primaryKey: true,
    // },
  });

  Model.associate = function (models) {
    this.belongsTo(models.User);
    this.belongsTo(models.Color);
    this.belongsTo(models.Avatar);
    // this.belongsToMany(models.User, { through: 'UserAvatar' });
    // this.belongsToMany(models.Color, { through: 'UserAvatar' });
  };

  return Model;
};
