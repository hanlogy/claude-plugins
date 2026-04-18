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

// src/scripts/runDetector.ts
var runDetector_exports = {};
__export(runDetector_exports, {
  runDetector: () => runDetector
});
module.exports = __toCommonJS(runDetector_exports);

// src/constants.ts
var DETECTOR_MODEL = "claude-haiku-4-5-20251001";
var STEERING_LOG_DIR = "steering_log";
var CONVERSATION_DIR = ".conversation";
var BUFFER_FILE = "buffer.jsonl";
var TRIGGERS_QUEUE_FILE = "triggers-queue.txt";
var DETECTOR_CONTEXT_FILE = "detector-context.json";
var SUMMARIZER_CONTEXT_FILE = "summarizer-context.json";
var AGENT_MAX_RETRIES = 2;
var QUALIFICATION_RULES_PLACEHOLDER = "{{QUALIFICATION_RULES}}";
var SCRIPTS_DIR = "scripts/";
var RUN_SUMMARIZER_SCRIPT = "runSummarizer.js";

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
function buildMessageEntries(data) {
  return data.map((e) => isJsonRecord(e) ? buildMessageEntry(e) : null).filter((e) => e !== null);
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

// src/helpers/writeContextFile.ts
var import_fs4 = require("fs");
function writeContextFile(path, data) {
  (0, import_fs4.writeFileSync)(path, JSON.stringify(data, null, 2));
}

// src/helpers/advanceDetector.ts
var import_fs5 = require("fs");
function advanceDetector(cwd2, { force = false } = {}) {
  const { bufferPath, detectorContextPath } = buildPaths(cwd2);
  if (!(0, import_fs5.existsSync)(bufferPath)) {
    return null;
  }
  const detectorContext = readDetectorContext(detectorContextPath);
  if (detectorContext) {
    if (!force && !detectorContext.isFinished) {
      return null;
    }
  }
  const lastProcessedTimestamp = findMessage(detectorContext?.messages ?? [], {
    role: "human",
    type: "newest"
  })?.timestamp;
  const messageEntries = readBufferLog(bufferPath).filter((e) => "role" in e);
  let hasNewHumanMessages = false;
  for (let i = 0; i < messageEntries.length; i++) {
    const entry = messageEntries[i];
    if (entry?.role !== "human") {
      continue;
    }
    if (lastProcessedTimestamp && entry.timestamp <= lastProcessedTimestamp) {
      continue;
    }
    hasNewHumanMessages = true;
    const assistantMessage = findMessage(messageEntries.slice(0, i), {
      role: "assistant",
      type: "newest"
    });
    if (!assistantMessage) {
      continue;
    }
    const context = {
      isFinished: false,
      messages: [assistantMessage, entry]
    };
    writeContextFile(detectorContextPath, context);
    return context;
  }
  if (!hasNewHumanMessages && detectorContext && !detectorContext.isFinished) {
    writeContextFile(detectorContextPath, {
      ...detectorContext,
      isFinished: true
    });
  }
  return null;
}

// src/helpers/writeTriggersQueue.ts
var import_fs6 = require("fs");
function writeTriggersQueue(cwd2, { timestamp }) {
  const { triggersQueuePath } = buildPaths(cwd2);
  (0, import_fs6.appendFileSync)(triggersQueuePath, `${timestamp}
`);
}

// src/helpers/extractJsonRecord.ts
function extractJsonRecord(input) {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== "{") {
      continue;
    }
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < input.length; j++) {
      const ch = input[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            const data = JSON.parse(input.slice(i, j + 1));
            if (isJsonRecord(data)) {
              return data;
            }
          } catch {
          }
          break;
        }
      }
    }
  }
  return null;
}

// src/helpers/parseDetectorAgentOutput.ts
function parseDetectorAgentOutput(stdout) {
  if (!stdout) {
    return null;
  }
  const jsonRecord = extractJsonRecord(stdout);
  if (!jsonRecord) {
    return null;
  }
  const { is_trigger: isTrigger } = jsonRecord;
  if (typeof isTrigger !== "boolean") {
    return null;
  }
  return { isTrigger };
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
function spawnSummarizerScript(cwd2) {
  spawnScript(cwd2, RUN_SUMMARIZER_SCRIPT);
}

// src/helpers/spawnAgents.ts
var import_child_process2 = require("child_process");
var import_fs7 = require("fs");
var import_path3 = require("path");
function spawnAgent({
  model,
  prompt,
  agentName,
  cwd: cwd2,
  attempt
}) {
  if (process.env["CLAUDE_PLUGIN_OPTION_DEBUG_PROMPTS"] === "true") {
    try {
      const { conversationDir } = buildPaths(cwd2);
      (0, import_fs7.mkdirSync)(conversationDir, { recursive: true });
      const logPath = (0, import_path3.join)(conversationDir, `${agentName}-prompts.log`);
      (0, import_fs7.appendFileSync)(
        logPath,
        `${(/* @__PURE__ */ new Date()).toISOString()}, attempt: ${attempt}
${prompt}

---

`
      );
    } catch {
    }
  }
  const result = (0, import_child_process2.spawnSync)("claude", ["--print", "--model", model], {
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
function spawnDetectorAgent(options) {
  return spawnAgent({
    model: DETECTOR_MODEL,
    agentName: "detector",
    ...options
  });
}

// src/prompts/detector.md
var detector_default = 'You are reviewing a software development conversation. Determine whether the\nhuman message is a meaningful developer steering moment.\n\n{{QUALIFICATION_RULES}}\n\n## Output format\n\nReturn only JSON \u2014 no prose, no markdown: {"is_trigger": true} or {"is_trigger":\nfalse}.\n';

// src/prompts/shared/momentRules.md
var momentRules_default = `## How to qualify a moment

Step 1 \u2014 classify the type:

- pushback: explicitly rejects or overrides a specific AI suggestion with a
  counter-position, alternative, or specific objection
- correction: clarifies a genuine misunderstanding that changed the AI's direction
- direction: gives a concrete instruction about approach, architecture, or implementation
- scope-change: deliberately narrows, expands, or redirects the goal
- preference: asserts a specific way of doing things ("we use X", "I prefer Y")

Step 2 \u2014 apply the bar for that type:

- pushback: always qualifies \u2014 it is by definition a reaction that overrides a
  prior AI response
- correction: always qualifies \u2014 it is by definition a response to a
  misunderstanding
- direction: must imply a constraint on or dissatisfaction with the current
  approach \u2014 explicit reasoning is not required, but the message must carry a
  signal beyond task sequencing. "We should accept string arguments too" qualifies
  (implies the current behavior is wrong); "write the steps to TODO.md first"
  does not (pure task ordering with no implied constraint)
- scope-change: same bar as direction \u2014 must imply a constraint or override, not
  just a redirect
- preference: must carry a signal about how the developer thinks \u2014 a pure task
  instruction does not qualify even if it technically expresses a preference

Do NOT classify as a moment regardless of type:

- Vague disagreement without substance ("I disagree", "that's not right", "are
  you sure")
- Confusion or requests for clarification ("what?", "huh?", "can you explain")
- Social acknowledgement ("ok", "maybe you're right", "I see")
- Follow-up questions that continue the same topic
- Additive follow-on requests unless they demand a redesign of what was just
  built \u2014 its type, interface, or design. Questions, discussion, or messages
  that add context without demanding a redesign are not moments ("can you add a
  comment?", "what about X?", "I think we might need Y")
- Selecting from options that Claude offered ("yes, option 2", "the second one")
- Weak or incidental signals that carry no meaningful steering weight \u2014 a passing
  remark, a minor wording tweak, or a throwaway preference that would not matter
  in a future session

The bar is high. When in doubt, return false.
`;

// src/scripts/runDetector.ts
var cwd = process.argv[2];
if (!cwd) {
  process.exit(0);
}
function runDetector(cwd2) {
  let context = advanceDetector(cwd2);
  let lastTimestamp = null;
  const advance = () => {
    context = advanceDetector(cwd2, { force: true });
  };
  while (context !== null) {
    const humanMessage = findMessage(context.messages, {
      role: "human",
      type: "newest"
    });
    if (!humanMessage || humanMessage.timestamp === lastTimestamp) {
      break;
    }
    lastTimestamp = humanMessage.timestamp;
    const agentOutput = runDetectorWithRetry(
      cwd2,
      buildPrompt(context.messages)
    );
    if (agentOutput === null) {
      advance();
      continue;
    }
    if (agentOutput.isTrigger) {
      writeTriggersQueue(cwd2, { timestamp: humanMessage.timestamp });
      spawnSummarizerScript(cwd2);
    }
    advance();
  }
}
function runDetectorWithRetry(cwd2, prompt) {
  let agentOutput = parseDetectorAgentOutput(
    spawnDetectorAgent({ cwd: cwd2, prompt, attempt: 1 })
  );
  for (let attempt = 2; agentOutput === null && attempt <= AGENT_MAX_RETRIES + 1; attempt++) {
    agentOutput = parseDetectorAgentOutput(
      spawnDetectorAgent({ cwd: cwd2, prompt, attempt })
    );
  }
  return agentOutput;
}
function buildPrompt(messages) {
  const conversation = messages.map(({ role, content }) => `[${role}]: ${content}`).join("\n\n");
  const prompt = detector_default.replace(QUALIFICATION_RULES_PLACEHOLDER, momentRules_default);
  return `${prompt}

--- Conversation ---

${conversation}

--- End of Conversation ---`;
}
runDetector(cwd);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runDetector
});
