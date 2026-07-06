const TEST_MODE = process.env.TEST_MODE === "true";
const { logError } = require("../module/logger.js");

const broadcash = require("../module/bc.js");
const createAcount = require("../module/UploadAcount.js");
const getDate = require("../module/Date.js");
const user = require("../model/User.js");
const Server = require("../model/Server.js");
const Price = require("../model/Price.js");
const Account = require("../model/Account.js");
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
const PROTOCOL_LIST = [
	{ key: "ssh", label: "SSH" },
	{ key: "vmess", label: "VMess" },
	{ key: "vless", label: "VLess" },
	{ key: "trojan", label: "Trojan" },
	{ key: "shadowsocks", label: "Shadowsocks" }
];

function formatRupiah(angka) {
	return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function randomStr(length) {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}

function formatJson(text) {
	try {
		return "<pre>" + JSON.stringify(JSON.parse(text), null, 2) + "</pre>";
	} catch {
		return "<pre>" + text + "</pre>";
	}
}

async function callServerApi(serverId, method, path, data = null) {
	const ServerModel = require("../model/Server.js");
	const sv = await ServerModel.findByPk(serverId);
	if (!sv) throw new Error("Server tidak ditemukan");
	const url = `http://${sv.host}:${sv.port}${path}`;
	const config = { method, url, timeout: 20000 };
	if (data) config.data = data;
	const res = await axios(config);
	return res.data;
}

async function proceedToCreate(bot, chatId, userId, lastMesageid, { serverId, serverName, serverHost, serverPort, protocol, days, price, username, password }) {
	if (TEST_MODE) {
		const body = { username, quota: 0, iplimit: 2, days };
		if (password) body.password = password;
		try {
			const apiRes = await axios.post(`http://${serverHost}:${serverPort}/api/${protocol}`, body, { timeout: 20000 });
			const raw = apiRes?.data?.text || apiRes?.data?.html || apiRes?.data?.message || "Akun berhasil dibuat";
			const message = raw.replace(/\\n/g, "\n");
			await bot.sendMessage(chatId, "🧪 <b>TEST MODE</b>\n\n" + message, {
				parse_mode: "HTML",
				disable_web_page_preview: true
			});
			const exp = apiRes?.data?.data?.exp || null;
			try { await Account.create({ userId: String(userId), detail: raw, type: protocol, exp, serverId, protocol }); } catch (_) {}
		} catch (apiErr) {
			logError("buy_vpn_create", apiErr);
			await bot.sendMessage(chatId, "🧪 <b>TEST MODE</b>\n\n❌ Gagal membuat akun: " + (apiErr.response?.data?.error || apiErr.message));
		}
		return;
	}

	const res = await axios.get("https://qris.adijayavpn.cloud/api/deposit", {
		params: { amount: price, apikey: payApi }
	});

	const sent = await bot.sendPhoto(chatId, res.data.data.qris_url, {
		caption: `🧾 <b>Invoice Pembayaran</b>

🖥 Server: ${serverName}
📡 Protokol: ${protocol.toUpperCase()}
⏱ Durasi: ${days} Hari
💰 Total: ${formatRupiah(res.data.data.total_amount)}

Order ID: <code>${res.data.data.transaction_id}</code>

Silakan scan QRIS untuk menyelesaikan pembayaran. Expired dalam 8 menit.`,
		parse_mode: "HTML"
	});

	setUserStep(userId, {
		step: "waiting_payment",
		data: { serverId, serverName, serverHost, serverPort, protocol, days, username, password, transactionId: res.data.data.transaction_id }
	});

	const startTime = Date.now();
	const timeout = 8 * 60 * 1000;
	while (Date.now() - startTime < timeout) {
		try {
			const result = await axios.get("https://qris.adijayavpn.cloud/api/status/payment", {
				params: { transaction_id: res.data.data.transaction_id, apikey: payApi }
			});
			if (result.data.paid) {
				await bot.deleteMessage(chatId, sent.message_id);
				const stepData = getUserStep()[userId]?.data;
				if (stepData) {
					try {
						const body = { username: stepData.username, quota: 0, iplimit: 2, days: stepData.days };
						if (stepData.password) body.password = stepData.password;
						const apiRes = await axios.post(`http://${stepData.serverHost}:${stepData.serverPort}/api/${stepData.protocol}`, body, { timeout: 20000 });
						const raw = apiRes?.data?.text || apiRes?.data?.html || apiRes?.data?.message || "Akun berhasil dibuat";
						const message = raw.replace(/\\n/g, "\n");
						await bot.sendMessage(chatId, message, {
							parse_mode: "HTML",
							disable_web_page_preview: true
						});
						const exp = apiRes?.data?.data?.exp || null;
						try { await Account.create({ userId: String(userId), detail: raw, type: stepData.protocol, exp, serverId: stepData.serverId, protocol: stepData.protocol }); } catch (_) {}
					} catch (apiErr) {
						await bot.sendMessage(chatId,
							`✅ Pembayaran berhasil!\n🖥 Server: ${stepData.serverName}\n📡 Protokol: ${stepData.protocol.toUpperCase()}\n⏱ Durasi: ${stepData.days} Hari\n\nNamun gagal membuat akun. Silakan hubungi admin.`
						);
					}
				}
				clearUserStep(userId);
				return;
			}
			await new Promise(resolve => setTimeout(resolve, 3000));
		} catch (err) {
			logError("payment_polling", err);
		}
	}
	await bot.deleteMessage(chatId, sent.message_id);
	bot.sendMessage(chatId, "⏳ Timeout: Pembayaran tidak diterima dalam 8 menit");
	clearUserStep(userId);
}

const TOOL_CATEGORIES = {
	info: { label: "📊 Server Info", icon: "📊" },
	ssh: { label: "👥 SSH Management", icon: "👥" },
	xray: { label: "📡 Xray Management", icon: "📡" },
	sys: { label: "🔧 System Tools", icon: "🔧" },
	mon: { label: "📈 Monitoring", icon: "📈" }
};

async function showToolServerMenu(bot, chatId, userId, lastMesageid) {
	const servers = await Server.findAll();
	let keyboard = [];
	if (servers.length === 0) {
		keyboard.push([{ text: "Belum ada server", callback_data: "noop" }]);
	} else {
		for (const sv of servers) {
			keyboard.push([{ text: "🖥 " + sv.name, callback_data: "svTool_" + sv.id }]);
		}
	}
	await bot.editMessageText("🛠 <b>Pilih Server untuk Tools:</b>", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		parse_mode: "HTML",
		reply_markup: { inline_keyboard: keyboard }
	});
}

async function showToolCategories(bot, chatId, userId, lastMesageid, serverId) {
	const server = await Server.findByPk(serverId);
	if (!server) return bot.sendMessage(chatId, "Server tidak ditemukan");
	let keyboard = [
		[{ text: "📊 Info & Status", callback_data: "toolCat_" + serverId + "_info" }],
		[{ text: "👥 SSH Management", callback_data: "toolCat_" + serverId + "_ssh" }],
		[{ text: "📡 Xray Management", callback_data: "toolCat_" + serverId + "_xray" }],
		[{ text: "🔧 System Tools", callback_data: "toolCat_" + serverId + "_sys" }],
		[{ text: "📈 Monitoring", callback_data: "toolCat_" + serverId + "_mon" }]
	];
	await bot.editMessageText("🛠 <b>" + server.name + "</b>\n\nPilih kategori tools:", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		parse_mode: "HTML",
		reply_markup: { inline_keyboard: keyboard }
	});
}

async function showToolActions(bot, chatId, userId, lastMesageid, serverId, category) {
	const server = await Server.findByPk(serverId);
	if (!server) return bot.sendMessage(chatId, "Server tidak ditemukan");
	let keyboard = [];

	if (category === "info") {
		keyboard = [
			[{ text: "📋 Info Server", callback_data: "tool_" + serverId + "_serverInfo" }],
			[{ text: "📋 Status Service", callback_data: "tool_" + serverId + "_serverStatus" }],
			[{ text: "⚡ Speedtest", callback_data: "tool_" + serverId + "_speedtest" }],
			[{ text: "🌐 Change Domain", callback_data: "toolInput_" + serverId + "_domain" }],
			[{ text: "🔁 Reboot Server", callback_data: "toolConfirm_" + serverId + "_reboot" }],
			[{ text: "🔄 Restart Services", callback_data: "toolConfirm_" + serverId + "_restart" }]
		];
	} else if (category === "ssh") {
		keyboard = [
			[{ text: "📋 List Users", callback_data: "tool_" + serverId + "_listSsh" }],
			[{ text: "👤 Active Sessions", callback_data: "tool_" + serverId + "_sshActive" }],
			[{ text: "🔒 Lock User", callback_data: "toolInput_" + serverId + "_lock_ssh" }],
			[{ text: "🔓 Unlock User", callback_data: "toolInput_" + serverId + "_unlock_ssh" }],
			[{ text: "📅 Renew User", callback_data: "toolInput_" + serverId + "_renew_ssh" }],
			[{ text: "❌ Delete User", callback_data: "toolInput_" + serverId + "_delete_ssh" }]
		];
	} else if (category === "xray") {
			const xrayProtos = PROTOCOL_LIST.filter(p => p.key !== "ssh");
			for (let i = 0; i < xrayProtos.length; i += 2) {
				const row = [{ text: xrayProtos[i].label, callback_data: "toolXray_" + serverId + "_" + xrayProtos[i].key }];
				if (xrayProtos[i + 1]) {
					row.push({ text: xrayProtos[i + 1].label, callback_data: "toolXray_" + serverId + "_" + xrayProtos[i + 1].key });
				}
				keyboard.push(row);
			}
	} else if (category === "sys") {
		keyboard = [
			[{ text: "🧹 Clean Expired", callback_data: "toolConfirm_" + serverId + "_cleanExpired" }],
			[{ text: "🗑 Clear Cache", callback_data: "toolConfirm_" + serverId + "_clearCache" }],
			[{ text: "💾 Backup", callback_data: "toolConfirm_" + serverId + "_backup" }],
			[{ text: "⏰ Set Auto Reboot", callback_data: "toolInput_" + serverId + "_autoReboot" }]
		];
	} else if (category === "mon") {
		keyboard = [
			[{ text: "📊 IP Limits", callback_data: "tool_" + serverId + "_monitorIps" }],
			[{ text: "📊 Quota Usage", callback_data: "tool_" + serverId + "_monitorQuota" }]
		];
	}

	keyboard.push([{ text: "⬅ Kembali", callback_data: "svTool_" + serverId }]);
	const catLabel = TOOL_CATEGORIES[category]?.label || category;
	await bot.editMessageText("🛠 <b>" + server.name + " → " + catLabel + "</b>", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		parse_mode: "HTML",
		reply_markup: { inline_keyboard: keyboard }
	});
}

async function showToolXrayActions(bot, chatId, userId, lastMesageid, serverId, protocol) {
	const server = await Server.findByPk(serverId);
	if (!server) return bot.sendMessage(chatId, "Server tidak ditemukan");
	const protoLabel = PROTOCOL_LIST.find(p => p.key === protocol)?.label || protocol.toUpperCase();
	const keyboard = [
		[{ text: "📋 List Users", callback_data: "tool_" + serverId + "_listXray_" + protocol }],
		[{ text: "📅 Renew User", callback_data: "toolInput_" + serverId + "_renew_" + protocol }],
		[{ text: "📦 Set Quota", callback_data: "toolInput_" + serverId + "_quota_" + protocol }],
		[{ text: "🔢 Set IP Limit", callback_data: "toolInput_" + serverId + "_iplimit_" + protocol }],
		[{ text: "❌ Delete User", callback_data: "toolInput_" + serverId + "_delete_" + protocol }],
		[{ text: "⬅ Kembali", callback_data: "toolCat_" + serverId + "_xray" }]
	];
	await bot.editMessageText("🛠 <b>" + server.name + " → Xray → " + protoLabel + "</b>", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		parse_mode: "HTML",
		reply_markup: { inline_keyboard: keyboard }
	});
}

async function showServerMenu(bot, chatId, userId, lastMesageid) {
	const servers = await Server.findAll();
	let keyboard = [];
	if (servers.length === 0) {
		keyboard.push([{ text: "Belum ada server", callback_data: "noop" }]);
	} else {
		for (const sv of servers) {
			keyboard.push([
				{ text: `${sv.name} (${sv.host})`, callback_data: "noop" },
				{ text: "Hapus", callback_data: "delServer_" + sv.id }
			]);
		}
	}
	keyboard.push([{ text: "➕ Tambah Server", callback_data: "owner_addServer" }]);
	await bot.editMessageText("📡 Manage Server:", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		reply_markup: { inline_keyboard: keyboard }
	});
}

async function showPriceMenu(bot, chatId, userId, lastMesageid) {
	const prices = await Price.findAll({ order: [["days", "ASC"]] });
	let keyboard = [];
	if (prices.length === 0) {
		keyboard.push([{ text: "Belum ada harga", callback_data: "noop" }]);
	} else {
		for (const p of prices) {
			keyboard.push([
				{ text: `${p.label} - ${formatRupiah(p.price)}`, callback_data: "noop" },
				{ text: "Edit", callback_data: "editPrice_" + p.id },
				{ text: "Hapus", callback_data: "delPrice_" + p.id }
			]);
		}
	}
	keyboard.push([{ text: "➕ Tambah Harga", callback_data: "owner_addPrice" }]);
	await bot.editMessageText("💰 Manage Prices:", {
		chat_id: chatId,
		message_id: lastMesageid[userId],
		reply_markup: { inline_keyboard: keyboard }
	});
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
				case "manageServer":
					showServerMenu(bot, chatId, userId, lastMesageid);
					break;
				case "addServer":
					bot.editMessageText("Masukan detail server:\n\nFormat: nama_server, host, port\n\nContoh: Server SGDO, 103.xx.xx.xx, 3000", {
						chat_id: chatId,
						message_id: lastMesageid[userId]
					});
					setUserStep(userId, { step: "inputServer" });
					break;
				case "managePrices":
					showPriceMenu(bot, chatId, userId, lastMesageid);
					break;
				case "addPrice":
					bot.editMessageText("Masukan detail harga:\n\nFormat: days, price, label\n\nContoh: 30, 50000, 30 Hari", {
						chat_id: chatId,
						message_id: lastMesageid[userId]
					});
					setUserStep(userId, { step: "inputPrice" });
					break;
				case "serverTools":
					showToolServerMenu(bot, chatId, userId, lastMesageid);
					break;
				default:
			}
		}
		
		if (query.data.startsWith("delServer_")) {
			const serverId = query.data.replace("delServer_", "");
			try {
				await Server.destroy({ where: { id: serverId } });
				bot.answerCallbackQuery(query.id, { text: "Server berhasil dihapus" });
				showServerMenu(bot, chatId, userId, lastMesageid);
			} catch (e) {
				bot.answerCallbackQuery(query.id, { text: "Gagal hapus server" });
			}
		}

		if (query.data.startsWith("delPrice_")) {
			const priceId = query.data.replace("delPrice_", "");
			try {
				await Price.destroy({ where: { id: priceId } });
				bot.answerCallbackQuery(query.id, { text: "Harga berhasil dihapus" });
				showPriceMenu(bot, chatId, userId, lastMesageid);
			} catch (e) {
				bot.answerCallbackQuery(query.id, { text: "Gagal hapus harga" });
			}
		}

		if (query.data.startsWith("editPrice_")) {
			const priceId = query.data.replace("editPrice_", "");
			bot.editMessageText("Masukan harga baru (angka saja):", {
				chat_id: chatId,
				message_id: lastMesageid[userId]
			});
			setUserStep(userId, { step: "editPrice", data: { priceId } });
		}
		
		if (query.data === "inviteFriend") {
		  try {
		  const dataUser = await user.findByPk(userId);
		  const total = dataUser.referral_count || 0;
          const rewarded = dataUser.referral_rewarded || 0;

          const nextTarget = Math.floor(total / 5) * 5 + 5;
          const remaining = nextTarget - total;
		  await bot.deleteMessage(chatId, messageId)
		  const sent = await bot.sendMessage(
      query.message.chat.id,
      `👥 <b>Undang teman & dapatkan premium!</b>

<b>🔗 Link referral kamu:</b>
<code>https://t.me/GalangStartbot?start=${userId}</code>
      
📊 <b>Statistik Referral Kamu</b>

👥 Total referral: <b>${total}</b>
🎁 Referral terhitung: <b>${rewarded}</b>

🏆 Reward:
• 5 referral = Premium +30 hari
• Berlaku kelipatan ♻️

🎯 Target berikutnya:
${remaining > 0
      ? `Butuh <b>${remaining}</b> referral lagi`
      : `🎉 Target tercapai!`
    }`,
      { parse_mode: "HTML", reply_markup: {
								inline_keyboard: [
									[
										{
											text: "🏆 Leaderboard",
											callback_data: "refLeaderboard"
										},
										{
	  text: "💳 Kirim undangan",
											url: `http://t.me/share/url?url=https://t.me/GalangStartbot?start=${userId}&text=Bot%20free%20ssh%20and%20V2ray%20gratis%21%0A`                           }
									]
								]
							} }
    );
    setlastMesage_id(userId, sent.message_id);
		  } catch (e) {
		    logError("dashboard", e)
		    bot.sendMessage(
					chatId,
					"Terjadi kesalahan server.Silahkan hubunggi admin"
				);
		  }
  }
  
  if (query.data == "refLeaderboard") {
    try {
    await bot.deleteMessage(chatId, lastMesageid[userId])
  const leaderboard = await user.findAll({
    where: {
      referral_count: {
        [require("sequelize").Op.gt]: 0
      }
    },
    order: [["referral_count", "DESC"]],
    limit: 10
  });

  if (leaderboard.length === 0) {
    return bot.sendMessage(
      chatId,
      "🏆 <b>Leaderboard Referral</b>\n\nBelum ada referral.",
      { parse_mode: "HTML" }
    );
  }

  let text = "🏆 <b>Leaderboard Referral</b>\n\n";

  leaderboard.forEach((u, i) => {
    const medal =
      i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

    text += `${medal} <b>${u.user_id}</b>\n`;
    text += `   👥 ${u.referral_count} referral\n\n`;
  });

  text += "🔥 Ajak teman dan masuk leaderboard!";

  const sent = await bot.sendMessage(chatId, `<blockquote>${text}</blockquote>`, {
    parse_mode: "HTML"
  });
  setlastMesage_id(userId, sent.message_id);
  bot.answerCallbackQuery(chatId);
    } catch (e) {
    logError("ref_leaderboard", e)
    }

	}
		if (query.data == "back_main") {
		const User = require("../model/User.js");
		const users = await User.findByPk(userId);
		const status = users && users.premium ? "Premium" : "Free";
		const name = query.from.first_name || "";
		const username = query.from.username ? "@" + query.from.username : "-";
		await bot.deleteMessage(chatId, lastMesageid[userId]);
		let quote;
		try {
			quote = await axios.get("https://quotes.liupurnomo.com/api/quotes/random", { timeout: 5000 });
		} catch (_) {
			quote = { data: { data: { text: "" } } };
		}
		const sent = await bot.sendMessage(chatId,
			`Welcome to GalangBot\n
🗒️ quote:
<pre>${quote.data.data.text}</pre>

<b>Info User:</b>
🆔 ID: <code>${userId}</code>
👤 Name: ${name}
📊 Status: ${status}
📛 Username: ${username}

<b>Please select the menu:</b>`,
			{
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[
							{ text: "🔰 Buy VPN", callback_data: "buy_vpn" }
						],
						[
							{ text: "📦 Akun Ku", callback_data: "my_accounts" }
						],
						[
							{ text: "👥 Undang Teman", callback_data: "inviteFriend" }
						]
					]
				}
			}
		);
		setlastMesage_id(userId, sent.message_id);
	}

	if (query.data == "my_accounts") {
		try {
			const accounts = await Account.findAll({ where: { userId: String(userId) }, order: [["createdAt", "DESC"]] });
			if (accounts.length === 0) {
				await bot.editMessageText("📦 <b>Akun Ku</b>\n\nBelum ada akun.", {
					chat_id: chatId,
					message_id: lastMesageid[userId],
					parse_mode: "HTML",
					reply_markup: { inline_keyboard: [[{ text: "⬅ Kembali", callback_data: "back_main" }]] }
				});
				return;
			}
			let keyboard = [];
			for (const acc of accounts) {
				const sv = await Server.findByPk(acc.serverId);
				const svName = sv?.name || "?";
				const label = svName + " - " + (acc.protocol || acc.type).toUpperCase();
				keyboard.push([{ text: "📦 " + label, callback_data: "accDetail_" + acc.id }]);
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "back_main" }]);
			await bot.editMessageText("📦 <b>Akun Ku</b>\n\nPilih akun untuk melihat detail:", {
				chat_id: chatId,
				message_id: lastMesageid[userId],
				parse_mode: "HTML",
				reply_markup: { inline_keyboard: keyboard }
			});
		} catch (e) {
			logError("my_accounts", e);
			bot.sendMessage(chatId, "Terjadi kesalahan");
		}
	}

	if (query.data.startsWith("accDetail_")) {
		try {
			const id = query.data.replace("accDetail_", "");
			const acc = await Account.findByPk(id);
			if (!acc) return bot.sendMessage(chatId, "Akun tidak ditemukan");
			const sv = await Server.findByPk(acc.serverId);
			const svName = sv?.name || "?";
			const header = "📦 <b>" + svName + " - " + (acc.protocol || acc.type).toUpperCase() + "</b>\n";
			const detail = acc.detail.replace(/\\n/g, "\n");
			await bot.sendMessage(chatId, header + "\n" + detail + "\n\n📅 Exp: " + (acc.exp || "-"), {
				parse_mode: "HTML",
				disable_web_page_preview: true,
				reply_markup: { inline_keyboard: [[{ text: "⬅ Kembali", callback_data: "my_accounts" }]] }
			});
		} catch (e) {
			logError("acc_detail", e);
			bot.sendMessage(chatId, "Terjadi kesalahan");
		}
	}

	if (query.data == "buy_vpn") {
		try {
			await bot.deleteMessage(chatId, lastMesageid[userId]);
			const sent = await bot.sendMessage(chatId, "🔰 <b>Menu VPN</b>\n\nSilahkan Pilih Opsi Di Bawah:", {
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[{ text: "💳 Buat Akun ( Premium", callback_data: "buy_vpn_buy" }],
						[{ text: "🆓 Buat Trial ( Gratis )", callback_data: "buy_vpn_trial" }],
						[{ text: " Kembali Ke Menu", callback_data: "back_main" }]
					]
				}
			});
			setlastMesage_id(userId, sent.message_id);
		} catch (e) {
			logError("buy_vpn_menu", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server. Silahkan hubungi admin");
		}
	}

	if (query.data == "buy_vpn_buy") {
		try {
			await bot.deleteMessage(chatId, lastMesageid[userId]);
			const servers = await Server.findAll();
			let keyboard = [];
			if (servers.length === 0) {
				keyboard.push([{ text: "❌ Belum ada server tersedia", callback_data: "noop" }]);
			} else {
				for (const sv of servers) {
					keyboard.push([{ text: "🖥 " + sv.name, callback_data: "sv_" + sv.id }]);
				}
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "buy_vpn" }]);
			const sent = await bot.sendMessage(chatId, "📡 <b>Pilih Server:</b>", {
				parse_mode: "HTML",
				reply_markup: { inline_keyboard: keyboard }
			});
			setlastMesage_id(userId, sent.message_id);
		} catch (e) {
			logError("buy_vpn_menu", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server. Silahkan hubungi admin");
		}
	}

	if (query.data == "buy_vpn_trial") {
		try {
			await bot.deleteMessage(chatId, lastMesageid[userId]);
			const servers = await Server.findAll();
			let keyboard = [];
			if (servers.length === 0) {
				keyboard.push([{ text: "❌ Belum ada server tersedia", callback_data: "noop" }]);
			} else {
				for (const sv of servers) {
					keyboard.push([{ text: "🖥 " + sv.name, callback_data: "svTrial_" + sv.id }]);
				}
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "buy_vpn" }]);
			const sent = await bot.sendMessage(chatId, "🆓 <b>Trial — Pilih Server:</b>\n\nGratis 60 menit, tanpa ribet!", {
				parse_mode: "HTML",
				reply_markup: { inline_keyboard: keyboard }
			});
			setlastMesage_id(userId, sent.message_id);
		} catch (e) {
			logError("buy_vpn_menu", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server. Silahkan hubungi admin");
		}
	}

	if (query.data.startsWith("sv_")) {
		try {
			const serverId = query.data.replace("sv_", "");
			const server = await Server.findByPk(serverId);
			if (!server) {
				return bot.answerCallbackQuery(query.id, { text: "Server tidak ditemukan" });
			}
			let keyboard = [];
			for (let i = 0; i < PROTOCOL_LIST.length; i += 2) {
				const row = [{ text: PROTOCOL_LIST[i].label, callback_data: "proto_" + serverId + "_" + PROTOCOL_LIST[i].key }];
				if (PROTOCOL_LIST[i + 1]) {
					row.push({ text: PROTOCOL_LIST[i + 1].label, callback_data: "proto_" + serverId + "_" + PROTOCOL_LIST[i + 1].key });
				}
				keyboard.push(row);
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "buy_vpn_buy" }]);
			await bot.editMessageText("🖥 <b>" + server.name + "</b>\n\nPilih protokol:", {
				chat_id: chatId,
				message_id: lastMesageid[userId],
				parse_mode: "HTML",
				reply_markup: { inline_keyboard: keyboard }
			});
		} catch (e) {
			logError("sv_select", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("proto_")) {
		try {
			const parts = query.data.replace("proto_", "").split("_");
			const serverId = parts[0];
			const protocol = parts.slice(1).join("_");
			const prices = await Price.findAll({ order: [["days", "ASC"]] });
			let keyboard = [];
			for (const p of prices) {
				keyboard.push([{
					text: p.label + " - " + formatRupiah(p.price),
					callback_data: "dur_" + serverId + "_" + protocol + "_" + p.days + "_" + p.price
				}]);
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "sv_" + serverId }]);
			await bot.editMessageText("⏱ Pilih durasi:", {
				chat_id: chatId,
				message_id: lastMesageid[userId],
				reply_markup: { inline_keyboard: keyboard }
			});
		} catch (e) {
			logError("proto_select", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("svTrial_")) {
		try {
			const serverId = query.data.replace("svTrial_", "");
			const server = await Server.findByPk(serverId);
			if (!server) {
				return bot.answerCallbackQuery(query.id, { text: "Server tidak ditemukan" });
			}
			let keyboard = [];
			for (let i = 0; i < PROTOCOL_LIST.length; i += 2) {
				const row = [{ text: PROTOCOL_LIST[i].label, callback_data: "protoTrial_" + serverId + "_" + PROTOCOL_LIST[i].key }];
				if (PROTOCOL_LIST[i + 1]) {
					row.push({ text: PROTOCOL_LIST[i + 1].label, callback_data: "protoTrial_" + serverId + "_" + PROTOCOL_LIST[i + 1].key });
				}
				keyboard.push(row);
			}
			keyboard.push([{ text: "⬅ Kembali", callback_data: "buy_vpn_trial" }]);
			await bot.editMessageText("🖥 <b>" + server.name + "</b>\n\nPilih protokol trial:", {
				chat_id: chatId,
				message_id: lastMesageid[userId],
				parse_mode: "HTML",
				reply_markup: { inline_keyboard: keyboard }
			});
		} catch (e) {
			logError("sv_trial", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("protoTrial_")) {
		try {
			const parts = query.data.replace("protoTrial_", "").split("_");
			const serverId = parts[0];
			const protocol = parts.slice(1).join("_");
			const server = await Server.findByPk(serverId);
			if (!server) {
				return bot.sendMessage(chatId, "Server tidak ditemukan");
			}

			const TrialLog = require("../model/TrialLog.js");
			const { Op } = require("sequelize");
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const trialCount = await TrialLog.count({
				where: {
					userId: String(userId),
					protocol,
					createdAt: { [Op.gte]: today }
				}
			});
			if (trialCount >= 3) {
				return bot.sendMessage(chatId, "❌ Kamu sudah mencapai batas trial " + protocol.toUpperCase() + " hari ini (3/3). Coba besok lagi!");
			}

			await bot.editMessageText("⏳ Membuat trial " + protocol.toUpperCase() + "...", {
				chat_id: chatId,
				message_id: lastMesageid[userId]
			});

			const apiRes = await axios.post(
				`http://${server.host}:${server.port}/api/${protocol}/trial`,
				{ minutes: 60 },
				{ timeout: 20000 }
			);

			await TrialLog.create({ userId: String(userId), protocol });

			const raw = apiRes?.data?.text || apiRes?.data?.html || apiRes?.data?.message || "Trial berhasil dibuat";
			const message = raw.replace(/\\n/g, "\n");
			await bot.sendMessage(chatId, "🆓 <b>Trial " + protocol.toUpperCase() + "</b>\n\n" + message, {
				parse_mode: "HTML",
				disable_web_page_preview: true
			});
		} catch (e) {
			logError("trial_create", e);
			bot.sendMessage(chatId, "❌ Gagal membuat trial: " + (e.response?.data?.error || e.message));
		}
	}

	if (query.data.startsWith("dur_")) {
		try {
			const parts = query.data.replace("dur_", "").split("_");
			const serverId = parts[0];
			const protocol = parts.slice(1, -2).join("_");
			const days = parseInt(parts[parts.length - 2]);
			const price = parseInt(parts[parts.length - 1]);

			const server = await Server.findByPk(serverId);
			if (!server) {
				return bot.sendMessage(chatId, "Server tidak ditemukan");
			}

			await bot.deleteMessage(chatId, lastMesageid[userId]);

			setUserStep(userId, {
				step: "input_username",
				data: { serverId, serverName: server.name, serverHost: server.host, serverPort: server.port, protocol, days, price }
			});

			await bot.sendMessage(chatId, "✏️ <b>Masukkan username yang diinginkan:</b>\n\nMinimal 2 karakter, huruf/angka saja.", {
				parse_mode: "HTML"
			});
		} catch (e) {
			logError("dur_handler", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server. Silakan hubungi admin");
		}
	}


		if (query.data.startsWith("svTool_")) {
		try {
			const serverId = query.data.replace("svTool_", "");
			await showToolCategories(bot, chatId, userId, lastMesageid, serverId);
		} catch (e) {
			logError("sv_tool", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("toolCat_")) {
		try {
			const parts = query.data.replace("toolCat_", "").split("_");
			const serverId = parts[0];
			const category = parts.slice(1).join("_");
			await showToolActions(bot, chatId, userId, lastMesageid, serverId, category);
		} catch (e) {
			logError("tool_cat", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("toolXray_")) {
		try {
			const parts = query.data.replace("toolXray_", "").split("_");
			const serverId = parts[0];
			const protocol = parts.slice(1).join("_");
			await showToolXrayActions(bot, chatId, userId, lastMesageid, serverId, protocol);
		} catch (e) {
			logError("tool_xray", e);
			bot.sendMessage(chatId, "Terjadi kesalahan server");
		}
	}

	if (query.data.startsWith("toolConfirm_")) {
		try {
			const parts = query.data.replace("toolConfirm_", "").split("_");
			const serverId = parts[0];
			const action = parts.slice(1).join("_");
			const server = await Server.findByPk(serverId);
			if (!server) return bot.sendMessage(chatId, "Server tidak ditemukan");

			const apiPathMap = {
				reboot: "/api/server/reboot",
				restart: "/api/server/restart",
				cleanExpired: "/api/system/expired",
				clearCache: "/api/system/clear-cache",
				backup: "/api/system/backup"
			};
			const path = apiPathMap[action];
			if (!path) return bot.sendMessage(chatId, "Aksi tidak dikenal");

			await bot.editMessageText("⏳ Memproses " + action + " di " + server.name + "...", {
				chat_id: chatId,
				message_id: lastMesageid[userId]
			});

			const result = await callServerApi(serverId, "POST", path);
			const msg = result?.message || JSON.stringify(result);
			await bot.sendMessage(chatId, "✅ " + msg);
		} catch (e) {
			logError("tool_confirm", e);
			bot.sendMessage(chatId, "❌ Gagal: " + (e.response?.data?.error || e.message));
		}
	}

	if (query.data.startsWith("toolInput_")) {
		try {
			const parts = query.data.replace("toolInput_", "").split("_");
			const serverId = parts[0];
			const action = parts.slice(1).join("_");

			const actionLabels = {
				lock: "🔒 Masukkan username yang akan di-LOCK:",
				unlock: "🔓 Masukkan username yang akan di-UNLOCK:",
				renew_ssh: "📅 Masukkan username SSH yang akan diperpanjang:",
				delete_ssh: "❌ Masukkan username SSH yang akan dihapus:",
				renew: "📅 Masukkan username yang akan diperpanjang:",
				delete: "❌ Masukkan username yang akan dihapus:",
				quota: "📦 Masukkan username untuk set quota:",
				iplimit: "🔢 Masukkan username untuk set IP limit:",
				domain: "🌐 Masukkan domain baru:",
				autoReboot: "⏰ Masukkan jam auto-reboot (0-23):"
			};

			const label = actionLabels[action] || "✏️ Masukkan input:";
			await bot.editMessageText(label, {
				chat_id: chatId,
				message_id: lastMesageid[userId]
			});
			setUserStep(userId, { step: "toolInput", data: { serverId, action } });
		} catch (e) {
			logError("tool_input", e);
			bot.sendMessage(chatId, "Terjadi kesalahan");
		}
	}

	if (query.data.startsWith("tool_")) {
		try {
			const parts = query.data.replace("tool_", "").split("_");
			const serverId = parts[0];
			const action = parts.slice(1).join("_");

			const server = await Server.findByPk(serverId);
			if (!server) return bot.sendMessage(chatId, "Server tidak ditemukan");

			await bot.editMessageText("⏳ Memproses...", {
				chat_id: chatId,
				message_id: lastMesageid[userId]
			});

			let method = "GET";
			let path = "";
			let data = null;

			if (action === "serverInfo") path = "/api/server/info";
			else if (action === "serverStatus") path = "/api/server/status";
			else if (action === "speedtest") path = "/api/server/speedtest";
			else if (action === "listSsh") path = "/api/ssh";
			else if (action === "sshActive") path = "/api/ssh/active";
			else if (action === "monitorIps") path = "/api/monitor/ips";
			else if (action === "monitorQuota") path = "/api/monitor/quota";
			else if (action.startsWith("listXray_")) {
				const proto = action.replace("listXray_", "");
				path = "/api/" + proto;
			} else {
				return bot.sendMessage(chatId, "Aksi tidak dikenal");
			}

			const result = await callServerApi(serverId, method, path, data);
			let output = "";
			if (result?.text) {
				output = result.text;
			} else if (result?.users) {
				const userList = result.users.map(u => "👤 " + u.username + " | Exp: " + (u.exp || "-") + " | Status: " + (u.status || "active")).join("\n");
				output = "👥 Total: " + (result.total || result.users.length) + "\n\n" + userList;
			} else if (result?.services) {
				output = Object.entries(result.services).map(([k, v]) => "• " + k + ": " + v).join("\n");
			} else if (result?.active) {
				output = result.active.map(a => "👤 " + a.username + " | IP: " + a.ip + " | Via: " + (a.via || "-")).join("\n");
			} else if (result?.result) {
				output = result.result;
			} else if (result?.message) {
				output = result.message;
			} else if (result?.ssh || result?.vmess) {
				output = JSON.stringify(result, null, 2);
			} else {
				output = JSON.stringify(result, null, 2);
			}

			const maxLen = 3800;
			if (output.length > maxLen) output = output.substring(0, maxLen) + "\n\n... (truncated)";

			await bot.sendMessage(chatId, "<b>" + action + "</b>\n\n" + output, {
				parse_mode: "HTML",
				disable_web_page_preview: true
			});
		} catch (e) {
			logError("tool_action", e);
			const errMsg = e.response?.data?.error || e.message;
			bot.sendMessage(chatId, "❌ Gagal: " + errMsg);
		}
	}

		if (query.data == "buyPrem30") {
			try {
			    const users = await user.findOne({ where: userId });
				if (!users.premium) {
				await bot.deleteMessage(chatId, messageId);
				const res = await axios.get(
					"https://api.adijayavpn.cloud/api/deposit",
					{
						params: {
							amount: 5000,
							apikey: payApi
						}
					}
				);
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
						logError("premium_polling", err);
					}
				}
				await bot.deleteMessage(userId, sent.message_id);
				bot.sendMessage(
					userId,
					"Timeout: Pembayaran tidak diterima dalam 8 menit"
				);
				return;
			    }
			    const sent = await bot.sendMessage(
					chatId,
					"Anda sudah menjadi premium"
				);
				setlastMesage_id(userId, sent.message_id);
			} catch (err) {
				logError("premium_deposit", err);
				bot.sendMessage(
					chatId,
					"Terjadi kesalahan server, Silakan hubunggi admin"
				);
			}
		}

		if (query.data == "ssh") {
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
				logError("old_ssh_create", err);
				clearUserStep(userId);
			}
		} else if (query.data == "v2ray") {
			const exp = await getDate(userstep[userId].data.exp);
			try {
				await createAcount(userstep[userId].data.data, "v2ray", exp);
				bot.editMessageText("Berhasil Menambahkan akun", {
					chat_id: chatId,
					message_id: messageId
				});
				clearUserStep(userId);
			} catch (err) {
				logError("old_v2ray_create", err);
				bot.editMessageText("terjadi kesalahan server", {
					chat_id: chatId,
					message_id: messageId
				});
				clearUserStep(userId);
			}
		}
	});
};

module.exports.proceedToCreate = proceedToCreate;
