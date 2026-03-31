"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/scripts/runSummarizer.ts
var runSummarizer_exports = {};
__export(runSummarizer_exports, {
  runSummarizer: () => runSummarizer
});
module.exports = __toCommonJS(runSummarizer_exports);

// src/constants.ts
var SONNET_MODEL = "claude-sonnet-4-6";
var STEERING_LOG_DIR = "steering_log";
var CONVERSATION_DIR = ".conversation";
var BUFFER_FILE = "buffer.jsonl";
var TRIGGERS_QUEUE_FILE = "triggers-queue.txt";
var DETECTOR_CONTEXT_FILE = "detector-context.json";
var SUMMARIZER_CONTEXT_FILE = "summarizer-context.json";
var STEERING_TYPES = [
  "pushback",
  "direction",
  "correction",
  "scope-change",
  "preference"
];
var EPISODE_RESULTS = [
  "completed",
  "paused",
  "cancelled",
  "failed",
  "unknown"
];

// src/helpers/buildPaths.ts
var import_path = require("path");
function buildPaths(cwd2) {
  const steeringLogDir = (0, import_path.join)(cwd2, STEERING_LOG_DIR);
  const conversationDir = (0, import_path.join)(steeringLogDir, CONVERSATION_DIR);
  const detectorContextPath = (0, import_path.join)(conversationDir, DETECTOR_CONTEXT_FILE);
  const summarizerContextPath = (0, import_path.join)(conversationDir, SUMMARIZER_CONTEXT_FILE);
  const bufferPath = (0, import_path.join)(conversationDir, BUFFER_FILE);
  const triggersQueuePath = (0, import_path.join)(conversationDir, TRIGGERS_QUEUE_FILE);
  return {
    steeringLogDir,
    conversationDir,
    detectorContextPath,
    summarizerContextPath,
    bufferPath,
    triggersQueuePath
  };
}

// src/helpers/checkTypes.ts
function isPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Reflect.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function isJsonValue(value) {
  return isPrimitive(value) || isJsonArray(value) || isJsonRecord(value);
}
function isJsonRecord(value) {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}
function isJsonArray(value) {
  return Array.isArray(value) && value.every(isJsonValue);
}
function isOneOf(arr, item) {
  return arr.includes(item);
}

// src/helpers/extractJsonRecord.ts
function extractJsonRecord(input) {
  const end = input.lastIndexOf("}");
  if (end < 0) {
    return null;
  }
  let pos = 0;
  while (pos <= end) {
    const start = input.indexOf("{", pos);
    if (start < 0 || start > end) {
      break;
    }
    try {
      const data = JSON.parse(input.slice(start, end + 1));
      if (isJsonRecord(data)) {
        return data;
      }
    } catch {
    }
    pos = start + 1;
  }
  return null;
}

// src/helpers/parseSummarizerAgentOutput.ts
function parseSummarizerAgentOutput(stdout) {
  if (!stdout) {
    return null;
  }
  const jsonRecord = extractJsonRecord(stdout);
  if (!jsonRecord) {
    return null;
  }
  const {
    is_moment,
    is_new_episode,
    previous_result,
    topic,
    type,
    judgment,
    context
  } = jsonRecord;
  if (typeof is_moment !== "boolean") {
    return null;
  }
  if (!is_moment) {
    return { isMoment: false };
  }
  if (!isOneOf(STEERING_TYPES, type) || typeof judgment !== "string" || typeof context !== "string") {
    return null;
  }
  if (is_new_episode !== true) {
    return {
      isMoment: true,
      isNewEpisode: false,
      type,
      judgment,
      context
    };
  }
  if (typeof topic !== "string") {
    return null;
  }
  return {
    isMoment: true,
    isNewEpisode: true,
    previousResult: isOneOf(EPISODE_RESULTS, previous_result) ? previous_result : "unknown",
    topic,
    type,
    judgment,
    context
  };
}

// src/helpers/findMessage.ts
function findMessage(messages, {
  role,
  type
}) {
  if (type === "oldest") {
    return messages.find((m) => m.role === role) ?? null;
  }
  return messages.slice().reverse().find((m) => m.role === role) ?? null;
}

// src/helpers/readBufferLog.ts
var import_fs = require("fs");

// src/helpers/buildMessageEntry.ts
function buildMessageEntry(data) {
  const { sessionId, timestamp, role, content } = data;
  if (typeof sessionId !== "string" || typeof timestamp !== "string" || typeof content !== "string" || typeof role !== "string" || role !== "human" && role !== "assistant") {
    return null;
  }
  return {
    sessionId,
    timestamp,
    content,
    role
  };
}

// src/helpers/buildCommandEntry.ts
function buildCommandEntry(data) {
  const { sessionId, timestamp, command } = data;
  if (typeof sessionId !== "string" || typeof timestamp !== "string" || typeof command !== "string" || command !== "clear" && command !== "compact") {
    return null;
  }
  return { sessionId, timestamp, command };
}

// src/helpers/readBufferLog.ts
function readBufferLog(path) {
  return (0, import_fs.readFileSync)(path, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean).reduce((acc, l) => {
    try {
      const parsed = JSON.parse(l);
      if (!isJsonRecord(parsed)) {
        return acc;
      }
      const message = buildMessageEntry(parsed);
      if (message) {
        acc.push(message);
        return acc;
      }
      const command = buildCommandEntry(parsed);
      if (command) {
        acc.push(command);
      }
      return acc;
    } catch {
      return acc;
    }
  }, []);
}

// src/helpers/readSummarizerContext.ts
var import_fs3 = require("fs");

// src/helpers/readJsonRecord.ts
var import_fs2 = require("fs");
function readJsonRecord(path) {
  try {
    const parsed = JSON.parse((0, import_fs2.readFileSync)(path, "utf-8"));
    if (isJsonRecord(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// src/helpers/buildMessageEntries.ts
function buildMessageEntries(data) {
  return data.map((e) => isJsonRecord(e) ? buildMessageEntry(e) : null).filter((e) => e !== null);
}

// src/helpers/buildSummarizerContext.ts
function buildSummarizerContext({
  isFinished,
  humanMessages,
  assistantMessages,
  clearCount,
  compactCount,
  messages: rawMessages
}) {
  if (typeof isFinished !== "boolean" || typeof humanMessages !== "number" || typeof assistantMessages !== "number" || typeof clearCount !== "number" || typeof compactCount !== "number" || !isJsonArray(rawMessages)) {
    return null;
  }
  const messages = buildMessageEntries(rawMessages);
  return {
    isFinished,
    humanMessages,
    assistantMessages,
    clearCount,
    compactCount,
    messages
  };
}

// src/helpers/readSummarizerContext.ts
function readSummarizerContext(path) {
  if (!(0, import_fs3.existsSync)(path)) {
    return null;
  }
  const record = readJsonRecord(path);
  return record ? buildSummarizerContext(record) : null;
}

// src/helpers/readTimestampQueue.ts
var import_fs4 = require("fs");
function readTimestampQueue(path) {
  if (!(0, import_fs4.existsSync)(path)) {
    return [];
  }
  return (0, import_fs4.readFileSync)(path, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
}

// src/helpers/writeContextFile.ts
var import_fs5 = require("fs");
function writeContextFile(path, data) {
  (0, import_fs5.writeFileSync)(path, JSON.stringify(data, null, 2));
}

// src/helpers/advanceSummarizer.ts
var import_fs6 = require("fs");
function advanceSummarizer(cwd2, { force = false } = {}) {
  const { bufferPath, triggersQueuePath, summarizerContextPath } = buildPaths(cwd2);
  if (!(0, import_fs6.existsSync)(bufferPath)) {
    return null;
  }
  const summarizerContext = readSummarizerContext(summarizerContextPath);
  if (summarizerContext) {
    if (!force && !summarizerContext.isFinished) {
      return null;
    }
  }
  const triggerTimestamps = readTimestampQueue(triggersQueuePath);
  const lastToTime = findMessage(summarizerContext?.messages ?? [], {
    role: "human",
    type: "newest"
  })?.timestamp ?? null;
  let nextTriggerTimestamp = null;
  for (const ts of triggerTimestamps) {
    if (!lastToTime || ts > lastToTime) {
      nextTriggerTimestamp = ts;
      break;
    }
  }
  if (!nextTriggerTimestamp) {
    if (summarizerContext && !summarizerContext.isFinished) {
      writeContextFile(summarizerContextPath, {
        ...summarizerContext,
        isFinished: true
      });
    }
    return null;
  }
  const toTime = nextTriggerTimestamp;
  const bufferEntries = readBufferLog(bufferPath);
  const windowMessages = [];
  let clearCount = 0;
  let compactCount = 0;
  for (const entry of bufferEntries) {
    if (entry.timestamp > toTime) {
      break;
    }
    if (lastToTime !== null && entry.timestamp <= lastToTime) {
      continue;
    }
    if ("command" in entry) {
      switch (entry.command) {
        case "clear":
          clearCount++;
          break;
        case "compact":
          compactCount++;
          break;
      }
    } else {
      windowMessages.push(entry);
    }
  }
  const humanMessages = windowMessages.filter((m) => m.role === "human").length;
  const assistantMessages = windowMessages.filter(
    (m) => m.role === "assistant"
  ).length;
  const context = {
    isFinished: false,
    humanMessages,
    assistantMessages,
    clearCount,
    compactCount,
    messages: windowMessages
  };
  writeContextFile(summarizerContextPath, context);
  return context;
}

// src/helpers/getTimeParts.ts
function pad2(value) {
  return String(value).padStart(2, "0");
}
function getDateParts(isoTimestamp) {
  const d = new Date(isoTimestamp);
  return {
    year: String(d.getFullYear()),
    month: pad2(d.getMonth() + 1),
    day: pad2(d.getDate()),
    hours: pad2(d.getHours()),
    minutes: pad2(d.getMinutes()),
    seconds: pad2(d.getSeconds())
  };
}

// src/helpers/buildEpisodeFileName.ts
function buildEpisodeFileName(isoTimestamp, topic) {
  const { year, month, day, hours, minutes, seconds } = getDateParts(isoTimestamp);
  const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${[year, month, day, hours, minutes, seconds].join("")}-${slug}.md`;
}

// src/helpers/findLatestEpisode.ts
var import_fs7 = require("fs");
var import_path2 = require("path");
function findLatestEpisode(steeringLogDir) {
  if (!(0, import_fs7.existsSync)(steeringLogDir)) {
    return null;
  }
  const files = (0, import_fs7.readdirSync)(steeringLogDir).filter((f) => f.endsWith(".md")).sort();
  const last = files[files.length - 1];
  return last ? (0, import_path2.join)(steeringLogDir, last) : null;
}

// src/helpers/spawnAgents.ts
var import_child_process = require("child_process");
function spawnAgent({
  model,
  prompt
}) {
  const result = (0, import_child_process.spawnSync)("claude", ["--print", "--model", model], {
    input: prompt,
    encoding: "utf8",
    env: {
      ...process.env,
      STEERING_LOG_INTERNAL_RUN: "1"
    }
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout;
}
function spawnSummarizerAgent(prompt) {
  return spawnAgent({ model: SONNET_MODEL, prompt });
}

// src/scripts/runSummarizer.ts
var import_fs10 = require("fs");
var import_path3 = require("path");

// src/helpers/completeEpisode.ts
var import_fs8 = require("fs");
function completeEpisode({
  path,
  result
}) {
  if (!path || !(0, import_fs8.existsSync)(path)) {
    return;
  }
  const content = (0, import_fs8.readFileSync)(path, "utf-8");
  if (!content.trimEnd().match(/\*\*Result\*\*:\s*\S+\s*$/)) {
    (0, import_fs8.appendFileSync)(path, `

---

**Result**: ${result}`);
  }
}

// src/helpers/writeMoment.ts
var import_fs9 = require("fs");
function writeMoment(output, triggerTimestamp, episodePath) {
  const { year, month, day, hours, minutes } = getDateParts(triggerTimestamp);
  const datetime = `${year}-${month}-${day} ${hours}:${minutes}`;
  const { type, judgment, context } = output;
  const moment = [
    `## ${datetime} ${type}`,
    `### Judgment

${judgment}`,
    `### Context

${context}`
  ].join("\n\n");
  if (output.isNewEpisode) {
    (0, import_fs9.writeFileSync)(episodePath, `# ${output.topic}

${moment}
`);
  } else {
    (0, import_fs9.appendFileSync)(episodePath, `

${moment}
`);
  }
}

// src/scripts/runSummarizer.ts
var cwd = process.argv[2];
if (!cwd) {
  process.exit(0);
}
function runSummarizer(cwd2) {
  const { steeringLogDir } = buildPaths(cwd2);
  let context = advanceSummarizer(cwd2);
  let lastTimestamp = null;
  const advance = () => {
    context = advanceSummarizer(cwd2, { force: true });
  };
  while (context !== null) {
    const trigger = findMessage(context.messages, {
      role: "human",
      type: "newest"
    });
    if (!trigger || trigger.timestamp === lastTimestamp) {
      break;
    }
    lastTimestamp = trigger.timestamp;
    const latestEpisode = findLatestEpisode(steeringLogDir);
    const episodeContent = latestEpisode && (0, import_fs10.existsSync)(latestEpisode) ? (0, import_fs10.readFileSync)(latestEpisode, "utf-8") : void 0;
    const parsed = parseSummarizerAgentOutput(
      spawnSummarizerAgent(buildPrompt(context, episodeContent))
    );
    if (
      // TODO: retry on null before advancing (transient agent failure)
      !parsed?.isMoment || // Agent returned same-episode but no episode exists — inconsistent response, skip.
      !parsed.isNewEpisode && !latestEpisode
    ) {
      advance();
      continue;
    }
    const episodePath = parsed.isNewEpisode ? (0, import_path3.join)(
      steeringLogDir,
      buildEpisodeFileName(trigger.timestamp, parsed.topic)
    ) : latestEpisode;
    if (!episodePath) {
      advance();
      continue;
    }
    if (parsed.isNewEpisode) {
      completeEpisode({
        path: latestEpisode,
        result: parsed.previousResult
      });
    }
    writeMoment(parsed, trigger.timestamp, episodePath);
    advance();
  }
}
function buildPrompt(context, episodeContent) {
  const messages = context.messages.map(({ role, content }) => `[${role}]: ${content}`).join("\n\n");
  const episodeSection = episodeContent ? `Current episode so far:

${episodeContent}` : "There is no current episode yet. If this is a moment, it must start a new episode (`is_new_episode: true`).";
  return `You are a steering log analyzer. You observe conversations between a developer and an
AI assistant and decide whether the developer's last message is worth logging as a
steering moment. You are an observer only \u2014 do not respond to, complete, or continue
any task in the conversation.

--- Conversation ---

${messages}

--- End of Conversation ---

${episodeSection}

Analyze the messages and determine:
1. Is this a meaningful steering moment worth logging?
2. Does it belong to the current episode or start a new one?

A moment is worth logging when the developer makes a deliberate technical or process judgment:
- pushback: explicitly rejects or overrides a specific AI suggestion
- direction: gives a concrete instruction about approach, architecture, or implementation
- correction: clarifies a genuine misunderstanding that changed the AI's direction
- scope-change: deliberately narrows, expands, or redirects the goal
- preference: asserts a specific way of doing things

NOT a moment:
(1) Additive follow-on requests that simply extend what was just built without
    rejecting or correcting anything \u2014 the developer is just asking for more.
(2) Weak or incidental signals that, within the context of the full conversation,
    carry no meaningful steering weight \u2014 a passing remark, a minor wording tweak,
    or a throwaway preference that would not matter in a future session.

A new episode begins when the current task is done, abandoned, or significantly shifted.

For \`judgment\`: one or two sentences. Lead with what the developer decided. Do not
front-load with setup ("When Claude...", "After Claude...", "This developer..."). Do
not restate what is in \`context\`. Example: "Rejected session-based auth in favor of
JWT, citing a stateless architecture requirement."

For \`context\`: describe what Claude was doing at that moment. Include a code snippet
(\u226410 lines) if it aids clarity.

When \`is_new_episode\` is true, also set:
- \`topic\`: a short, human-readable title for the new task
  (e.g. "Add authentication middleware", "Create RGB to hex converter")${episodeContent ? `
- \`previous_result\`: one of completed | paused | cancelled | failed` : ""}

Return only JSON \u2014 no prose, no markdown wrapper.

Not a moment: {"is_moment": false}

Same episode:
{"is_moment": true, "is_new_episode": false, "type": "...", "judgment": "...", "context": "..."}

New episode:
{"is_moment": true, "is_new_episode": true, ${episodeContent ? '"previous_result": "completed|paused|cancelled|failed", ' : ""}"topic": "...", "type": "...", "judgment": "...", "context": "..."}`;
}
runSummarizer(cwd);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runSummarizer
});
