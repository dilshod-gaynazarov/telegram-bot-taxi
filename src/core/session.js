const { session: memorySession } = require("telegraf")

const session = memorySession()

module.exports = session
