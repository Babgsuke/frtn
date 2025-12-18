const getAkunRandom = require("../module/getAkun.js");
const isowner = require("../module/validasi.js");
const broadcash = require("../module/bc.js");
const createAcount = require("../module/UploadAcount.js");
const getDate = require("../module/Date.js");
const {
	clearUserStep,
	setUserStep,
	getUserStep,
	getlastMesage_id,
	setlastMesage_id
} = require("../module/Session.js");
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

		if (query.data == "getSSH") {
			try {
				const Akun = await getAkunRandom("ssh");
				await bot.deleteMessage(chatId, lastMesageid[userId]);
				bot.sendMessage(chatId, Akun.detail, {
					parse_mode: "HTML"
				});
                bot.sendMessage(process.env.OWNER, `@${username} ${userId} telah get ssh`)
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
                bot.sendMessage(process.env.OWNER, `@${username} ${userId} telah get v2ray`)
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