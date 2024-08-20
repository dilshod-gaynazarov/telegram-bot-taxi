const { Scenes, Markup } = require("telegraf")
const User = require("../db/User")

require("dotenv").config()

const scene = new Scenes.BaseScene("password")

scene.enter(async (ctx) => {
  try {
    ctx.reply("Passwordni kiriting")
  } catch (error) {
    console.error(error)
  }
})

scene.on("text", async (ctx) => {
  try {
    if (ctx.message.text === process.env.PASSWORD) {
        await User.updateOne({ userId: ctx.from.id }, { login: true })

      ctx.scene.enter("start")
    } else {
      ctx.reply("Passwordni kiriting")
    }
  } catch (error) {
    console.error(error)
  }
})

module.exports = scene
