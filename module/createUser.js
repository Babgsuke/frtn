const User = require("../model/User.js");

async function createUser(userId, username) {
	try {
		const [user, created] = await User.findOrCreate({
  where: { user_id: userId },
  defaults: {
    username: username
  }
});
		const res = "berhasil membuat user";
		console.log(res);
		return { res, users, created };
	} catch (e) {
		const res = "gagal membuat user";
		console.log(res, e);
		return res;
	}
}

module.exports = createUser;
