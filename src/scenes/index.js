const { Scenes } = require("telegraf")

const stage = new Scenes.Stage([
  require("./start"),
  require("./login"),
  require("./password"),
])

module.exports = stage
