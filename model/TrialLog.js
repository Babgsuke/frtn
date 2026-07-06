const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const TrialLog = db.define("TrialLog", {
	userId: {
		type: DataTypes.STRING,
		allowNull: false
	},
	protocol: {
		type: DataTypes.STRING,
		allowNull: false
	}
});

module.exports = TrialLog;
