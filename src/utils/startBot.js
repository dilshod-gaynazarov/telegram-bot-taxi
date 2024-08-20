const startBot = (bot, botConfig = {}) => {
  bot
    .launch(botConfig)
    .then(() => logger.info(`Bot @${bot.botInfo.username} started!`))
}

module.exports = startBot
