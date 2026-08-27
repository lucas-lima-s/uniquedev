import { env } from "../env.js";
import {
  createSilentChannel,
  createTelegramChannel,
  createWebhookChannel,
  type OutboundChannel,
} from "./channel.js";

export function createOutboundChannel(): OutboundChannel {
  if (env.ALERT_CHANNEL === "webhook" && env.ALERT_WEBHOOK_URL) {
    return createWebhookChannel(env.ALERT_WEBHOOK_URL);
  }
  if (env.ALERT_CHANNEL === "telegram" && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    return createTelegramChannel(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
  }
  return createSilentChannel();
}
