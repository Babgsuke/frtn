const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const User = db.define("User", {
  user_id: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  username: DataTypes.STRING,

  premium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  premium_exp: {
    type: DataTypes.DATE,
    allowNull: true
  },

  referrer_id: DataTypes.BIGINT,
  referral_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  referral_rewarded: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = User;