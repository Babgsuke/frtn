const getAkunRandom = require("../module/getAkun.js");
const isowner = require("../module/validasi.js");
const broadcash = require("../module/bc.js");
const createAcount = require("../module/UploadAcount.js");
const getDate = require("../module/Date.js");
const user = require("../model/User.js");
const baseUrlApi = process.env.baseUrl;
const port = process.env.port;
const axios = require("axios");
const payApi = process.env.payApi;
const {
	clearUserStep,
	setUserStep,
	getUserStep,
	getlastMesage_id,
	setlastMesage_id
} = require("../module/Session.js");
function formatRupiahRp(angka) {
	return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
module.exports = bot => {
	bot.on("callback_query", async query => {
		const lastMesageid = getlastMesage_id();
		const userstep = getUserStep();
		const username = query.from.username;
		const chatId = query.message.chat.id;
		const userId = query.from.id;
		const messageId = query.message.message_id;

		if (query.data.startsWith("owner_")) {
			clearUserStep(userId);
			const promt = query.data.replace("owner_", "");
			console.log(promt);
			switch (promt) {
				case "bc":
					broadcash.start(bot, userId)
					break;
				case "uploadAcount":
					bot.editMessageText("Masukan detail akun", {
						chat_id: chatId,
						message_id: lastMesageid[userId]
					});
					setUserStep(userId, { step: "inptAcount" });
					break;
				default:
			}
		}

		if (query.data == "getSSHPrem") {
			try {
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				const users = await user.findOne({ where: userId });
				if (!users.premium) {
					const sent = await bot.sendMessage(
						chatId,
						`Fitur ini hanya untuk pengguna *Premium*.

*Dengan Premium kamu bisa:*
• unlimited create ssh/v2ray premium
• server stabil
• masa aktif ssh/v2ray 7 hari

*Ketik tombol di bawah untuk upgrade* ✨`,
						{
							parse_mode: "Markdown",
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "Upgrade PREMIUM 30 DAY",
											callback_data: "buyPrem30"
										}
									]
								]
							}
						}
					);
					setlastMesage_id(userId, sent.message_id);
					return;
				}
				console.log(`${baseUrlApi}:${port}/api/ssh/create`);
				const res = await axios.post(
					`${baseUrlApi}:${port}/api/ssh/create`
				);
				console.log(res);
				const raw = res.data.data;

				// ubah \\n menjadi newline beneran
				const message = raw.replace(/\\n/g, "\n");

				bot.sendMessage(chatId, message, {
					parse_mode: "HTML",
					disable_web_page_preview: true
				});
			} catch (err) {
				console.log("gagal get ssh premium: " + err);
				bot.sendMessage(
					chatId,
					"Terjadi kesalahan server.Silahkan hubunggi admin"
				);
			}
		}
		if (query.data == "getV2RAYPrem") {
			try {
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				console.log(user);
				const users = await user.findOne({ where: userId });
				if (!users.premium) {
					const sent = await bot.sendMessage(
						chatId,
						`Fitur ini hanya untuk pengguna *Premium*.

*Dengan Premium kamu bisa:*
• unlimited create ssh/v2ray premium
• server stabil
• masa aktif ssh/v2ray 7 hari

*Ketik tombol di bawah untuk upgrade* ✨`,
						{
							parse_mode: "Markdown",
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "BUY PREMIUM 30 DAY",
											callback_data: "buyPrem30"
										}
									]
								]
							}
						}
					);
					setlastMesage_id(userId, sent.message_id);
					return;
				}
				console.log(`${baseUrlApi}:${port}/api/ssh/create`);
				const res = await axios.post(
					`${baseUrlApi}:${port}/api/vmess/create`
				);
				console.log(res);
				const raw = res.data.data;

				// ubah \\n menjadi newline beneran
				const message = raw.replace(/\\n/g, "\n");

				bot.sendMessage(chatId, message, {
					parse_mode: "HTML",
					disable_web_page_preview: true
				});
			} catch (err) {
				console.log("gagal get ssh premium: " + err);
				bot.sendMessage(
					chatId,
					"Terjadi kesalahan server.Silahkan hubunggi admin"
				);
			}
		}

		if (query.data == "buyPrem") {
			try {
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				const users = await user.findOne({ where: userId });
				if (!users.premium) {
					const sent = await bot.sendMessage(
						chatId,
						`Fitur ini hanya untuk pengguna *Premium*.

*Dengan Premium kamu bisa:*
• unlimited create ssh/v2ray premium
• server stabil
• masa aktif ssh/v2ray 7 hari

*Ketik tombol di bawah untuk upgrade* ✨`,
						{
							parse_mode: "Markdown",
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "Upgrade PREMIUM 30 DAY",
											callback_data: "buyPrem30"
										}
									]
								]
							}
						}
					);
					setlastMesage_id(userId, sent.message_id);
					return;
				}
				const sent = await bot.sendMessage(
					chatId,
					"Anda sudah menjadi premium"
				);
				setlastMesage_id(userId, sent.message_id);
			} catch (err) {
				console.error("Error:", err);
				bot.sendMessage(chatId, "Terjadi kesalahan server.");
			}
		}
		if (query.data == "buyPrem30") {
			try {
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				const res = await axios.get(
					"https://api.adijayavpn.cloud/api/deposit",
					{
						params: {
							amount: 5000,
							apikey: payApi
						}
					}
				);
				console.log(res);
				bot.deleteMessage(chatId, messageId);
				const sent = await bot.sendPhoto(
					chatId,
					res.data.data.qris_url,
					{
						caption: `Invoice Pembayaran Berhasil Dibuat

Order Id: ${res.data.data.transaction_id}
Jumlah: ${formatRupiahRp(res.data.data.total_amount)}

Silakan scan QRIS di atas untuk menyelesaikan pembayaran, expired dalam 8 menit..`
					}
				);
				const startTime = Date.now();
				const timeout = 8 * 60 * 1000;
				while (Date.now() - startTime < timeout) {
					try {
						const result = await axios.get(
							"https://api.adijayavpn.cloud/api/status/payment",
							{
								params: {
									transaction_id:
										res.data.data.transaction_id,
									apikey: payApi
								}
							}
						);
						console.log(result);

						if (result.data.paid) {
							await user.update(
								{
									premium: true,
									premium_exp: new Date(
										Date.now() + 30 * 24 * 60 * 60 * 1000
									)
								},
								{ where: { user_id: userId } }
							);
							bot.deleteMessage(chatId, sent.message_id);
							bot.sendMessage(
								chatId,
								`🎉 *Selamat!*  
Status kamu menjadi *Premium* 🎉

🔥 Fitur yang sekarang bisa kamu gunakan:
• unlimited create ssh/v2ray Premium  

📅 Masa aktif: *30 hari*  
🔐 Terima kasih sudah mendukung bot ini!`,
								{
									parse_mode: "Markdown"
								}
							);
							return;
						}
						await new Promise(resolve => setTimeout(resolve, 3000));
					} catch (err) {
						console.error("Error:", err);
					}
				}
				await bot.deleteMessage(userId, sent.message_id);
				bot.sendMessage(
					userId,
					"Timeout: Pembayaran tidak diterima dalam 8 menit"
				);
			} catch (err) {
				console.error("Error:", err);
				bot.sendMessage(
					chatId,
					"Terjadi kesalahan server, Silakan hubunggi admin"
				);
			}
		}

		if (query.data == "getSSH") {
			try {
				const Akun = await getAkunRandom("ssh");
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				bot.sendMessage(chatId, Akun.detail, {
					parse_mode: "HTML"
				});
				bot.sendMessage(
					process.env.OWNER,
					`@${username} ${userId} telah get ssh`
				);
			} catch (err) {
				bot.sendMessage(chatId, "Gagal Mendapatkan Akun");
				console.log(err);
			}
		} else if (query.data == "getV2RAY") {
			try {
				const Akun = await getAkunRandom("v2ray");
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				bot.sendMessage(chatId, Akun.detail, {
					parse_mode: "HTML"
				});
				bot.sendMessage(
					process.env.OWNER,
					`@${username} ${userId} telah get v2ray`
				);
			} catch (err) {
				bot.sendMessage(chatId, "Gagal Mendapatkan Akun");
			}
		} else if (query.data == "ssh") {
			const exp = await getDate(userstep[userId].data.exp);
			try {
				await createAcount(userstep[userId].data.data, "ssh", exp);
				bot.editMessageText("Berhasil Menambahkan akun", {
					chat_id: chatId,
					message_id: messageId
				});
				clearUserStep(userId);
			} catch (err) {
				bot.editMessageText("terjadi kesalahan server", {
					chat_id: chatId,
					message_id: messageId
				});
				console.error("Error:", err);
				clearUserStep(userId);
			}
		} else if (query.data == "v2ray") {
			const exp = await getDate(userstep[userId].data.exp);
			console.log("exppppppppp ", exp);
			console.log(userstep[userId].data.exp);
			try {
				await createAcount(userstep[userId].data.data, "v2ray", exp);
				bot.editMessageText("Berhasil Menambahkan akun", {
					chat_id: chatId,
					message_id: messageId
				});
				clearUserStep(userId);
			} catch (err) {
				console.error("Error:", err);
				bot.editMessageText("terjadi kesalahan server", {
					chat_id: chatId,
					message_id: messageId
				});
				clearUserStep(userId);
			}
		}
	});
};