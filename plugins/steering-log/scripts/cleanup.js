"use strict";

// src/scripts/cleanup.ts
var import_fs7 = require("fs");

// src/constants.ts
var STEERING_LOG_DIR = "steering_log";
var CONVERSATION_DIR = ".conversation";
var BUFFER_FILE = "buffer.jsonl";
var TRIGGERS_QUEUE_FILE = "triggers-queue.txt";
var DETECTOR_CONTEXT_FILE = "detector-context.json";
var SUMMARIZER_CONTEXT_FILE = "summarizer-context.json";
var HOOK_EVENT_NAMES = [
  "SessionStart",
  "PostCompact",
  "SessionEnd",
  "Stop",
  "UserPromptSubmit"
];
var SCRIPTS_DIR = "scripts/";
var RUN_DETECTOR_SCRIPT = "runDetector.js";
var RUN_SUMMARIZER_SCRIPT = "runSummarizer.js";

// src/helpers/buildPaths.ts
var import_path = require("path");
function buildPaths(cwd2) {
  const steeringLogDir2 = (0, import_path.join)(cwd2, STEERING_LOG_DIR);
  const conversationDir = (0, import_path.join)(steeringLogDir2, CONVERSATION_DIR);
  const detectorContextPath2 = (0, import_path.join)(conversationDir, DETECTOR_CONTEXT_FILE);
  const summarizerContextPath2 = (0, import_path.join)(conversationDir, SUMMARIZER_CONTEXT_FILE);
  const bufferPath2 = (0, import_path.join)(conversationDir, BUFFER_FILE);
  const triggersQueuePath2 = (0, import_path.join)(conversationDir, TRIGGERS_QUEUE_FILE);
  return {
    steeringLogDir: steeringLogDir2,
    conversationDir,
    detectorContextPath: detectorContextPath2,
    summarizerContextPath: summarizerContextPath2,
    bufferPath: bufferPath2,
    triggersQueuePath: triggersQueuePath2
  };
}

// src/helpers/readBufferLog.ts
var import_fs = require("fs");

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

// src/helpers/buildMessageEntry.ts
function buildMessageEntry(data2) {
  const { sessionId, timestamp, role, content } = data2;
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
function buildCommandEntry(data2) {
  const { sessionId, timestamp, command } = data2;
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

// src/helpers/readDetectorContext.ts
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
function buildMessageEntries(data2) {
  return data2.map((e) => isJsonRecord(e) ? buildMessageEntry(e) : null).filter((e) => e !== null);
}

// src/helpers/buildDetectorContext.ts
function buildDetectorContext({
  messages: rawMessages,
  isFinished
}) {
  if (!isJsonArray(rawMessages) || typeof isFinished !== "boolean") {
    return null;
  }
  const messages = buildMessageEntries(rawMessages);
  if (!messages.length) {
    return null;
  }
  return { messages, isFinished };
}

// src/helpers/readDetectorContext.ts
function readDetectorContext(path) {
  if (!(0, import_fs3.existsSync)(path)) {
    return null;
  }
  const record = readJsonRecord(path);
  return record ? buildDetectorContext(record) : null;
}

// src/helpers/readSummarizerContext.ts
var import_fs4 = require("fs");

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
  if (!(0, import_fs4.existsSync)(path)) {
    return null;
  }
  const record = readJsonRecord(path);
  return record ? buildSummarizerContext(record) : null;
}

// src/helpers/readTimestampQueue.ts
var import_fs5 = require("fs");
function readTimestampQueue(path) {
  if (!(0, import_fs5.existsSync)(path)) {
    return [];
  }
  return (0, import_fs5.readFileSync)(path, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
}

// src/helpers/readStdin.ts
var import_fs6 = require("fs");
function readStdin() {
  const dataLike = JSON.parse((0, import_fs6.readFileSync)("/dev/stdin", "utf-8"));
  if (!isJsonRecord(dataLike)) {
    return null;
  }
  const {
    session_id: sessionId,
    cwd: cwd2,
    hook_event_name: hookEventName2,
    ...data2
  } = dataLike;
  if (typeof sessionId !== "string" || typeof cwd2 !== "string" || typeof hookEventName2 !== "string" || !isOneOf(HOOK_EVENT_NAMES, hookEventName2)) {
    return null;
  }
  return { sessionId, cwd: cwd2, hookEventName: hookEventName2, data: data2 };
}

// src/helpers/spawnScripts.ts
var import_path2 = require("path");
var import_child_process = require("child_process");
function spawnScript(projectCwd, scriptFileName) {
  const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (!pluginRoot) {
    return;
  }
  const scriptPath = (0, import_path2.join)(pluginRoot, SCRIPTS_DIR, scriptFileName);
  const child = (0, import_child_process.spawn)(process.execPath, [scriptPath, projectCwd], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
function spawnDetectorScript(cwd2) {
  spawnScript(cwd2, RUN_DETECTOR_SCRIPT);
}
function spawnSummarizerScript(cwd2) {
  spawnScript(cwd2, RUN_SUMMARIZER_SCRIPT);
}

// src/helpers/safeGuard.ts
function safeGuard() {
  const { STEERING_LOG_INTERNAL_RUN } = process.env;
  if (STEERING_LOG_INTERNAL_RUN === "1") {
    process.exit(0);
  }
}

// src/scripts/cleanup.ts
safeGuard();
var stdin = readStdin();
if (!stdin) {
  process.exit(0);
}
var { cwd, hookEventName, data } = stdin;
if (hookEventName !== "SessionStart" || data["source"] !== "startup") {
  process.exit(0);
}
var {
  bufferPath,
  triggersQueuePath,
  detectorContextPath,
  summarizerContextPath,
  steeringLogDir
} = buildPaths(cwd);
(0, import_fs7.mkdirSync)(steeringLogDir, { recursive: true });
var detectorContext = readDetectorContext(detectorContextPath);
if (detectorContext) {
  const humanMessage = detectorContext.messages.find((m) => m.role === "human");
  if (humanMessage) {
    if (detectorContext.isFinished) {
      truncateBuffer(humanMessage.timestamp);
    } else {
      const triggerTimestamps = readTimestampQueue(triggersQueuePath);
      const lastTrigger = triggerTimestamps[triggerTimestamps.length - 1];
      if (lastTrigger) {
        truncateBuffer(lastTrigger);
      }
    }
  }
  (0, import_fs7.rmSync)(detectorContextPath);
}
var summarizerContext = readSummarizerContext(summarizerContextPath);
if (summarizerContext) {
  const firstMessage = summarizerContext.messages[0];
  const lastMessage = summarizerContext.messages[summarizerContext.messages.length - 1];
  if (summarizerContext.isFinished) {
    if (lastMessage) {
      truncateTriggersQueue(lastMessage.timestamp);
    }
  } else {
    if (firstMessage) {
      truncateTriggersQueue(firstMessage.timestamp);
    }
  }
  (0, import_fs7.rmSync)(summarizerContextPath);
}
if ((0, import_fs7.existsSync)(bufferPath)) {
  const hasHumanMessages = readBufferLog(bufferPath).some(
    (e) => "role" in e && e.role === "human"
  );
  if (hasHumanMessages) {
    spawnDetectorScript(cwd);
  }
}
var remainingTriggers = readTimestampQueue(triggersQueuePath);
if (remainingTriggers.length > 0) {
  spawnSummarizerScript(cwd);
}
function truncateBuffer(cutoffTimestamp) {
  if (!(0, import_fs7.existsSync)(bufferPath)) {
    return;
  }
  const remaining = (0, import_fs7.readFileSync)(bufferPath, "utf-8").split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    try {
      const entry = JSON.parse(trimmed);
      if (typeof entry === "object" && entry !== null && "timestamp" in entry && typeof entry.timestamp === "string") {
        return entry.timestamp > cutoffTimestamp;
      }
    } catch {
    }
    return true;
  });
  (0, import_fs7.writeFileSync)(
    bufferPath,
    remaining.length > 0 ? remaining.join("\n") + "\n" : ""
  );
}
function truncateTriggersQueue(cutoffTimestamp) {
  if (!(0, import_fs7.existsSync)(triggersQueuePath)) {
    return;
  }
  const remaining = readTimestampQueue(triggersQueuePath).filter(
    (ts) => ts > cutoffTimestamp
  );
  (0, import_fs7.writeFileSync)(triggersQueuePath, remaining.map((ts) => `${ts}
`).join(""));
}
