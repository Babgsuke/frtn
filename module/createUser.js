const user = require("../model/User.js");

async function createUser(userId, username) {
	try {
		const [users, created] = await user.findOrCreate({
			where: { user_id: userId }
		});
		const res = "berhasil membuat user";
		console.log(res);
		await console.log(await user.findAll({ raw: true }));
		return { res, users, created };
	} catch (e) {
		const res = "gagal membuat user";
		console.log(res, e);
		return res;
	}
}

module.exports = createUser;
