// broadcast.js
const User = require("../model/User.js");

let state = {};

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
// ==============================
// QUEUE BROADCAST
// ==============================
async function sendQueue(bot, users, sendFunc) {
	for (let i = 0; i < users.length; i++) {
		const u = users[i];

		try {
			await sendFunc(u.user_id);

			// anti flood normal
			await delay(500);

		} catch (err) {
			// rate limit Telegram
			if (err.response?.statusCode === 429) {
				const retryAfter =
					err.response.body?.parameters?.retry_after || 1;

				console.log(`Kena rate limit, tunggu ${retryAfter}s`);

				// tunggu sesuai retry_after
				await delay((retryAfter + 0.5) * 1000);

				// ulangi user yang sama
				i--;
			} else {
				console.error(
					"Gagal kirim ke",
					u.user_id,
					err.message
				);
			}
		}
	}
}

// ==============================
// START BROADCAST MODE
// ==============================
function start(bot, adminId) {
	state[adminId] = {
		step: "waiting_message",
		type: null,
		fileId: null,
		caption: null,
		text: null
	};

	bot.sendMessage(
		adminId,
		"📣 Silakan kirim pesan (text / photo / video / document / voice / sticker)."
	);
}

// ==============================
// HANDLE MESSAGE
// ==============================
async function handleMessage(bot, msg) {
	const adminId = msg.chat.id;
	const s = state[adminId];
	if (!s) return false; // tidak sedang broadcast mode

	// =============== STEP 1: ADMIN KIRIM PESAN ===============
	if (s.step === "waiting_message") {
		if (msg.text) {
			s.type = "text";
			s.text = msg.text;
			s.step = "confirm_send";
			return bot.sendMessage(
				adminId,
				"Kirim broadcast? ketik /yes atau /cancel"
			);
		}

		// Handle media
		// =============== HANDLE MEDIA ===============
		if (
			msg.photo ||
			msg.video ||
			msg.document ||
			msg.audio ||
			msg.voice ||
			msg.sticker
		) {
			let mediaType = null;
			let fileId = null;

			if (msg.photo) {
				mediaType = "photo";
				fileId = msg.photo[msg.photo.length - 1].file_id; // TANPA pop
			} else if (msg.video) {
				mediaType = "video";
				fileId = msg.video.file_id;
			} else if (msg.document) {
				mediaType = "document";
				fileId = msg.document.file_id;
			} else if (msg.audio) {
				mediaType = "audio";
				fileId = msg.audio.file_id;
			} else if (msg.voice) {
				mediaType = "voice";
				fileId = msg.voice.file_id;
			} else if (msg.sticker) {
				mediaType = "sticker";
				fileId = msg.sticker.file_id;
			}

			s.type = "media";
			s.mediaType = mediaType;
			s.fileId = fileId;

			s.step = "ask_caption";
			return bot.sendMessage(
				adminId,
				"Tambahkan caption? (ketik caption atau /skip)"
			);
		}

		return bot.sendMessage(adminId, "❌ Format tidak dikenali.");
	}

	// =============== STEP 2: ADMIN KIRIM CAPTION ===============
	if (s.step === "ask_caption") {
		s.caption = msg.text === "/skip" ? "" : msg.text;

		s.step = "confirm_send";
		return bot.sendMessage(
			adminId,
			"Kirim broadcast? ketik /yes atau /cancel"
		);
	}

	// =============== STEP 3: KONFIRMASI ===============
	if (s.step === "confirm_send") {
		if (msg.text === "/cancel") {
			delete state[adminId];
			return bot.sendMessage(adminId, "❌ Broadcast dibatalkan.");
		}

		if (msg.text === "/yes") {
			await sendBroadcast(bot, adminId);
			delete state[adminId];
			return;
		}

		return bot.sendMessage(
			adminId,
			"Ketik /yes untuk kirim atau /cancel untuk membatalkan."
		);
	}

	return true;
}

// ==============================
// EXECUTE BROADCAST
// ==============================
async function sendBroadcast(bot, adminId) {
    const s = state[adminId];
    const users = await User.findAll({ attributes: ["user_id"] });

    await bot.sendMessage(adminId, "📢 Mengirim broadcast...");

    if (s.type === "text") {
        await sendQueue(bot, users, async id => 
            bot.sendMessage(id, s.text, { parse_mode: "HTML" })
        );
    }

    if (s.type === "media") {
        await sendQueue(bot, users, async id => {
            switch (s.mediaType) {
                case "photo":
                    return bot.sendPhoto(id, s.fileId, { caption: s.caption, parse_mode: "HTML" });

                case "video":
                    return bot.sendVideo(id, s.fileId, { caption: s.caption, parse_mode: "HTML" });

                case "document":
                    return bot.sendDocument(id, s.fileId, { caption: s.caption, parse_mode: "HTML" });

                case "audio":
                    return bot.sendAudio(id, s.fileId, { caption: s.caption, parse_mode: "HTML" });

                case "voice":
                    return bot.sendVoice(id, s.fileId, { caption: s.caption, parse_mode: "HTML" });

                case "sticker":
                    return bot.sendSticker(id, s.fileId);

                default:
                    console.log("❌ mediaType tidak dikenali:", s.mediaType);
            }
        });
    }

    await bot.sendMessage(adminId, "✅ Broadcast selesai!");
}

// ==============================
// API module
// ==============================
module.exports = {
	start, // dipanggil: broadcast.start(bot, adminId)
	handleMessage // dipanggil saat pesan admin masuk
};
