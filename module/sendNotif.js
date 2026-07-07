const GROUP_NOTIF_ID = process.env.GROUP_ID;

function maskUserId(id) {
	const s = String(id);
	if (s.length <= 4) return s;
	return s.slice(0, 3) + "xxxx" + s.slice(-3);
}

function formatRupiah(angka) {
	return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function sendNotif(bot, { userId, serverName, protocol, days, price, status, message }) {
	if (!GROUP_NOTIF_ID) return;
	const text = `━━━━━━━━━━━━━━━━━━━━
🧾 <b>TRANSAKSI BARU</b>
━━━━━━━━━━━━━━━━━━━━
🆔 ID      : <code>${maskUserId(userId)}</code>
🖥 Server  : ${serverName}
📡 Proto   : ${protocol.toUpperCase()}
⏱ Durasi  : ${days} Hari
💰 Harga   : ${price ? formatRupiah(price) : "-"}
📌 Status  : ${status}
━━━━━━━━━━━━━━━━━━━━
${message || ""}`;
	try {
		await bot.sendMessage(GROUP_NOTIF_ID, text, { parse_mode: "HTML" });
	} catch (e) {
		console.error("Gagal kirim notif:", e.message);
	}
}

module.exports = sendNotif;
