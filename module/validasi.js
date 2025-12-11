function isOwner(userId) {
	const OWNERS = process.env.OWNER.split(",").map(id => Number(id.trim()));
	return OWNERS.includes(Number(userId));
}

function isNumber(value) {
	const regex = /^-?\d+(\.\d+)?$/;
	return regex.test(value);
}

module.exports = {isOwner,isNumber};
