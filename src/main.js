require("dotenv").config()

const bot = require("./core/bot")
const session = require("./core/session")
const stage = require("./scenes")
const startBot = require("./utils/startBot")
const mongoose = require("mongoose")
const Channel = require("./db/Channel")

const { Markup } = require("telegraf")

bot.use(session)
bot.use(stage.middleware())

// MongoDB'ni ulash
mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB ga muvaffaqiyatli ulandi"))
    .catch((error) => console.error("MongoDB ga ulanishda xatolik:", error))

bot.start(async (ctx) => {
    if (ctx.chat.type === "private" && ctx.from.id == process.env.ADMIN_ID) {
        ctx.scene.enter("start")
    }
})

bot.on("my_chat_member", async (ctx) => {
    try {
        const newStatus = ctx.myChatMember.new_chat_member.status
        const oldStatus = ctx.myChatMember.old_chat_member.status

        if (
            oldStatus === "left" &&
            (newStatus === "member" || newStatus === "administrator")
        ) {
            const chatId = ctx.chat.id
            const userWhoAdded = ctx.myChatMember.from

            // Kanal haqida ma'lumotlarni olish
            const chat = await ctx.telegram.getChat(chatId)

            let channel = await Channel.findOne({
                userId: process.env.ADMIN_ID,
                forwardId: null,
            })
            if (channel && !channel.forwardId) {
                channel.forwardId = chatId
                channel.forwardName = chat.title
                await channel.save()

                const message = `${channel.groupName} ➡️ ${chat.title}  Gruppalar muvofaqqiyatli bog'landi`

                await bot.telegram.sendMessage(process.env.ADMIN_ID, message, {
                    parse_mode: "Markdown",
                })

                const channels = await Channel.find({
                    userId: process.env.ADMIN_ID,
                })

                let keyboard = []
                for (const channel of channels) {
                    let isAdmin1 = false
                    let isAdmin2 = false

                    try {
                        const admins = await ctx.telegram.getChatAdministrators(
                            channel.groupId
                        )
                        isAdmin1 = admins.some(
                            (admin) => admin.user.id === ctx.botInfo.id
                        )

                        const member2 = await ctx.telegram.getChatMember(
                            channel.forwardId,
                            ctx.botInfo.id
                        )
                        isAdmin2 = member2.status !== "left"
                    } catch (error) {
                        console.error("Error checking admin status:", error)
                    }

                    keyboard.push([
                        {
                            text:
                                channel.groupName.substring(0, 10) +
                                `...${isAdmin1 ? "🟢" : "🔴"}`,
                            callback_data: "123",
                        },
                        {
                            text: channel.forwardId
                                ? channel.forwardName.substring(0, 10) +
                                `...${isAdmin2 ? "🟢" : "🔴"}`
                                : "Bo'sh",
                            callback_data: "1234",
                        },
                        {
                            text: "🗑 O'chirish",
                            callback_data: `delete_${channel._id}`,
                        },
                    ])
                }

                keyboard.push([
                    {
                        text: "➕ Qo'shish",
                        url: `https://telegram.me/${process.env.BOT_USERNAME}?startgroup=true`,
                    },
                ])

                await bot.telegram.sendMessage(
                    process.env.ADMIN_ID,
                    "Kanallar ro'yxati: \nEslatma: \n🟢 - admin\n🔴 - admin emas",
                    {
                        reply_markup: {
                            inline_keyboard: keyboard,
                        },
                    }
                )
            } else if (!channel) {
                channel = new Channel({
                    userId: process.env.ADMIN_ID,
                    groupId: chatId,
                    groupName: chat.title,
                })
                await channel.save()

                const message = `${chat.title} qo'shildi. Quyidagi gruppalardan birini tanlang yoki yangi gruppa qo'shing`

                const channels = await Channel.find({
                    userId: process.env.ADMIN_ID,
                    forwardId: { $ne: null },
                })

                const keyboard = {
                    inline_keyboard: [
                        ...channels.map((channel) => [
                            {
                                text:
                                    channel.forwardName ||
                                    `Kanal ${channel.forwardId}`,
                                callback_data: `channel_${channel.forwardId}`,
                            },
                        ]),
                        [
                            {
                                text: "➕ Yangi gruppa qo'shish",
                                url: `https://t.me/${process.env.BOT_USERNAME}?startgroup=true`,
                            },
                        ],
                    ],
                }

                await bot.telegram.sendMessage(process.env.ADMIN_ID, message, {
                    parse_mode: "Markdown",
                    reply_markup: keyboard,
                })
            }
        }
    } catch (error) {
        console.error("Kanal haqida ma'lumotlarni olishda xatolik:", error)
    }
})

bot.action(/channel_(.+)/, async (ctx) => {
    try {
        const userId = ctx.from.id
        const newForwardId = ctx.match[1]

        const forwardChannel = await Channel.findOne({
            forwardId: newForwardId,
        })

        let channels = await Channel.find({ userId, forwardId: null })

        for (const channel of channels) {
            channel.forwardId = forwardChannel.forwardId
            channel.forwardName = forwardChannel.forwardName
            await channel.save()
        }

        await ctx.deleteMessage(ctx.update.callback_query.message.message_id)

        const message = `${channels[0].groupName} ➡️ ${forwardChannel.forwardName}  Gruppalar muvofaqqiyatli bog'landi`
        await ctx.reply(message)

        channels = await Channel.find({ userId })

        let keyboard = []
        for (const channel of channels) {
            let isAdmin1 = false
            let isAdmin2 = false

            try {
                const admins = await ctx.telegram.getChatAdministrators(
                    channel.groupId
                )
                isAdmin1 = admins.some(
                    (admin) => admin.user.id === ctx.botInfo.id
                )
                const member2 = await ctx.telegram.getChatMember(
                    channel.forwardId,
                    ctx.botInfo.id
                )
                isAdmin2 = member2.status !== "left"
            } catch (error) { }

            keyboard.push([
                Markup.button.callback(
                    channel.groupName.substring(0, 10) +
                    `...${isAdmin1 ? "🟢" : "🔴"}`,
                    "123"
                ),
                Markup.button.callback(
                    channel.forwardId
                        ? channel.forwardName.substring(0, 10) +
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

        ctx.reply(
            "Kanallar ro'yxati: \nEslatma: \n🟢 - admin\n🔴 - admin emas",
            Markup.inlineKeyboard(keyboard).resize()
        )
    } catch (error) {
        console.log(error)
    }
})

bot.on("message", async (ctx) => {
    try {
        const chatId = ctx.chat.id
        const messageId = ctx.message.message_id
        const channel = await Channel.findOne({ groupId: chatId })
        if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
            const admins = await ctx.telegram.getChatAdministrators(chatId)
            const isAdmin = admins.some(
                (admin) => admin.user.id === ctx.from.id
            )
            if (!isAdmin) {
                const user = ctx.from.last_name ? `${ctx.from.first_name} ${ctx.from.last_name}` : ctx.from.first_name;
                const message = `<b>Guruh:</b> ${ctx.chat.title}\n\n<b>Mijoz:</b> <a href="tg://user?id=${ctx.from.id}">${user}</a>\n\n<b>Xabar:</b> ${ctx.text}`;
                await ctx.telegram.sendMessage(
                    channel.forwardId,
                    message,
                    {
                        parse_mode: 'HTML', reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Buyurtmachi', url: `tg://user?id=${ctx.from.id}` },
                                ]
                            ]
                        }
                    },
                );
                await ctx.deleteMessage(messageId);
                const message_for_after_delete = `Hurmatli mijoz buyurtmangiz qabul qilindi 😊`;
                await bot.telegram.sendMessage(chatId, message_for_after_delete, { parse_mode: 'Markdown' });
            }
        }
    } catch (error) {
        console.error(
            "Xabarni o'chirish va yangi xabarni yuborishda xatolik:",
            error
        )
    }
})

startBot(bot)
