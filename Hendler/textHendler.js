const createUser = require("../module/createUser.js");
const { isOwner } = require("../module/validasi.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { countUsers, countUsersThisMonth } = require("../module/Statistik.js");
const {
	clearUserStep,
	getlastMesage_id,
	setlastMesage_id
} = require("../module/Session.js");
const akun = require("../model/Account.js");
const User = require("../model/User.js");
const checkJoin = require("../module/checkJoin.js");

async function addPremiumDays(user, days = 30) {
  const now = new Date();

  let baseDate =
    user.premium && user.premium_exp && user.premium_exp > now
      ? user.premium_exp
      : now;

  user.premium = true;
  user.premium_exp = new Date(
    baseDate.getTime() + days * 24 * 60 * 60 * 1000
  );

  await user.save();
}

async function checkReferralReward(user) {
  const total = user.referral_count;
  const rewarded = user.referral_rewarded;

  // hitung kelipatan 5 terbaru
  const milestone = Math.floor(total / 5) * 5;

  if (milestone > rewarded && milestone >= 5) {
    await addPremiumDays(user, 30);
    user.referral_rewarded = milestone;
    await user.save();

    return milestone;
  }

  return null;
}

module.exports = bot => {
	bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const refId = match[1]; // ✅ aman
  const lastMesage_id = getlastMesage_id();
  const name = msg.from.first_name || "undefined";

  const joined = await checkJoin(bot, userId);

  const username = msg.from.username
    ? `@${msg.from.username}`
    : "Anda belum membuat username";

  // ===== WAJIB JOIN CHANNEL (SEBELUM REFERRAL) =====

  // ===== CREATE USER =====
  let user = await User.findByPk(userId);

  if (!user) {
    user = await User.create({
      user_id: userId,
      username
    });

    // ===== PROSES REFERRAL (ANTI DOUBEL) =====
    if (refId && refId !== String(userId)) {
      const refUser = await User.findByPk(refId);

      if (refUser && !user.referrer_id) {
        user.referrer_id = refId;
        await user.save();

        await refUser.increment("referral_count");

        const updatedRef = await User.findByPk(refId);
        const milestone = await checkReferralReward(updatedRef);

        bot.sendMessage(
          refId,
          milestone
            ? `🎉 Referral kamu mencapai ${milestone}!\nPremium bertambah +30 hari 🎁`
            : `👥 Referral bertambah!\nTotal: ${updatedRef.referral_count}`
        );
      }
    }
  }

  // ===== HAPUS PESAN LAMA =====
  try {
    if (lastMesage_id[userId]) {
      await bot.deleteMessage(chatId, lastMesage_id[userId]);
    }
  } catch {}
	if (!joined) {
    const groupLink = process.env.GROUP_LINK || "https://t.me/galangStar";
    return bot.sendMessage(
      userId,
      `⚠️ Kamu harus join group dulu untuk menggunakan bot ini.\n\nSetelah join, kirim ulang /start`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔗 Join Group",
                url: groupLink
              }
            ]
          ]
        }
      }
    );
  }
  const status = user.premium ? "Premium" : "Free";
  clearUserStep(userId);

  const quote = await axios.get(
    "https://quotes.liupurnomo.com/api/quotes/random"
  );

  const sent = await bot.sendMessage(
    chatId,
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
					],
					[
						{
							text: "Manage Server",
							callback_data: "owner_manageServer"
						},
						{
							text: "Manage Prices",
							callback_data: "owner_managePrices"
						}
					],
					[
						{
							text: "🛠 Server Tools",
							callback_data: "owner_serverTools"
						}
					],
					[
						{
							text: "📢 Fake Notif",
							callback_data: "owner_fakeNotif"
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

 bot.onText(/\/addprem (\d+) (\d+)/, async (msg, match) => {
		const targetId = match[1]
		const userId = msg.from.id;
		const day = Number(match[2])
		const chatId = msg.chat.id;
		if (!isOwner(userId)) {
			bot.sendMessage(chatId, "Anda tidak memiliki akses!");
			return;
		}
		const user = await User.findByPk(targetId);
		if (!user) return bot.sendMessage(chatId, "user tidak di temukan");
		addPremiumDays(user, day)
		bot.sendMessage(chatId, `Berhasil add premium ${userId}`);
		bot.sendMessage(targetId, `Selamat Anda telah menjadi premium selama ${day} day`);
	});
	
	bot.onText(/\/getdata/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "Anda tidak memiliki akses!");
  }
  
  /*const user = await User.findOne({
  where: { user_id: "6992387770" }
});

if (!user) {
  console.log("User tidak ditemukan");
} else {
  await user.destroy();
  console.log("User berhasil dihapus");
}
*/

  try {
    // ambil data dari DB
    const data = await User.findAll({ raw: true });

    // path file sementara
    const fileName = `data_user_${Date.now()}.json`;
    const filePath = path.join(__dirname, fileName);

    // ubah data jadi file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // kirim file ke user
    await bot.sendDocument(chatId, filePath, {
      caption: "📂 Data user"
    });

    // hapus file setelah dikirim
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Gagal mengirim data");
  }
});
};