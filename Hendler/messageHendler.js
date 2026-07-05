const broadcash = require("../module/bc.js");
const Server = require("../model/Server.js");
const Price = require("../model/Price.js");
const axios = require("axios");
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
		} else if (UserStep[userId].step == "inputServer") {
			const input = msg.text?.trim();
			const parts = input.split(",").map(s => s.trim());
			if (parts.length < 3) {
				bot.sendMessage(chatId, "Format salah. Gunakan: nama_server, host, port\nContoh: Server SGDO, 103.xx.xx.xx, 3000");
				return;
			}
			const name = parts[0];
			const host = parts[1];
			const port = parts[2];
			try {
				await Server.create({ name, host, port });
				bot.sendMessage(chatId, `✅ Server "${name}" berhasil ditambahkan!`);
				clearUserStep(userId);
			} catch (e) {
				bot.sendMessage(chatId, "❌ Gagal menambahkan server: " + e.message);
			}
		} else if (UserStep[userId].step == "inputPrice") {
			const input = msg.text?.trim();
			const parts = input.split(",").map(s => s.trim());
			if (parts.length < 3) {
				bot.sendMessage(chatId, "Format salah. Gunakan: days, price, label\nContoh: 30, 50000, 30 Hari");
				return;
			}
			if (!isNumber(parts[0]) || !isNumber(parts[1])) {
				bot.sendMessage(chatId, "Days dan price harus angka!");
				return;
			}
			try {
				await Price.create({ days: parseInt(parts[0]), price: parseInt(parts[1]), label: parts[2] });
				bot.sendMessage(chatId, "✅ Harga berhasil ditambahkan!");
				clearUserStep(userId);
			} catch (e) {
				bot.sendMessage(chatId, "❌ Gagal menambahkan harga: " + e.message);
			}
		} else if (UserStep[userId].step == "editPrice") {
			const priceId = UserStep[userId].data.priceId;
			if (!isNumber(input)) {
				bot.sendMessage(chatId, "Harga harus angka!");
				return;
			}
			try {
				await Price.update({ price: parseInt(input) }, { where: { id: priceId } });
				bot.sendMessage(chatId, "✅ Harga berhasil diupdate!");
				clearUserStep(userId);
			} catch (e) {
				bot.sendMessage(chatId, "❌ Gagal update harga: " + e.message);
			}
		} else if (UserStep[userId].step == "toolInput") {
			const td = UserStep[userId].data;
			const { serverId, action } = td;

			const server = await Server.findByPk(serverId);
			if (!server) {
				bot.sendMessage(chatId, "Server tidak ditemukan");
				clearUserStep(userId);
				return;
			}

			const isRenew = action.startsWith("renew");
			const isDelete = action.startsWith("delete");
			const isQuota = action.startsWith("quota");
			const isIplimit = action.startsWith("iplimit");
			const isLockUnlock = action === "lock" || action === "unlock";
			const needsDays = isRenew;
			const needsNumber = isQuota || isIplimit || action === "autoReboot" || action === "domain";

			const protoFromAction = action.includes("_") ? action.split("_").slice(1).join("_") : "ssh";

			if (isLockUnlock || isRenew || isDelete) {
				if (!input || input.length < 2) {
					bot.sendMessage(chatId, "Username tidak valid! Minimal 2 karakter.");
					return;
				}
				if (needsDays) {
					setUserStep(userId, { step: "toolInputDays", data: { serverId, action, username: input } });
					bot.sendMessage(chatId, "Masukkan jumlah hari:");
					return;
				}
				const path = isLockUnlock ? "/api/" + protoFromAction + "/" + input + "/" + action
					: isDelete ? "/api/" + protoFromAction + "/" + input
					: "/api/" + protoFromAction + "/" + input + "/renew";
				const method = isDelete ? "DELETE" : "PUT";
				bot.sendMessage(chatId, "⏳ Memproses...");
				try {
					const res = await axios({ method, url: "http://" + server.host + ":" + server.port + path, timeout: 15000 });
					const msg = res?.data?.message || JSON.stringify(res.data);
					bot.sendMessage(chatId, "✅ " + msg);
				} catch (e) {
					bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
				}
				clearUserStep(userId);
			} else if (isQuota || isIplimit) {
				if (!input || input.length < 2) {
					bot.sendMessage(chatId, "Username tidak valid!");
					return;
				}
				setUserStep(userId, { step: "toolInputNumber", data: { serverId, action, username: input } });
				const prompt = isQuota ? "Masukkan quota (GB):" : "Masukkan IP limit (angka):";
				bot.sendMessage(chatId, prompt);
			} else if (action === "domain") {
				if (!input || input.length < 4) {
					bot.sendMessage(chatId, "Domain tidak valid!");
					return;
				}
				bot.sendMessage(chatId, "⏳ Memproses...");
				try {
					const res = await axios.post("http://" + server.host + ":" + server.port + "/api/server/domain", { domain: input }, { timeout: 15000 });
					bot.sendMessage(chatId, "✅ " + (res?.data?.message || "Domain berhasil diubah"));
				} catch (e) {
					bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
				}
				clearUserStep(userId);
			} else if (action === "autoReboot") {
				if (!isNumber(input) || parseInt(input) < 0 || parseInt(input) > 23) {
					bot.sendMessage(chatId, "Masukkan jam 0-23!");
					return;
				}
				bot.sendMessage(chatId, "⏳ Memproses...");
				try {
					const res = await axios.post("http://" + server.host + ":" + server.port + "/api/system/autoreboot", { hour: parseInt(input) }, { timeout: 15000 });
					bot.sendMessage(chatId, "✅ " + (res?.data?.message || "Auto-reboot diatur"));
				} catch (e) {
					bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
				}
				clearUserStep(userId);
			}
		} else if (UserStep[userId].step == "toolInputDays") {
			const td = UserStep[userId].data;
			const { serverId, action, username } = td;
			if (!isNumber(input) || parseInt(input) < 1) {
				bot.sendMessage(chatId, "Masukkan angka hari yang valid!");
				return;
			}
			const server = await Server.findByPk(serverId);
			if (!server) { clearUserStep(userId); return; }
			const protoFromAction = action.includes("_") ? action.split("_").slice(1).join("_") : "ssh";
			bot.sendMessage(chatId, "⏳ Memperpanjang " + username + " selama " + input + " hari...");
			try {
				const res = await axios.put("http://" + server.host + ":" + server.port + "/api/" + protoFromAction + "/" + username + "/renew", { days: parseInt(input) }, { timeout: 15000 });
				bot.sendMessage(chatId, "✅ " + (res?.data?.message || "Berhasil"));
			} catch (e) {
				bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
			}
			clearUserStep(userId);
		} else if (UserStep[userId].step == "toolInputNumber") {
			const td = UserStep[userId].data;
			const { serverId, action, username } = td;
			if (!isNumber(input) || parseInt(input) < 1) {
				bot.sendMessage(chatId, "Masukkan angka yang valid!");
				return;
			}
			const server = await Server.findByPk(serverId);
			if (!server) { clearUserStep(userId); return; }
			const protoFromAction = action.includes("_") ? action.split("_").slice(1).join("_") : "vmess";

			const isQuota = action.startsWith("quota");
			const key = isQuota ? "quota" : "iplimit";
			const body = {};
			body[key] = parseInt(input);

			bot.sendMessage(chatId, "⏳ Memproses...");
			try {
				const res = await axios.put("http://" + server.host + ":" + server.port + "/api/" + protoFromAction + "/" + username + "/" + key, body, { timeout: 15000 });
				bot.sendMessage(chatId, "✅ " + (res?.data?.message || "Berhasil"));
			} catch (e) {
				bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
			}
			clearUserStep(userId);
		}
	});
};
