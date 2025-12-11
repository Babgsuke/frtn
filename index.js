const TelegramBot = require("node-telegram-bot-api");
const { loadStorage } = require("./module/Session.js");
require("dotenv").config();
const botOntext = require("./Hendler/textHendler.js");
const botOnMessage = require("./Hendler/messageHendler.js");
const botOnQuery = require("./Hendler/queryHendler.js");
const cron = require("node-cron");
const deleteExpiredData = require("./module/deleteAccountExp.js");
const db = require("./config/db.js");
const path = require('path');
const dbPath = path.join(__dirname, 'db.sqlite');
db.sync();

const token = process.env.api;
const bot = new TelegramBot(token, { polling: true });

cron.schedule(
	"35 23 * * *",
	async () => {
	  try {
	    deleteExpiredData();
		await bot.sendDocument(process.env.OWNER, dbPath, {

        caption: '📦 Backup otomatis database (db.sqlite)',

      });
	  } catch (err) {
	    console.error('Error:', err);
	     console.log(err)
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
