import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppMessageText {
  @ApiProperty()
  body: string;
}

export class WhatsAppMessage {
  @ApiProperty()
  from: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ type: WhatsAppMessageText, required: false })
  text?: WhatsAppMessageText;
}

export class WhatsAppContact {
  @ApiProperty()
  wa_id: string;

  @ApiProperty()
  profile: {
    name: string;
  };
}

export class WhatsAppMetadata {
  @ApiProperty()
  display_phone_number: string;

  @ApiProperty()
  phone_number_id: string;
}

export class WhatsAppValue {
  @ApiProperty()
  messaging_product: string;

  @ApiProperty({ type: WhatsAppMetadata })
  metadata: WhatsAppMetadata;

  @ApiProperty({ type: [WhatsAppContact], required: false })
  contacts?: WhatsAppContact[];

  @ApiProperty({ type: [WhatsAppMessage], required: false })
  messages?: WhatsAppMessage[];
}

export class WhatsAppChange {
  @ApiProperty()
  field: string;

  @ApiProperty({ type: WhatsAppValue })
  value: WhatsAppValue;
}

export class WhatsAppEntry {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [WhatsAppChange] })
  changes: WhatsAppChange[];
}

export class WebhookPayload {
  @ApiProperty()
  object: string;

  @ApiProperty({ type: [WhatsAppEntry] })
  entry: WhatsAppEntry[];
}

export interface ParsedIntent {
  type: 'greeting' | 'route_query' | 'stop_query' | 'trip_plan' | 'unrelated' | 'ambiguous';
  routeQuery?: string;
  stopQuery?: string;
  fromStop?: string;
  toStop?: string;
  clarificationNeeded?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
