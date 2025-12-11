module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    user_id: {
			type: DataTypes.BIGINT,
			allowNull: false,
			primaryKey: true
		},
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    premium_exp: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  return User;
};