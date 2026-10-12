import mongoose from "mongoose";
import { ApiError } from "../api-error";
import { connectToDatabase } from "../mongodb";
import { ConversationModel } from "../models/Conversation";
import { MAX_MESSAGE_LENGTH, MessageModel, type MessageFields } from "../models/Message";
import { UserModel } from "../models/User";

const CONVERSATION_LIST_LIMIT = 50;
const MESSAGE_HISTORY_LIMIT = 50;

function invalidConversation() {
  return new ApiError(400, "INVALID_CONVERSATION", "Invalid conversation details.");
}

function conversationNotFound() {
  return new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
}

export async function createOrGetConversation(currentUserId: string, participantId: unknown) {
  if (typeof participantId !== "string") throw invalidConversation();

  const input = participantId.trim();
  if (!input) throw invalidConversation();

  const explicitUsername = input.startsWith("@");
  const username = (explicitUsername ? input.slice(1) : input).trim().toLowerCase();
  const validUsername = /^[a-z0-9_]{3,30}$/.test(username);
  const validObjectId = !explicitUsername && mongoose.isValidObjectId(input);
  if (!validUsername && !validObjectId) throw invalidConversation();

  await connectToDatabase();

  const [idMatch, usernameMatch] = await Promise.all([
    validObjectId
      ? UserModel.findById(input).select("_id")
      : Promise.resolve(null),
    validUsername
      ? UserModel.findOne({ username }).select("_id")
      : Promise.resolve(null),
  ]);

  if (idMatch && usernameMatch && !idMatch._id.equals(usernameMatch._id)) {
    throw invalidConversation();
  }

  const participant = explicitUsername ? usernameMatch : idMatch ?? usernameMatch;
  if (!participant) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");

  const normalizedParticipantId = new mongoose.Types.ObjectId(participant._id).toString();
  if (normalizedParticipantId === currentUserId) {
    throw new ApiError(400, "SELF_CONVERSATION", "You cannot start a private chat with yourself.");
  }

  const memberIds = [currentUserId, normalizedParticipantId].sort();
  const memberKey = memberIds.join(":");
  try {
    const conversation = await ConversationModel.findOneAndUpdate(
      { memberKey },
      {
        $setOnInsert: {
          members: memberIds,
          memberKey,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select("_id members lastMessageAt updatedAt");
    return { id: conversation._id.toString(), lastMessageAt: conversation.lastMessageAt };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      const existing = await ConversationModel.findOne({ memberKey }).select("_id lastMessageAt");
      if (existing) return { id: existing._id.toString(), lastMessageAt: existing.lastMessageAt };
    }
    throw error;
  }
}

export async function listConversations(currentUserId: string) {
  await connectToDatabase();
  const conversations = await ConversationModel.find({ members: currentUserId })
    .sort({ lastMessageAt: -1 })
    .limit(CONVERSATION_LIST_LIMIT)
    .select("_id members lastMessageAt");
  if (conversations.length === 0) return [];

  const otherMemberIds = conversations
    .map((conversation) => conversation.members.find((id: mongoose.Types.ObjectId) => id.toString() !== currentUserId))
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
  const conversationIds = conversations.map(({ _id }) => _id);
  const [users, latestMessages] = await Promise.all([
    UserModel.find({ _id: { $in: otherMemberIds } }).select("_id username displayName"),
    MessageModel.aggregate([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$conversationId", message: { $first: "$$ROOT" } } },
    ]),
  ]);

  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const messagesByConversation = new Map(
    latestMessages.map((result) => [result._id.toString(), result.message]),
  );

  return conversations.flatMap((conversation) => {
    const otherId = conversation.members.find((id: mongoose.Types.ObjectId) => id.toString() !== currentUserId);
    const participant = otherId ? usersById.get(otherId.toString()) : undefined;
    if (!participant) return [];

    const lastMessage = messagesByConversation.get(conversation._id.toString());
    return [{
      id: conversation._id.toString(),
      participant: {
        id: participant._id.toString(),
        username: participant.username,
        displayName: participant.displayName,
      },
      lastMessage: lastMessage ? {
        id: lastMessage._id.toString(),
        senderId: lastMessage.senderId.toString(),
        content: lastMessage.content,
        createdAt: lastMessage.createdAt,
      } : null,
      lastMessageAt: conversation.lastMessageAt,
    }];
  });
}

function messageResponse(message: MessageFields & { _id: mongoose.Types.ObjectId }) {
  return {
    id: message._id.toString(),
    senderId: message.senderId.toString(),
    content: message.content,
    createdAt: message.createdAt,
    pinnedAt: message.pinnedAt?.toISOString() ?? null,
    pinnedBy: message.pinnedBy?.toString() ?? null,
    pinVersion: message.pinVersion ?? 0,
  };
}

export async function getConversationMessages(currentUserId: string, conversationId: string) {
  if (!mongoose.isValidObjectId(conversationId)) throw conversationNotFound();
  await connectToDatabase();
  const conversation = await ConversationModel.findOne({ _id: conversationId, members: currentUserId })
    .select("_id");
  if (!conversation) throw conversationNotFound();

  const [messages, pinnedMessages] = await Promise.all([
    MessageModel.find({ conversationId: conversation._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MESSAGE_HISTORY_LIMIT)
      .select("_id senderId content createdAt pinnedAt pinnedBy pinVersion"),
    MessageModel.find({ conversationId: conversation._id, pinnedAt: { $type: "date" } })
      .sort({ pinnedAt: -1, _id: -1 })
      .select("_id senderId content createdAt pinnedAt pinnedBy pinVersion"),
  ]);
  return {
    messages: messages.reverse().map((message) => messageResponse(message)),
    pinnedMessages: pinnedMessages.map((message) => messageResponse(message)),
  };
}

export async function getMessageHistory(currentUserId: string, conversationId: string) {
  return (await getConversationMessages(currentUserId, conversationId)).messages;
}

export async function sendMessage(currentUserId: string, conversationId: string, body: unknown) {
  if (!mongoose.isValidObjectId(conversationId)) throw conversationNotFound();
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw invalidMessage();
  const content = (body as Record<string, unknown>).content;
  if (typeof content !== "string" || !content.trim() || content.trim().length > MAX_MESSAGE_LENGTH) {
    throw invalidMessage();
  }

  await connectToDatabase();
  const conversation = await ConversationModel.findOne({ _id: conversationId, members: currentUserId })
    .select("_id");
  if (!conversation) throw conversationNotFound();

  const message = await MessageModel.create({
    conversationId: conversation._id,
    senderId: new mongoose.Types.ObjectId(currentUserId),
    content: content.trim(),
  });
  await ConversationModel.updateOne(
    { _id: conversation._id, members: currentUserId },
    { $set: { lastMessageAt: message.createdAt } },
  );

  return {
    id: message._id.toString(),
    senderId: currentUserId,
    content: message.content,
    createdAt: message.createdAt,
    pinnedAt: null,
    pinnedBy: null,
    pinVersion: 0,
  };
}

export async function deleteMessage(currentUserId: string, conversationId: string, messageId: string) {
  if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(messageId)) {
    throw conversationNotFound();
  }
  await connectToDatabase();
  const conversation = await ConversationModel.findOne({ _id: conversationId, members: currentUserId })
    .select("_id createdAt lastMessageAt");
  if (!conversation) throw conversationNotFound();

  const message = await MessageModel.findOneAndDelete({
    _id: messageId,
    conversationId: conversation._id,
    senderId: currentUserId,
  }).select("_id createdAt");
  if (!message) throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found.");

  if (conversation.lastMessageAt.getTime() === message.createdAt.getTime()) {
    const latest = await MessageModel.findOne({ conversationId: conversation._id })
      .sort({ createdAt: -1, _id: -1 })
      .select("createdAt");
    await ConversationModel.updateOne(
      { _id: conversation._id, members: currentUserId, lastMessageAt: message.createdAt },
      { $set: { lastMessageAt: latest?.createdAt ?? conversation.createdAt } },
    );
  }

  return { id: message._id.toString() };
}

export async function setMessagePinned(
  currentUserId: string,
  conversationId: string,
  messageId: string,
  pinned: boolean,
) {
  if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(messageId)) {
    throw conversationNotFound();
  }
  await connectToDatabase();
  const conversation = await ConversationModel.findOne({ _id: conversationId, members: currentUserId })
    .select("_id");
  if (!conversation) throw conversationNotFound();

  const now = new Date();
  const updated = await MessageModel.findOneAndUpdate(
    {
      _id: messageId,
      conversationId: conversation._id,
      pinnedAt: pinned ? null : { $type: "date" },
    },
    pinned
      ? { $set: { pinnedAt: now, pinnedBy: new mongoose.Types.ObjectId(currentUserId) }, $inc: { pinVersion: 1 } }
      : { $set: { pinnedAt: null, pinnedBy: null }, $inc: { pinVersion: 1 } },
    { new: true },
  ).select("_id senderId content createdAt pinnedAt pinnedBy pinVersion");

  const message = updated ?? await MessageModel.findOne({ _id: messageId, conversationId: conversation._id })
    .select("_id senderId content createdAt pinnedAt pinnedBy pinVersion");
  if (!message) throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found.");

  return { message: messageResponse(message), changed: Boolean(updated) };
}

function invalidMessage() {
  return new ApiError(400, "INVALID_MESSAGE", "Message content must be between 1 and 2000 characters.");
}
