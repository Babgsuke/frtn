const akun = require("../model/Account.js");

async function createAcount(data, type, exp) {
	try {
		await akun.create({ detail: data, type, exp });
	} catch (err) {
		console.error("Error:", err);
	}
}

module.exports = createAcount
