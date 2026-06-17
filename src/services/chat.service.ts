// =============================================================================
// InteriorOS Backend — Chat Service
// =============================================================================

import { connectDB } from '@/lib/db';
import { Message } from '@/models';
import { getRedisClient } from '@/lib/redis';
import { AppError } from './auth.service';

export async function getChatHistory(projectId: string, limit = 50) {
  await connectDB();

  const messages = await Message.find({ projectId, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'firstName lastName avatar email')
    .lean();

  return messages.reverse(); // Return in chronological order
}

export async function sendMessage(projectId: string, senderId: string, content: string) {
  await connectDB();

  if (!content || !content.trim()) {
    throw new AppError('Message content cannot be empty', 400);
  }

  // Create message
  const message = await Message.create({
    projectId,
    senderId,
    content: content.trim(),
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'firstName lastName avatar email')
    .lean();

  // Broadcast via Redis Pub/Sub
  const redis = await getRedisClient();
  if (redis) {
    const channel = `project_chat:${projectId}`;
    await redis.publish(channel, JSON.stringify(populatedMessage));
  }

  return populatedMessage;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  await connectDB();

  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Initialize reactions array if missing
  if (!message.reactions) {
    message.reactions = [];
  }

  const existingReactionIndex = message.reactions.findIndex((r: any) => r.emoji === emoji);

  if (existingReactionIndex > -1) {
    const userIndex = message.reactions[existingReactionIndex].users.findIndex((u: any) => u.toString() === userId);
    
    if (userIndex > -1) {
      // User already reacted with this emoji -> remove reaction
      message.reactions[existingReactionIndex].users.splice(userIndex, 1);
      
      // If no users left for this emoji, remove the emoji entirely
      if (message.reactions[existingReactionIndex].users.length === 0) {
        message.reactions.splice(existingReactionIndex, 1);
      }
    } else {
      // Emoji exists but not for this user -> add user
      message.reactions[existingReactionIndex].users.push(userId as any);
    }
  } else {
    // Emoji doesn't exist -> add new reaction object
    message.reactions.push({ emoji, users: [userId as any] });
  }

  await message.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'firstName lastName avatar email')
    .lean();

  // Broadcast via Redis Pub/Sub so all clients update their state
  const redis = await getRedisClient();
  if (redis) {
    const channel = `project_chat:${message.projectId}`;
    await redis.publish(channel, JSON.stringify(populatedMessage));
  }

  return populatedMessage;
}
