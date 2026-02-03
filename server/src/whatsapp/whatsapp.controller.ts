import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { WhatsAppConfig } from '../config/configuration';
import { WebhookPayload } from './dto/webhook.dto';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly whatsappConfig: WhatsAppConfig;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private configService: ConfigService,
  ) {
    this.whatsappConfig = this.configService.get<WhatsAppConfig>('whatsapp')!;
  }

  /**
   * Webhook verification endpoint for WhatsApp Cloud API
   * This is called by WhatsApp when setting up the webhook
   */
  @Get('webhook')
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiQuery({ name: 'hub.mode', required: true, description: 'Webhook mode' })
  @ApiQuery({ name: 'hub.verify_token', required: true, description: 'Verification token' })
  @ApiQuery({ name: 'hub.challenge', required: true, description: 'Challenge string' })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Verification failed' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: FastifyReply,
  ): void {
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (mode === 'subscribe' && token === this.whatsappConfig.verifyToken) {
      this.logger.log('Webhook verified successfully');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      this.logger.warn('Webhook verification failed: token mismatch');
      res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }
  }

  /**
   * Webhook handler endpoint for incoming WhatsApp messages
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle WhatsApp webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() payload: WebhookPayload): Promise<{ status: string }> {
    this.logger.log('Received webhook payload');
    this.logger.debug(JSON.stringify(payload, null, 2));

    // Process webhook asynchronously to respond quickly
    this.whatsappService.processWebhook(payload).catch((error) => {
      this.logger.error(`Error processing webhook: ${error}`);
    });

    return { status: 'ok' };
  }

  /**
   * Health check endpoint for the WhatsApp service
   */
  @Get('health')
  @ApiOperation({ summary: 'WhatsApp service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck(): { status: string; configured: boolean } {
    const configured = !!(
      this.whatsappConfig.verifyToken &&
      this.whatsappConfig.accessToken &&
      this.whatsappConfig.phoneNumberId
    );

    return {
      status: 'ok',
      configured,
    };
  }

  /**
   * Test chat endpoint for dashboard emulation
   * Uses X-Dashboard-Auth header to distinguish from real WhatsApp requests
   */
  @Post('test-messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test chat endpoint for dashboard' })
  @ApiResponse({ status: 200, description: 'Chat response returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid auth header' })
  async testChat(
    @Body() body: { message: string; sessionId?: string },
    @Headers('x-dashboard-auth') dashboardAuth: string,
  ): Promise<{ response: string; sessionId: string }> {
    // Verify dashboard auth header
    const expectedToken = this.whatsappConfig.dashboardAuthToken || 'dashboard-secret';
    if (!dashboardAuth || dashboardAuth !== expectedToken) {
      this.logger.warn('Unauthorized test-chat request: invalid or missing X-Dashboard-Auth header');
      throw new UnauthorizedException('Invalid or missing X-Dashboard-Auth header');
    }

    const sessionId = body.sessionId || `dashboard-${Date.now()}`;
    this.logger.log(`Dashboard test-chat from session ${sessionId}: ${body.message}`);

    // Process message and get response without sending to WhatsApp
    const response = await this.whatsappService.processTestMessage(sessionId, body.message);

    return {
      response,
      sessionId,
    };
  }
}
