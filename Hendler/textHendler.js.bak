const createUser = require("../module/createUser.js");
const { isOwner } = require("../module/validasi.js");
const axios = require("axios");
const { countUsers, countUsersThisMonth } = require("../module/Statistik.js");
const {
	clearUserStep,
	getlastMesage_id,
	setlastMesage_id
} = require("../module/Session.js");
const akun = require("../model/Account.js");
const User = require("../model/User.js");
const CHANNEL_ID = -1003157492398;
async function checkJoin(bot, userId) {
	try {
		const res = await bot.getChatMember(CHANNEL_ID, userId);
		const status = res.status;
		console.log(status);
		return (
			status === "member" ||
			status === "administrator" ||
			status === "creator"
		);
	} catch (e) {
		return false;
	}
}

module.exports = bot => {
	bot.onText(/\/start/, async msg => {
		const userId = msg.from.id;
		const chatId = msg.chat.id;
		const lastMesage_id = getlastMesage_id();
		const name = msg.from.first_name || "undefined";
		const joined = await checkJoin(bot, userId);
		const username = msg.from.username
			? `@${msg.from.username}`
			: "Anda belum membuat username";
		await createUser(userId, username);
		if (!joined) {
			return bot.sendMessage(
				userId,
				`⚠️ Kamu harus join channel dulu untuk menggunakan bot ini.\n\n` +
					`Setelah join, kirim ulang perintah /start`,
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "Join Channel",
									url: "https://t.me/galangStar"
								}
							]
						]
					}
				}
			);
		}
		try {
			if (lastMesage_id[userId]) {
				bot.deleteMessage(chatId, lastMesage_id[userId]);
			}
		} catch (err) {
			return;
		}
		let status = "";
		const users = await User.findOne({
			where: { user_id: userId }
		});
		if (!users.premium) {
			status = "Free";
		} else {
			status = "Premium";
		}
		await createUser(userId, username);
		clearUserStep(userId);
		const quote = await axios.get(
			"https://quotes.liupurnomo.com/api/quotes/random"
		);
		const sent = await bot.sendMessage(
			chatId,
			`Welcome to GalangBot \n		
🗒️ quote:
<pre>${quote.data.data.text}</pre> 
<b>Info User:</b>
🆔 ID: <code>${userId}</code>
👤 Name: ${name}
📊 Status: ${status}
📛 Username: ${username}

<b>Please select the menu:</b>`,
			{
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "GET SSH PREMIUM",
								callback_data: "getSSHPrem"
							},
							{
								text: "Buy Premium",
								callback_data: "buyPrem"
							}
						],
						[
							{ text: "GET SSH", callback_data: "getSSH" },
							{ text: "GET V2RAY", callback_data: "getV2RAY" }
						],
						[
							{
								text: "Donate",
								url: "https://saweria.co/GalangStoree"
							}
						]
					]
				},
				parse_mode: "HTML"
			}
		);
		setlastMesage_id(userId, sent.message_id);
	});

	bot.onText(/\/ownerp/, async msg => {
		const userId = msg.from.id;
		const chatId = msg.chat.id;
		const lastMesage_id = getlastMesage_id();
		if (!isOwner(userId)) {
			bot.sendMessage(chatId, "Anda tidak memiliki akses!");
			return;
		}
		try {
			if (lastMesage_id[userId]) {
				bot.deleteMessage(chatId, lastMesage_id[userId]);
			}
		} catch (err) {
			return;
		}
		clearUserStep(userId);
		const sent = await bot.sendMessage(chatId, `Owner panel:`, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Upload Acount",
							callback_data: "owner_uploadAcount"
						},
						{
							text: "Broadcash",
							callback_data: "owner_bc"
						}
					]
				]
			}
		});
		setlastMesage_id(userId, sent.message_id);
	});

	bot.onText(/\/statistik/, async msg => {
		const userId = msg.from.id;
		const chatId = msg.chat.id;
		if (!isOwner(userId)) {
			bot.sendMessage(chatId, "Anda tidak memiliki akses!");
			return;
		}
		const countUser = await countUsers();
		const countUsersThisMont = await countUsersThisMonth();

		const message = `📊 Statistik Bot Saat Ini

👥 Total pengguna: ${countUser}
🗓️ Pengguna baru bulan ini: ${countUsersThisMont}

Terima kasih sudah menggunakan bot ini 💙`;
		bot.sendMessage(chatId, message);
	});
};
