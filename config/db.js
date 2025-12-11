const { Sequelize } = require("sequelize");

const db = new Sequelize({
	dialect: "sqlite",
	storage: "./db.sqlite",
	logging: false
});

(async () => {
	try {
		await db.authenticate();
		console.log("✅ Koneksi ke  Db berhasil!");
	} catch (error) {
		console.error("❌ Gagal konek ke SDb", error);
	}
})();

module.exports = db;
