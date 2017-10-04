const path = require('path');

const tableName = path.basename(__filename, '.js');

module.exports = function modelExport(db, DataTypes) {
  const Model = db.define(tableName, {
    firstname: DataTypes.STRING,
    lastname: DataTypes.STRING,
  }, {
    getterMethods: {
      fullName() {
        return this.firstname + ' ' + this.lastname
      },
    },
  });


  Model.findOrCreateByFullName = function (fullName) {
    const parts = fullName.split(' ');
    const firstname = parts[0];
    const lastname = parts[parts.length-1];

    return Model.findOrCreate({
      where: {
        firstname,
        lastname,
      },
    });
  };

  Model.associate = function (models) {
    this.belongsToMany(models.Book, { through: 'BookAuthor' });
  };

  return Model;
};
