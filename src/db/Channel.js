const mongoose = require("mongoose")

const ChannelSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    groupName: {
      type: String,
    },
    forwardId: {
      type: String,
      default: null,
    },
    forwardName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const Channel = mongoose.model("Channels", ChannelSchema)

module.exports = Channel
