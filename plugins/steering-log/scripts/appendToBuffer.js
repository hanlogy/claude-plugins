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

// src/scripts/appendToBuffer.ts
var appendToBuffer_exports = {};
__export(appendToBuffer_exports, {
  handleHookEvent: () => handleHookEvent
});
module.exports = __toCommonJS(appendToBuffer_exports);

// src/helpers/readStdin.ts
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

// src/helpers/readStdin.ts
function readStdin() {
  const dataLike = JSON.parse((0, import_fs.readFileSync)("/dev/stdin", "utf-8"));
  if (!isJsonRecord(dataLike)) {
    return null;
  }
  const {
    session_id: sessionId,
    cwd,
    hook_event_name: hookEventName,
    ...data
  } = dataLike;
  if (typeof sessionId !== "string" || typeof cwd !== "string" || typeof hookEventName !== "string" || !isOneOf(HOOK_EVENT_NAMES, hookEventName)) {
    return null;
  }
  return { sessionId, cwd, hookEventName, data };
}

// src/helpers/buildPaths.ts
var import_path = require("path");
function buildPaths(cwd) {
  const steeringLogDir = (0, import_path.join)(cwd, STEERING_LOG_DIR);
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

// src/scripts/appendToBuffer.ts
var import_fs2 = require("fs");

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
function spawnDetectorScript(cwd) {
  spawnScript(cwd, RUN_DETECTOR_SCRIPT);
}

// src/helpers/safeGuard.ts
function safeGuard() {
  const { STEERING_LOG_INTERNAL_RUN } = process.env;
  if (STEERING_LOG_INTERNAL_RUN === "1") {
    process.exit(0);
  }
}

// src/scripts/appendToBuffer.ts
safeGuard();
function handleHookEvent() {
  const stdin = readStdin();
  if (!stdin) {
    return null;
  }
  const { sessionId, cwd, hookEventName, data } = stdin;
  let _bufferPath = null;
  const getBufferPath = () => {
    if (!_bufferPath) {
      const { conversationDir, bufferPath } = buildPaths(cwd);
      (0, import_fs2.mkdirSync)(conversationDir, { recursive: true });
      _bufferPath = bufferPath;
    }
    return _bufferPath;
  };
  const append = (data2) => {
    (0, import_fs2.appendFileSync)(
      getBufferPath(),
      JSON.stringify({
        ...data2,
        sessionId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }) + "\n"
    );
  };
  switch (hookEventName) {
    case "PostCompact":
      append({ command: "compact" });
      break;
    case "SessionEnd": {
      const { reason } = data;
      if (reason === "clear") {
        append({ command: "clear" });
      }
      break;
    }
    case "Stop": {
      const { last_assistant_message: content } = data;
      if (typeof content === "string") {
        append({ role: "assistant", content });
      }
      break;
    }
    case "UserPromptSubmit": {
      const { prompt: content } = data;
      if (typeof content === "string") {
        append({ role: "human", content });
      }
      break;
    }
  }
  return { cwd, hookEventName };
}
var result = handleHookEvent();
if (!result) {
  process.exit(0);
}
if (result.hookEventName === "UserPromptSubmit") {
  spawnDetectorScript(result.cwd);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleHookEvent
});
