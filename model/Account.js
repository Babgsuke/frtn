const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const akun = db.define(
	"acount",
	{
		detail: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		type: {
			type: DataTypes.STRING,
			allowNull: false
		},
		exp: {
			type: DataTypes.DATEONLY,
			allowNull: false
		}
	},
	{
		id: false
	}
);

module.exports = akun;
