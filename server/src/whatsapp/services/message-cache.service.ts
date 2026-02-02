import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConversationMessage } from '../dto/webhook.dto';

const MAX_MESSAGES_PER_USER = 10;

@Injectable()
export class MessageCacheService {
  private readonly logger = new Logger(MessageCacheService.name);
  private cache: Map<string, ConversationMessage[]> = new Map();

  /**
   * Add a message to a user's conversation history
   */
  addMessage(userId: string, role: 'user' | 'assistant', content: string): void {
    if (!this.cache.has(userId)) {
      this.cache.set(userId, []);
    }

    const messages = this.cache.get(userId)!;
    messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep only the last MAX_MESSAGES_PER_USER messages
    if (messages.length > MAX_MESSAGES_PER_USER) {
      messages.shift();
    }
  }

  /**
   * Get conversation history for a user
   */
  getMessages(userId: string): ConversationMessage[] {
    return this.cache.get(userId) || [];
  }

  /**
   * Clear conversation history for a specific user
   */
  clearUserMessages(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cached messages
   * Runs at 23:59 IST (18:29 UTC) every day
   */
  @Cron('29 18 * * *', {
    name: 'clearMessageCache',
    timeZone: 'UTC',
  })
  clearAllMessages(): void {
    const userCount = this.cache.size;
    this.cache.clear();
    this.logger.log(`EOD IST: Cleared message cache for ${userCount} users`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { userCount: number; totalMessages: number } {
    let totalMessages = 0;
    this.cache.forEach((messages) => {
      totalMessages += messages.length;
    });
    return {
      userCount: this.cache.size,
      totalMessages,
    };
  }
}
