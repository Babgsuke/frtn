async function getDate(day) {
	const now = new Date();

	const future = new Date(now);
	future.setDate(now.getDate() + parseInt(day));

	const yyyy = future.getFullYear();
	const mm = String(future.getMonth() + 1).padStart(2, "0");
	const dd = String(future.getDate()).padStart(2, "0");

	const formatted = `${yyyy}-${mm}-${dd}`;
	return formatted;
}
module.exports = getDate;
