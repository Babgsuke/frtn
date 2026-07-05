const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const Price = db.define("Price", {
  days: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Price;
