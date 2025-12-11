const { Op } = require("sequelize");
const user = require("../model/User.js");

async function countUsers() {
	const total = await user.count();
	return total;
}
async function countUsersThisMonth() {
	const start = new Date();
	start.setDate(1);
	start.setHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setMonth(end.getMonth() + 1);

	const total = await user.count({
		where: {
			createdAt: {
				[Op.between]: [start, end]
			}
		}
	});

	return total;
}

module.exports = { countUsers, countUsersThisMonth };
