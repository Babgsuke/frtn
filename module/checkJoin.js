const GROUP_ID = process.env.GROUP_ID;

async function checkJoin(bot, userId) {
	if (!GROUP_ID) return true;
	try {
		const res = await bot.getChatMember(GROUP_ID, userId);
		const status = res.status;
		return (
			status === "member" ||
			status === "administrator" ||
			status === "creator"
		);
	} catch (e) {
		return false;
	}
}

module.exports = checkJoin;
