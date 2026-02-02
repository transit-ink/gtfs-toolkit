import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UIConfig, WhatsAppConfig } from '../config/configuration';
import { GtfsService } from '../gtfs/gtfs.service';
import { RoutesService } from '../gtfs/routes/routes.service';
import { StopsService } from '../gtfs/stops/stops.service';
import { ParsedIntent, WebhookPayload } from './dto/webhook.dto';
import { MessageCacheService } from './services/message-cache.service';
import { OpenAIService } from './services/openai.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly whatsappConfig: WhatsAppConfig;
  private readonly uiBaseUrl: string;

  constructor(
    private configService: ConfigService,
    private messageCacheService: MessageCacheService,
    private openaiService: OpenAIService,
    private routesService: RoutesService,
    private stopsService: StopsService,
    private gtfsService: GtfsService,
  ) {
    this.whatsappConfig = this.configService.get<WhatsAppConfig>('whatsapp')!;
    this.uiBaseUrl = this.configService.get<UIConfig>('ui')?.baseUrl || 'http://localhost:5173';
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') {
      this.logger.warn('Received non-WhatsApp webhook');
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const messages = change.value.messages;
        if (!messages || messages.length === 0) continue;

        for (const message of messages) {
          if (message.type === 'text' && message.text?.body) {
            await this.handleTextMessage(message.from, message.text.body);
          }
        }
      }
    }
  }

  /**
   * Handle a text message from a user
   */
  private async handleTextMessage(from: string, text: string): Promise<void> {
    this.logger.log(`Received message from ${from}: ${text}`);

    // Get conversation history
    const history = this.messageCacheService.getMessages(from);

    // Add user message to cache
    this.messageCacheService.addMessage(from, 'user', text);

    // Parse intent using OpenAI
    const intent = await this.openaiService.parseIntent(text, history);

    // Generate response based on intent
    const response = await this.generateResponse(intent);

    // Add assistant response to cache
    this.messageCacheService.addMessage(from, 'assistant', response);

    // Send response via WhatsApp
    await this.sendMessage(from, response);
  }

  /**
   * Process a test message from dashboard (no WhatsApp sending)
   * Returns the response directly instead of sending via WhatsApp
   */
  async processTestMessage(sessionId: string, text: string): Promise<string> {
    this.logger.log(`Processing test message from session ${sessionId}: ${text}`);

    // Get conversation history
    const history = this.messageCacheService.getMessages(sessionId);

    // Add user message to cache
    this.messageCacheService.addMessage(sessionId, 'user', text);

    // Parse intent using OpenAI
    const intent = await this.openaiService.parseIntent(text, history);

    // Generate response based on intent
    const response = await this.generateResponse(intent);

    // Add assistant response to cache
    this.messageCacheService.addMessage(sessionId, 'assistant', response);

    // Return response directly (don't send via WhatsApp)
    return response;
  }

  /**
   * Generate response based on parsed intent
   */
  private async generateResponse(intent: ParsedIntent): Promise<string> {
    switch (intent.type) {
      case 'greeting':
        return this.getGreetingMessage();

      case 'route_query':
        return await this.handleRouteQuery(intent.routeQuery!);

      case 'stop_query':
        return await this.handleStopQuery(intent.stopQuery!);

      case 'trip_plan':
        return await this.handleTripPlan(intent.fromStop!, intent.toStop!);

      case 'ambiguous':
        return `I need a bit more information to help you. ${intent.clarificationNeeded}`;

      case 'unrelated':
      default:
        return "Sorry, I can only help with transit-related queries like bus routes, bus stops, and trip planning. Please ask me about routes, stops, or how to get from one place to another.";
    }
  }

  /**
   * Get greeting message with capabilities
   */
  private getGreetingMessage(): string {
    return `Hello! I'm your transit assistant. Here's what I can help you with:

🚌 *Route Information*
Ask about any bus route, e.g., "Tell me about route 500" or "Bus 335G"

🚏 *Stop Information*
Ask about any bus stop, e.g., "Majestic bus stop" or "Where is Koramangala stop"

🗺️ *Trip Planning*
Plan your journey, e.g., "How to go from Majestic to Koramangala" or "From MG Road to Indiranagar"

Just type your question and I'll help you find the information!`;
  }

  /**
   * Handle route query
   */
  private async handleRouteQuery(query: string): Promise<string> {
    try {
      const results = await this.routesService.search(query);

      if (!results || results.length === 0) {
        return `I couldn't find any routes matching "${query}". Please try a different route number or name.`;
      }

      const topResults = results.slice(0, 5);
      let response = `🚌 *Routes matching "${query}"*:\n\n`;

      for (const result of topResults) {
        const route = result.route as any;
        if (route) {
          response += `*${route.route_short_name}*: ${route.route_long_name}\n`;
          response += `View details: https://${this.uiBaseUrl}/route/${route.route_id}\n\n`;
        }
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching route: ${error}`);
      return `Sorry, I encountered an error while searching for routes. Please try again.`;
    }
  }

  /**
   * Handle stop query
   */
  private async handleStopQuery(query: string): Promise<string> {
    try {
      const results = await this.stopsService.search(query);

      if (!results || results.length === 0) {
        return `I couldn't find any stops matching "${query}". Please try a different stop name.`;
      }

      const topResults = results.slice(0, 5);
      let response = `🚏 *Stops matching "${query}"*:\n\n`;

      for (const result of topResults) {
        const stop = result.stop as any;
        if (stop) {
          response += `*${stop.stop_name}*`;
          if (stop.stop_code) {
            response += ` (${stop.stop_code})`;
          }
          response += `\n`;
          response += `View details: https://${this.uiBaseUrl}/stop/${stop.stop_id}\n\n`;
        }
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching stop: ${error}`);
      return `Sorry, I encountered an error while searching for stops. Please try again.`;
    }
  }

  /**
   * Handle trip planning query
   */
  private async handleTripPlan(fromStop: string, toStop: string): Promise<string> {
    try {
      // First, search for the stops to get their IDs (with a minimum similarity threshold)
      const fromResults = await this.stopsService.search(fromStop, 0.15);
      const toResults = await this.stopsService.search(toStop, 0.15);

      if (!fromResults || fromResults.length === 0) {
        // Try without threshold to suggest alternatives
        const suggestions = await this.stopsService.search(fromStop);
        if (suggestions && suggestions.length > 0) {
          const topSuggestions = suggestions.slice(0, 3).map((s: any) => s.stop.stop_name);
          return `I couldn't find a stop matching "${fromStop}". Did you mean one of these?\n\n${topSuggestions.map((s: string) => `• ${s}`).join('\n')}\n\nPlease try again with the correct stop name.`;
        }
        return `I couldn't find a stop matching "${fromStop}". Please try a different origin stop name.`;
      }

      if (!toResults || toResults.length === 0) {
        // Try without threshold to suggest alternatives
        const suggestions = await this.stopsService.search(toStop);
        if (suggestions && suggestions.length > 0) {
          const topSuggestions = suggestions.slice(0, 3).map((s: any) => s.stop.stop_name);
          return `I couldn't find a stop matching "${toStop}". Did you mean one of these?\n\n${topSuggestions.map((s: string) => `• ${s}`).join('\n')}\n\nPlease try again with the correct stop name.`;
        }
        return `I couldn't find a stop matching "${toStop}". Please try a different destination stop name.`;
      }

      const fromStopData = fromResults[0].stop as any;
      const toStopData = toResults[0].stop as any;
      const fromScore = fromResults[0].score as number;
      const toScore = toResults[0].score as number;

      // Get trip plan
      const tripResults = await this.gtfsService.planTrip(
        fromStopData.stop_id,
        toStopData.stop_id,
      );

      if (!tripResults || tripResults.length === 0) {
        let response = `I couldn't find any routes from "${fromStopData.stop_name}" to "${toStopData.stop_name}". They might not be connected by direct or single-interchange routes.`;
        
        // If the match quality was low, suggest the user double-check
        if (fromScore < 0.4 || toScore < 0.4) {
          response += `\n\n_Note: I matched "${fromStop}" → "${fromStopData.stop_name}" and "${toStop}" → "${toStopData.stop_name}". If this isn't what you meant, please try with more specific stop names._`;
        }
        return response;
      }

      let response = `🗺️ *Trip from ${fromStopData.stop_name} to ${toStopData.stop_name}*:\n\n`;

      const directRoutes = tripResults.filter((r) => r.type === 'direct').slice(0, 3);
      const interchangeRoutes = tripResults.filter((r) => r.type === 'interchange').slice(0, 2);

      if (directRoutes.length > 0) {
        response += `*Direct Routes:*\n`;
        for (const route of directRoutes) {
          if (route.type === 'direct') {
            response += `🚌 *${route.route_short_name}* - ${route.route_long_name}\n`;
            response += `   View route: https://${this.uiBaseUrl}/route/${route.route_id}\n`;
          }
        }
        response += `\n`;
      }

      if (interchangeRoutes.length > 0) {
        response += `*Routes with Interchange:*\n`;
        for (const route of interchangeRoutes) {
          if (route.type === 'interchange') {
            response += `🚌 *${route.first_leg.route_short_name}* → `;
            response += `🔄 ${route.interchange_stop.stop_name} → `;
            response += `🚌 *${route.second_leg.route_short_name}*\n`;
          }
        }
      }

      response += `\n📍 Plan your trip: https://${this.uiBaseUrl}/plan?from=${fromStopData.stop_id}&to=${toStopData.stop_id}`;

      return response.trim();
    } catch (error) {
      this.logger.error(`Error planning trip: ${error}`);
      return `Sorry, I encountered an error while planning your trip. Please try again.`;
    }
  }

  /**
   * Send a message via WhatsApp Cloud API
   */
  private async sendMessage(to: string, message: string): Promise<void> {
    if (!this.whatsappConfig.accessToken || !this.whatsappConfig.phoneNumberId) {
      this.logger.warn('WhatsApp credentials not configured, skipping message send');
      return;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.whatsappConfig.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: true,
            body: message,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`WhatsApp API error: ${response.status} - ${errorText}`);
      } else {
        this.logger.log(`Message sent to ${to}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error}`);
    }
  }
}
