import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeout: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
}

export interface JwtConfig {
  secret: string;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => {
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  if (isNaN(port)) {
    throw new Error('DB_PORT must be a valid number');
  }

  const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10);
  if (isNaN(maxConnections)) {
    throw new Error('DB_MAX_CONNECTIONS must be a valid number');
  }

  const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10);
  if (isNaN(idleTimeout)) {
    throw new Error('DB_IDLE_TIMEOUT must be a valid number');
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gtfs',
    ssl: process.env.DB_SSL === 'true',
    maxConnections,
    idleTimeout,
  };
});

export const appConfig = registerAs('app', (): AppConfig => {
  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }

  return {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
  };
});

export const jwtConfig = registerAs('jwt', (): JwtConfig => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be provided');
  }

  return {
    secret,
  };
});

export interface WhatsAppConfig {
  verifyToken: string;
  accessToken: string;
  phoneNumberId: string;
  dashboardAuthToken: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export interface UIConfig {
  baseUrl: string;
}

export const whatsappConfig = registerAs('whatsapp', (): WhatsAppConfig => {
  return {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    dashboardAuthToken: process.env.DASHBOARD_AUTH_TOKEN || 'dashboard-secret',
  };
});

export const openaiConfig = registerAs('openai', (): OpenAIConfig => {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  };
});

export const uiConfig = registerAs('ui', (): UIConfig => {
  return {
    baseUrl: process.env.FRONTEND_HOST || 'http://localhost:3000',
  };
});
