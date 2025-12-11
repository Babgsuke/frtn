const db = require("../config/db.js");
const { Sequelize } = require("sequelize");
const akun = require("../model/Account.js");
async function getAkunRandom(type) {
	try {
		const result = await akun.findOne({
			where: { type },
			order: db.random(),
			raw: true
		});
		return result;
	} catch (err) {
		console.error("getAkunRandom_simple error:", err);
		throw err;
	}
}

module.exports = getAkunRandom;
