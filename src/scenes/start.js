const { Scenes, Markup } = require("telegraf")
const User = require("../db/User")
const Channel = require("../db/Channel")

const scene = new Scenes.BaseScene("start")

scene.enter(async (ctx) => {
  try {
    const { id: userId, username, first_name, last_name } = ctx.from

    let user = await User.findOne({ userId })
    if (!user) {
      user = new User({ userId, username, first_name, last_name })
      await user.save()
    }

    if (user.login === false) {
      return await ctx.scene.enter("login")
    }


    const channels = await Channel.find({ userId })

    let keyboard = []
    for (const channel of channels) {
      let isAdmin1 = false
      let isAdmin2 = false

      try {
        const admins = await ctx.telegram.getChatAdministrators(channel.groupId)
        isAdmin1 = admins.some((admin) => admin.user.id === ctx.botInfo.id)
        const member2 = await ctx.telegram.getChatMember(
          channel.forwardId,
          ctx.botInfo.id
        )
        isAdmin2 = member2.status !== "left"
      } catch (error) {}

      keyboard.push([
        Markup.button.callback(
          channel.groupName.substring(0, 10) + `...${isAdmin1 ? "🟢" : "🔴"}`,
          "123"
        ),
        Markup.button.callback(
          channel.forwardId
            ? channel.forwardName.substring(0, 10) + `...${isAdmin2 ? "🟢" : "🔴"}`
            : "Bo'sh",
          "1234"
        ),
        Markup.button.callback("🗑 O'chirish", `delete_${channel._id}`),
      ])
    }

    keyboard.push([
      Markup.button.url(
        "➕ Qo'shish",
        `https://telegram.me/${process.env.BOT_USERNAME}?startgroup=true`
      ),
    ])

    ctx.reply(
      "Kanallar ro'yxati: \nEslatma: \n🟢 - admin\n🔴 - admin emas",
      Markup.inlineKeyboard(keyboard).resize()
    )
  } catch (error) {
    console.error(error)
  }
})

// O'chrish
scene.action(/delete_(.+)/, async (ctx) => {
  try {
    const channelId = ctx.match[1] // Kanal ID'sini olish
    await Channel.findByIdAndDelete(channelId)
    ctx.answerCbQuery("Kanal o'chirildi!")

    // Userga qayta yangilangan ro'yxatni yuborish
    const { id: userId } = ctx.from
    const channels = await Channel.find({ userId })

    let keyboard = []
    for (const channel of channels) {
      let isAdmin1 = false
      let isAdmin2 = false

      try {
        const admins = await ctx.telegram.getChatAdministrators(channel.groupId)
        isAdmin1 = admins.some((admin) => admin.user.id === ctx.botInfo.id)

        const member2 = await ctx.telegram.getChatMember(
          channel.forwardId,
          ctx.botInfo.id
        )
        isAdmin2 = member2.status !== "left"
      } catch (error) {}

      keyboard.push([
        Markup.button.callback(
          channel.groupName?.substring(0, 10) + `...${isAdmin1 ? "🟢" : "🔴"}`,
          "123"
        ),
        Markup.button.callback(
          channel.forwardId
            ? channel.forwardName?.substring(0, 10) +
                `...${isAdmin2 ? "🟢" : "🔴"}`
            : "Bo'sh",
          "1234"
        ),
        Markup.button.callback("🗑 O'chirish", `delete_${channel._id}`),
      ])
    }

    keyboard.push([
      Markup.button.url(
        "➕ Qo'shish",
        `https://telegram.me/${process.env.BOT_USERNAME}?startgroup=true`
      ),
    ])

    await ctx.editMessageReplyMarkup({
      inline_keyboard: keyboard,
    })
  } catch (error) {
    console.error("Kanalni o'chirishda xatolik:", error)
    ctx.answerCbQuery("Kanalni o'chirishda xatolik!")
  }
})

module.exports = scene
