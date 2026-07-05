const TelegramBot = require("node-telegram-bot-api");
const { loadStorage } = require("./module/Session.js");
require("dotenv").config();
const botOntext = require("./Hendler/textHendler.js");
const botOnMessage = require("./Hendler/messageHendler.js");
const botOnQuery = require("./Hendler/queryHendler.js");
const cron = require("node-cron");
const deleteExpiredData = require("./module/deleteAccountExp.js");
const path = require("path");
const dbPath = path.join(__dirname, "db.sqlite");const db = require("./config/db");
require("./model/User"); // penting agar model terload
require("./model/Server");
const Price = require("./model/Price");
const checkPremium = require("./module/deletePrrmiumExp.js");

async function seedDefaultPrices() {
  const count = await Price.count();
  if (count === 0) {
    await Price.bulkCreate([
      { days: 1, price: 5000, label: "1 Hari" },
      { days: 7, price: 15000, label: "7 Hari" },
      { days: 30, price: 50000, label: "30 Hari" },
      { days: 90, price: 120000, label: "90 Hari" }
    ]);
    console.log("Default prices seeded!");
  }
}

db.sync({ alter: true })
  .then(async () => {
    console.log("Database synced!");
    await seedDefaultPrices();
  })
  .catch(err => console.log("Sync error:", err));


const token = process.env.api;
const bot = new TelegramBot(token, { polling: true });

setInterval(() => {
    checkPremium();
}, 30000);
cron.schedule(
	"35 23 * * *",
	async () => {
		try {
			deleteExpiredData();
			await bot.sendDocument(process.env.OWNER, dbPath, {
				caption: "📦 Backup otomatis database (db.sqlite)"
			});
		} catch (err) {
			console.error("Error:", err);
			console.log(err);
		}
	},
	{
		timezone: "Asia/Jakarta"
	}
);
loadStorage();
botOntext(bot);
botOnMessage(bot);
botOnQuery(bot);
