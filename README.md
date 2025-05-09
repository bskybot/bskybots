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
    KexwordBot
} from "bskybot";

const actionBot: ActionBot = {
    identifier: "[did]",
    password: "use app password!",
    username: "[handle]", // optional for logging needed
    service: "https://bsky.social", // or another
    action: async (agent: AtpAgent) => {
        // implement any logic you want here to be repeated at the scheduledExpression
        const text = "implement logic to return a string";
        console.info(new Date, `Post cronbot ${bot.identifier}: ${text}`)
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
        console.info(new Date, `Post cronbot ${bot.identifier}: ${text}`)
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