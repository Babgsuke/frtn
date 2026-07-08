const db = require("../config/db.js");
const { DataTypes } = require("sequelize");

const akun = db.define(
	"acount",
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},
		userId: {
			type: DataTypes.STRING,
			allowNull: true
		},
		username: {
			type: DataTypes.STRING,
			allowNull: true
		},
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
		},
		serverId: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		protocol: {
			type: DataTypes.STRING,
			allowNull: true
		}
	}
);

module.exports = akun;
