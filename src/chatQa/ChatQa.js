// Questions and answers the admin writes for the website chat (Dashboard → Chatbot Training).
// The chat looks them up as facts at once, and the model training (llm-training/) uses them.
const mongoose = require("mongoose");

const chatQaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

// A question visitors asked that the chat had no good fact for (logged by the website's
// chat route). Same question again = count goes up. No names, emails or phone numbers kept.
const chatMissedSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // normalised text, for counting repeats
    text: { type: String, required: true, maxlength: 300 },
    count: { type: Number, default: 1 },
    lastAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["open", "answered", "dismissed"], default: "open", index: true },
  },
  { timestamps: true }
);

module.exports = {
  ChatQa: mongoose.models.ChatQa || mongoose.model("ChatQa", chatQaSchema),
  ChatMissed: mongoose.models.ChatMissed || mongoose.model("ChatMissed", chatMissedSchema),
};
