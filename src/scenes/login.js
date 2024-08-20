const { Scenes, Markup } = require("telegraf")

require("dotenv").config()

const scene = new Scenes.BaseScene("login")

scene.enter(async (ctx) => {
  try {
    ctx.reply("Loginni kiriting")
  } catch (error) {
    console.error(error)
  }
})

scene.on("text", async (ctx) => {
  try {
    if (ctx.message.text === process.env.LOGIN) {
      ctx.scene.enter("password")
    } else {
      ctx.reply("Loginni kiriting")
    }
  } catch (error) {
    console.error(error)
  }
})

module.exports = scene
