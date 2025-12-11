const akun = require("../model/Account.js");
const { Op } = require("sequelize");

async function deleteExpiredData() {
	try {
		const now = new Date();
		const deleted = await akun.destroy({
			where: {
				exp: {
					[Op.lt]: now
				}
			}
		});
	} catch (error) {
		console.error("Gagal menghapus data expired:", error);
	}
}

module.exports = deleteExpiredData;
