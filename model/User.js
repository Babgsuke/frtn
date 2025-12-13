const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const User = db.define("User", {
	user_id: {
		type: DataTypes.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	username: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: "uknow"
	},
	premium: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	premium_exp: {
		type: DataTypes.DATE,
		allowNull: true
	}
});

module.exports = User;
