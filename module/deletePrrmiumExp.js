const user = require("../model/User.js");
const { Op } = require("sequelize");
async function checkAndRemoveExpiredPremium() {
	try {
		const now = new Date();

		const users = await user.findAll({
			where: {
				premium: true,
				premium_exp: { [Op.lt]: now }
			}
		});

		for (const u of users) {
			u.premium = false;
			u.premium_exp = null;
			await u.save();
		}

		console.log(`Premium expired dibersihkan: ${users.length} user`);
	} catch (err) {
		console.error("Gagal delete akun Premium", err);
	}
}
module.exports = checkAndRemoveExpiredPremium
