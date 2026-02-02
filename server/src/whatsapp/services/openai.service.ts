import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OpenAIConfig } from '../../config/configuration';
import { ConversationMessage, ParsedIntent } from '../dto/webhook.dto';

const SYSTEM_PROMPT = `You are a helpful transit assistant bot specifically built for BMTC (Bangalore Metropolitan Transport Corporation) bus services in Bangalore, India. Your job is to help users find information about BMTC bus routes, bus stops across Bangalore, and plan trips within the city.

You can help with:
1. BMTC bus route information - When users ask about a specific route number or name (e.g., 500, 335E, Vajra services)
2. Bus stop information - When users ask about bus stops in Bangalore (e.g., Majestic, Koramangala, Indiranagar, Whitefield)
3. Trip planning - When users want to travel from one place to another within Bangalore

Analyze the user's message and respond with a JSON object in one of these formats:

For greetings (hi, hello, hey, etc.):
{"type": "greeting"}

For route queries (e.g., "route 500", "bus 42", "what is route 500"):
{"type": "route_query", "routeQuery": "<the route number or name>"}

For stop queries (e.g., "majestic bus stop", "where is koramangala stop"):
{"type": "stop_query", "stopQuery": "<the stop name>"}

For trip planning (e.g., "from majestic to koramangala", "how to reach indiranagar from mgroad"):
{"type": "trip_plan", "fromStop": "<origin stop name>", "toStop": "<destination stop name>"}

For ambiguous queries that need clarification:
{"type": "ambiguous", "clarificationNeeded": "<what you need to know>"}

For completely unrelated queries (weather, jokes, general knowledge, etc.):
{"type": "unrelated"}

Important:
- Only respond with the JSON object, no other text
- Be flexible in understanding user queries - they might not use exact words
- If a query seems related to transit but is unclear, ask for clarification
- Extract stop names and route numbers even if they're mentioned informally
- Remember this is specifically for Bangalore/BMTC - queries about other cities or transit systems should be marked as unrelated`;

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI;
  private model: string;

  constructor(private configService: ConfigService) {
    const config = this.configService.get<OpenAIConfig>('openai');
    if (config?.apiKey) {
      this.client = new OpenAI({ apiKey: config.apiKey });
      this.model = config.model || 'gpt-4o-mini';
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  async parseIntent(
    userMessage: string,
    conversationHistory: ConversationMessage[],
  ): Promise<ParsedIntent> {
    if (!this.client) {
      this.logger.error('OpenAI client not initialized');
      return { type: 'unrelated' };
    }

    try {
      // Build messages array with conversation history for context
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Add recent conversation history for context
      for (const msg of conversationHistory.slice(-6)) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add the current user message
      messages.push({ role: 'user', content: userMessage });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('No content in OpenAI response');
        return { type: 'unrelated' };
      }

      const parsed = JSON.parse(content) as ParsedIntent;
      this.logger.debug(`Parsed intent: ${JSON.stringify(parsed)}`);
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse intent: ${error}`);
      return { type: 'unrelated' };
    }
  }
}
