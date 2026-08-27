export interface AlertMessage {
  type: "budget_limit" | "large_transaction" | "connection_error";
  dedupKey: string;
  title: string;
  body: string;
}

export interface OutboundChannel {
  name: string;
  send(message: AlertMessage): Promise<boolean>;
}

export function createSilentChannel(): OutboundChannel {
  return {
    name: "none",
    async send() {
      return false;
    },
  };
}

export function createWebhookChannel(url: string): OutboundChannel {
  return {
    name: "webhook",
    async send(message) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message),
      });
      return response.ok;
    },
  };
}

export function createTelegramChannel(token: string, chatId: string): OutboundChannel {
  return {
    name: "telegram",
    async send(message) {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${message.title}\n${message.body}`,
        }),
      });
      return response.ok;
    },
  };
}
