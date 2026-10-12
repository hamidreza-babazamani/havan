import mongoose, { Schema } from "mongoose";

export const MAX_MESSAGE_LENGTH = 2000;

export interface MessageFields {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  pinnedAt: Date | null;
  pinnedBy: mongoose.Types.ObjectId | null;
  pinVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageFields>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: MAX_MESSAGE_LENGTH },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    pinVersion: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "messages" },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, pinnedAt: -1 });

export const MessageModel = mongoose.models.Message ??
  mongoose.model<MessageFields>("Message", messageSchema, "messages");

export default MessageModel;
