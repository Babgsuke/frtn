const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const Server = db.define("Server", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false
  },
  port: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Server;
