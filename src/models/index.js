const EmailCode = require("./EmailCode");
const User = require("./User");

// Relación de 1 a 1
EmailCode.belongsTo(User) //userId
User.hasOne(EmailCode)