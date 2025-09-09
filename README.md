<h1>bskybots</h1>
<p>Create custom bots by configuration.</p>

<h2>Install package in your project</h2>

```bash
npm i bskybot
```

<h2>Example config</h2>
<h3>Action Bot</h3>

```typescript
import { 
    ActionBot, 
    CronBot, 
    KeywordBot
} from "bskybot";

const actionBot: ActionBot = {
    identifier: "[did]",
    password: "use app password!",
    username: "[handle]", // optional for logging needed
    service: "https://bsky.social", // or another
    action: async (agent: AtpAgent) => {
        // implement any logic you want here
        const text = "implement logic to return a string";
        console.info(new Date(), `Post actionbot ${actionBot.identifier}: ${text}`);
        agent.post({text});
    }
}

const actionBotAgent = useActionBotAgent(actionBot);
```

<h3>Cron Bot</h3>

```typescript
const cronBot: CronBot = {
    identifier: "[did]",
    password: "use app password!",
    username: "[handle]", // optional for logging needed
    service: "https://bsky.social", // or another
    cronJob: {
        scheduleExpression: "* * * * *", // a cron job expression
        callback: null, // implement optional logic after the cronjob
        timeZone: "Europe/Vienna"
    },
    action: async (agent: AtpAgent) => {
        // implement any logic you want here to be executed in your project
        const text = "implement logic to return a string";
        console.info(new Date(), `Post cronbot ${cronBot.identifier}: ${text}`);
        agent.post({text});
    }
}

const cronBotAgent = useCronBotAgent(cronBot);
```

<h3>Keyword Bot</h3>

```typescript
const keywordBot: KeywordBot = {
    identifier: "[did]", 
    password: "use app password!",
    username: "[handle]", // optional for logging needed
    service: "https://bsky.social", // or another
    replies: [
        {
            keyword: "keyword1", 
            exclude: ["badword1", "badword2"],
            messages: ["reply1", "reply2", "reply3"]
        },
        {
            keyword: "keyword2", 
            messages: ["reply"]
        },
    ]
}

const keywordBotAgent = useKeywordBotAgent(keywordBot);
```

## Migration Guide

### Migrating from v1.x to v2.0.0

Version 2.0.0 introduces breaking changes that require code updates when upgrading from v1.x.

#### Breaking Changes

1. **WebSocket Configuration Change**
   
   The `WebSocketClient` constructor parameter has changed from `url` to `service` and now supports multiple services for failover:

   ```typescript
   // Before (v1.x)
   import { WebSocketClient } from "bskybot";
   
   const client = new WebSocketClient({ 
     url: 'wss://example.com' 
   });
   
   // After (v2.0.0)  
   const client = new WebSocketClient({ 
     service: 'wss://example.com'  // Single service
   });
   
   // Or with multiple services for automatic failover:
   const client = new WebSocketClient({ 
     service: ['wss://primary.com', 'wss://backup.com', 'wss://fallback.com']
   });
   ```

2. **WebSocket Send Method Typing**
   
   The `send()` method now has stricter typing for better type safety:

   ```typescript
   // Before (v1.x) - accepted any data type
   client.send(anyData);
   
   // After (v2.0.0) - only accepts specific types
   client.send("string data");           // ✓ Valid
   client.send(buffer);                  // ✓ Valid (Buffer)
   client.send(arrayBuffer);             // ✓ Valid (ArrayBuffer)
   client.send(bufferArray);             // ✓ Valid (Buffer[])
   client.send({ custom: "object" });    // ✗ Invalid - will cause TypeScript error
   ```

#### New Features in v2.0.0

- **Multi-Service WebSocket Failover**: Automatically switches between services when connections fail
- **Enhanced Logging**: Structured logging with correlation IDs for better debugging
- **Health Monitoring**: Built-in health checks and metrics collection
- **Performance Optimizations**: Improved error handling and retry strategies
- **Code Quality**: Full ESLint and Prettier integration with pre-commit hooks

#### Configuration Options

The WebSocketClient now supports additional configuration options:

```typescript
const client = new WebSocketClient({
  service: ['wss://primary.com', 'wss://backup.com'],
  maxReconnectAttempts: 3,        // Attempts per service (default: 3)
  maxServiceCycles: 2,            // Complete cycles through all services (default: 2)
  reconnectInterval: 5000,        // Initial delay between attempts (default: 5000ms)
  backoffFactor: 1.5,            // Exponential backoff multiplier (default: 1.5)
  maxReconnectDelay: 30000       // Maximum delay between attempts (default: 30000ms)
});
```

All new configuration options are optional and have sensible defaults.