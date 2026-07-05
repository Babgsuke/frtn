const fs = require("fs");
const path = require("path");

const isProduction = process.env.TEST_MODE !== "true";
const logDir = path.join(__dirname, "..", "log");
const logFile = path.join(logDir, "log.txt");

if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true });
}

function logError(context, error) {
	const timestamp = new Date().toISOString();
	let msg = `[${timestamp}] [${context}] ${error.message || error}\n`;
	msg += `Stack: ${error.stack || "N/A"}\n`;
	if (error.response) {
		msg += `Status: ${error.response.status || "N/A"}\n`;
		msg += `Response: ${JSON.stringify(error.response.data, null, 2)}\n`;
	}
	msg += "-".repeat(60) + "\n";

	if (isProduction) {
		try {
			fs.appendFileSync(logFile, msg, "utf8");
		} catch (e) {
			console.error("Gagal menulis log:", e.message);
		}
	}
	console.error(msg.trim());
}

function logInfo(message) {
	const timestamp = new Date().toISOString();
	const msg = `[${timestamp}] [INFO] ${message}\n`;
	if (isProduction) {
		try {
			fs.appendFileSync(logFile, msg, "utf8");
		} catch (e) {
			console.error("Gagal menulis log:", e.message);
		}
	}
	console.log(msg.trim());
}

module.exports = { logError, logInfo };
