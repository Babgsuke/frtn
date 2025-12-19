const broadcash = require("../module/bc.js");
const {
	setUserStep,
	getUserStep,
	clearUserStep,
	getlastMesage_id,
	setlastMesage_id
} = require("../module/Session.js");
const { isNumber } = require("../module/validasi.js");

module.exports = bot => {
	bot.on("message", async msg => {
		const chatId = msg.chat.id;
		const userId = msg.from.id;
		const UserStep = getUserStep();
		const input = msg.text?.trim();
		const lastMesageid = getlastMesage_id();
		
		broadcash.handleMessage(bot, msg);

		if (!UserStep[userId] || input.startsWith("/")) return;
		if (UserStep[userId].step == "inputBc") {
			const message = msg.text?.trim();
			broadcash(bot, chatId, message);
			clearUserStep(userId);
		} else if (UserStep[userId].step == "inptAcount") {
			const message = msg.text?.trim();
			setUserStep(userId, { step: "inptexp", data: { message } });
			bot.deleteMessage(chatId, lastMesageid[userId]);
			bot.sendMessage(chatId, "Masukan day exp akun contoh 30 = 30 day");
		} else if (UserStep[userId].step == "inptexp") {
			const exp = msg.text?.trim();
			if (!isNumber(exp)) {
				bot.sendMessage(chatId, "mohon masukan angka!");
				return;
			}
			const data = UserStep[userId].data.message;
			console.log(data);
			bot.sendMessage(chatId, "Masukan type akun", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "SSH",
								callback_data: "ssh"
							},
							{
								text: "V2RAY",
								callback_data: "v2ray"
							}
						]
					]
				}
			});
			setUserStep(userId, { data: { exp, data } });
		}
	});
};