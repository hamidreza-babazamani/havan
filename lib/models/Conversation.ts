import mongoose, { Schema } from "mongoose";

export interface ConversationFields {
  members: mongoose.Types.ObjectId[];
  memberKey: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationFields>(
  {
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      required: true,
      validate: {
        validator: (members: mongoose.Types.ObjectId[]) =>
          members.length === 2 && members[0].toString() !== members[1].toString(),
        message: "A private conversation must have two distinct members.",
      },
    },
    memberKey: { type: String, required: true, unique: true, select: false },
    lastMessageAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "conversations" },
);

conversationSchema.index({ members: 1, lastMessageAt: -1 });

export const ConversationModel = mongoose.models.Conversation ??
  mongoose.model<ConversationFields>("Conversation", conversationSchema, "conversations");

export default ConversationModel;
