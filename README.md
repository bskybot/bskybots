# bskybot

Create custom Bluesky bots through simple configuration. This TypeScript library provides a robust foundation for building bots that can respond to keywords, run on schedules, or execute custom actions on the Bluesky social network.

## Features

- **Multiple Bot Types**: ActionBot, CronBot, and KeywordBot for different use cases
- **WebSocket Integration**: Real-time Bluesky firehose connection with automatic failover
- **Structured Logging**: Correlation IDs and timing for better debugging
- **Health Monitoring**: Built-in health checks and metrics collection  
- **TypeScript Support**: Full type safety and IntelliSense support
- **Error Handling**: Robust retry strategies and graceful failure handling

## Installation

```bash
npm install bskybot
```

```bash
yarn add bskybot
```

```bash
pnpm add bskybot
```

## Quick Start

```typescript
import { KeywordBot, useKeywordBotAgent } from "bskybot";

const myBot: KeywordBot = {
  identifier: "your-bot.bsky.social",
  password: "your-app-password", // Generate at https://bsky.app/settings/app-passwords
  service: "https://bsky.social",
  replies: [{
    keyword: "hello bot",
    messages: ["Hello there!", "Hi! How can I help?"]
  }]
};

const agent = await useKeywordBotAgent(myBot);
```

## Bot Types

### ActionBot

Execute custom logic in response to posts or other triggers.

```typescript
import { ActionBot, ActionBotAgent, useActionBotAgent, Post } from "bskybot";

const actionBot: ActionBot = {
  identifier: "my-action-bot.bsky.social",
  password: "your-app-password",
  username: "My Action Bot", // Optional, used for logging
  service: "https://bsky.social",
  action: async (agent: ActionBotAgent, post: Post) => {
    // Custom logic here
    if (post.text.includes("weather")) {
      const weatherData = await getWeatherData();
      await agent.post({ text: `Current weather: ${weatherData}` });
      
      // Log with correlation ID and timing
      agent.logAction("info", "Posted weather update", { 
        postUri: post.uri,
        weather: weatherData 
      });
    }
  }
};

const agent = await useActionBotAgent(actionBot);
await agent?.doAction(); // Execute the action
```

### CronBot

Run scheduled tasks using cron expressions.

```typescript
import { CronBot, CronBotAgent, useCronBotAgent } from "bskybot";

const cronBot: CronBot = {
  identifier: "my-cron-bot.bsky.social", 
  password: "your-app-password",
  username: "Daily Bot",
  service: "https://bsky.social",
  cronJob: {
    scheduleExpression: "0 9 * * *", // Daily at 9 AM
    callback: null, // Optional callback after execution
    timeZone: "America/New_York"
  },
  action: async (agent: CronBotAgent) => {
    const dailyTip = await getDailyTip();
    await agent.post({ text: `Daily tip: ${dailyTip}` });
    
    agent.logAction("info", "Posted daily tip", { tip: dailyTip });
  }
};

const agent = await useCronBotAgent(cronBot);
// Cron job starts automatically
```

### KeywordBot

Respond to posts containing specific keywords.

```typescript
import { KeywordBot, useKeywordBotAgent } from "bskybot";

const keywordBot: KeywordBot = {
  identifier: "my-keyword-bot.bsky.social",
  password: "your-app-password", 
  username: "Helper Bot",
  service: "https://bsky.social",
  replies: [
    {
      keyword: "help",
      exclude: ["helpless", "unhelpful"], // Don't respond to these
      messages: [
        "I'm here to help!",
        "What do you need assistance with?",
        "How can I help you today?"
      ]
    },
    {
      keyword: "documentation",
      messages: ["Check out our docs at https://example.com/docs"]
    }
  ]
};

const agent = await useKeywordBotAgent(keywordBot);
```

## WebSocket Integration

Connect to the Bluesky firehose for real-time post processing:

```typescript
import { 
  WebSocketClient, 
  jetstreamSubscription,
  KeywordBot,
  useKeywordBotAgent 
} from "bskybot";

// Single service
const client = new WebSocketClient({
  service: "wss://jetstream2.us-east.bsky.network/subscribe"
});

// Multiple services with automatic failover
const client = new WebSocketClient({
  service: [
    "wss://jetstream2.us-east.bsky.network/subscribe",
    "wss://jetstream1.us-west.bsky.network/subscribe",
    "wss://jetstream2.us-west.bsky.network/subscribe"
  ],
  maxReconnectAttempts: 3,
  reconnectInterval: 5000
});

const keywordBot: KeywordBot = { /* configuration */ };
const agent = await useKeywordBotAgent(keywordBot);

if (agent) {
  jetstreamSubscription(client, [agent]);
}
```

## Advanced Configuration

### WebSocket Options

```typescript
const client = new WebSocketClient({
  service: ["wss://primary.com", "wss://backup.com"],
  maxReconnectAttempts: 3,        // Attempts per service
  maxServiceCycles: 2,            // Complete cycles through all services  
  reconnectInterval: 5000,        // Initial delay between attempts (ms)
  backoffFactor: 1.5,            // Exponential backoff multiplier
  maxReconnectDelay: 30000       // Maximum delay between attempts (ms)
});
```

### Logging Configuration

```typescript
import { Logger } from "bskybot";

// Configure global log level
Logger.setLevel("info"); // "debug" | "info" | "warn" | "error"

// In bot actions, use agent.logAction for correlation tracking
agent.logAction("info", "Operation completed", { 
  customField: "value",
  metrics: { processingTime: "150ms" }
});
```

### Health Monitoring

```typescript
import { HealthChecker } from "bskybot";

const healthChecker = new HealthChecker({
  checks: {
    database: () => checkDatabaseConnection(),
    webSocket: () => client.isConnected(),
    memory: () => process.memoryUsage().heapUsed < 512 * 1024 * 1024
  },
  timeout: 5000
});

const status = await healthChecker.getStatus();
console.log("Health Status:", status.status); // "healthy" | "unhealthy"
console.log("Individual Checks:", status.checks);
```

## Exported Classes and Functions

### Core Classes

- **`BotAgent`** - Abstract base class for all bot agents with common functionality
- **`ActionBotAgent`** - Extends `BotAgent` for action-based bots  
- **`CronBotAgent`** - Extends `BotAgent` for scheduled bots
- **`KeywordBotAgent`** - Extends `BotAgent` for keyword-responding bots

### Initialization Functions

- **`useActionBotAgent(actionBot: ActionBot): Promise<ActionBotAgent | null>`**
- **`useCronBotAgent(cronBot: CronBot): Promise<CronBotAgent | null>`**  
- **`useKeywordBotAgent(keywordBot: KeywordBot): Promise<KeywordBotAgent | null>`**
- **`initializeBotAgent<T>(botType: string, bot: Bot, createAgent: Function): Promise<T | null>`** - Generic initialization helper

### Utility Classes

- **`WebSocketClient`** - WebSocket connection with failover support
- **`Logger`** - Structured logging with correlation IDs
- **`HealthChecker`** - Health monitoring and metrics collection

### Utility Functions

- **`jetstreamSubscription(client: WebSocketClient, agents: BotAgent[]): void`** - Connect bots to Bluesky firehose
- **`buildReplyToPost(root: UriCid, parent: UriCid, message: string)`** - Helper for creating post replies
- **`filterBotReplies(text: string, replies: BotReply[]): BotReply[]`** - Filter applicable bot replies

### Type Definitions

```typescript
// Bot configuration types
interface Bot {
  identifier: string;
  password: string;
  username?: string;
  service: string;
}

interface ActionBot extends Bot {
  action: (agent: ActionBotAgent, params?: unknown) => Promise<void>;
}

interface CronBot extends Bot {
  cronJob: {
    scheduleExpression: string;
    callback?: (() => void) | null;
    timeZone: string;
  };
  action: (agent: CronBotAgent) => Promise<void>;
}

interface KeywordBot extends Bot {
  replies: BotReply[];
}

interface BotReply {
  keyword: string;
  exclude?: string[];
  messages: string[];
}

// Post and message types
interface Post {
  uri: string;
  cid: string;
  rootUri: string;
  rootCid: string;
  text: string;
  authorDid: string;
  createdAt: string;
}

interface UriCid {
  uri: string;
  cid: string;
}
```

## Migration Guide

### Migrating from v1.x to v2.x

Version 2.x introduces architectural improvements and some breaking changes:

#### Breaking Changes

1. **Bot Agent Architecture**
   
   All bot agents now extend `BotAgent` base class instead of `AtpAgent` directly:

   ```typescript
   // Before (v1.x)
   import { ActionBotAgent } from "bskybot";
   // ActionBotAgent extended AtpAgent directly
   
   // After (v2.x) 
   import { ActionBotAgent, BotAgent } from "bskybot";
   // ActionBotAgent extends BotAgent (which extends AtpAgent)
   // New logAction() method available on all agents
   ```

2. **Logging Method Changes**
   
   Replace manual logging with the new `logAction()` method for correlation tracking:

   ```typescript
   // Before (v1.x)
   import { Logger } from "bskybot";
   
   action: async (agent, post) => {
     await agent.post({ text: "Response" });
     Logger.info("Posted response", { postUri: post.uri }); 
   }
   
   // After (v2.x)
   action: async (agent, post) => {
     await agent.post({ text: "Response" });
     agent.logAction("info", "Posted response", { postUri: post.uri });
   }
   ```

3. **Generic Initialization**
   
   Bot initialization now uses a generic helper function internally, but the public API remains the same:

   ```typescript
   // Before (v1.x) - direct instantiation and login
   const agent = new KeywordBotAgent({ service: bot.service }, bot);
   await agent.login({ identifier: bot.identifier, password: bot.password });
   
   // After (v2.x) - uses generic helper (no change needed in your code)
   const agent = await useKeywordBotAgent(bot); // Same API, improved internals
   ```

4. **WebSocket Configuration** (from v2.0.0)
   
   The `WebSocketClient` constructor parameter changed from `url` to `service`:

   ```typescript
   // Before (v1.x)
   const client = new WebSocketClient({ url: 'wss://example.com' });
   
   // After (v2.x)
   const client = new WebSocketClient({ service: 'wss://example.com' });
   // Or with failover:
   const client = new WebSocketClient({ 
     service: ['wss://primary.com', 'wss://backup.com'] 
   });
   ```

#### New Features in v2.x

- **Base BotAgent Class**: Common functionality for all bot types
- **Correlation Tracking**: All operations tracked with correlation IDs
- **Generic Initialization**: Consistent initialization pattern across bot types
- **Enhanced Error Handling**: Better error context and logging
- **Performance Improvements**: Reduced code duplication and optimized operations

#### Migration Steps

1. Update your package dependency:
   ```bash
   npm install bskybot@^2.1.0
   ```

2. Replace manual `Logger` calls with `agent.logAction()`:
   ```typescript
   // Replace this pattern:
   Logger.info("Message", context);
   
   // With this:
   agent.logAction("info", "Message", context);
   ```

3. Import the new `BotAgent` base class if you need to extend it:
   ```typescript
   import { BotAgent } from "bskybot";
   ```

4. Update WebSocket configuration if not done in v2.0.0:
   ```typescript
   // Change 'url' to 'service'
   const client = new WebSocketClient({ service: wsUrl });
   ```

All other APIs remain unchanged. The migration is primarily about taking advantage of improved logging and error handling capabilities.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/bskybot/bskybots/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bskybot/bskybots/discussions)
- **Documentation**: This README and inline TypeScript documentation