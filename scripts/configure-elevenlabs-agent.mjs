// Operator script — point the ElevenLabs agent's first message at our
// dynamically-generated opener. We thread a personalized opening line into every
// conversation via the `first_message` dynamic variable (see lib/llm/opener.ts +
// the three initiation paths); for the agent to actually SPEAK it, its dashboard
// first-message must be the template "{{first_message}}". This script sets exactly
// that field — fetching the full agent config and deep-merging ONLY that one path,
// so the Custom LLM config, voice, prompt, and everything else are left untouched.
//
// It is DRY-RUN BY DEFAULT. It prints the intended change and PATCHes only when
// you pass --apply. Idempotent: re-running when already configured is a no-op.
//
// Usage:
//   node scripts/configure-elevenlabs-agent.mjs            # dry run (default)
//   node scripts/configure-elevenlabs-agent.mjs --dry-run  # explicit dry run
//   node scripts/configure-elevenlabs-agent.mjs --apply    # actually PATCH

process.loadEnvFile?.(".env.local");

const BASE = "https://api.elevenlabs.io";
const FIRST_MESSAGE_TEMPLATE = "{{first_message}}";
// Mirror the safe fallback from lib/llm/opener.ts so a conversation that somehow
// arrives without first_message still gets a sane, on-brand greeting.
const FIRST_MESSAGE_DEFAULT =
  "Hey — start wherever you are. What's been turning over in your mind?";
const DISPLAY_NAME_DEFAULT = "there";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY_RUN = !APPLY; // default to dry-run unless --apply is explicitly passed

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
if (!apiKey) fail("ELEVENLABS_API_KEY is not set (check .env.local).");
if (!agentId) fail("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set (check .env.local).");

const headers = { "xi-api-key": apiKey };
const agentUrl = `${BASE}/v1/convai/agents/${encodeURIComponent(agentId)}`;

/** Plain-object guard (treat arrays/null as not-an-object for deep-merge). */
function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Set a nested value by path, cloning objects along the way; never mutate input. */
function setDeep(obj, path, value) {
  const root = isObject(obj) ? { ...obj } : {};
  let cursor = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cursor[key] = isObject(cursor[key]) ? { ...cursor[key] } : {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
  return root;
}

/** Read a nested value by path, or undefined. */
function getDeep(obj, path) {
  let cursor = obj;
  for (const key of path) {
    if (!isObject(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

async function main() {
  console.log(
    `${DRY_RUN ? "DRY RUN" : "APPLY"} · agent ${agentId}\n`,
  );

  // 1) Fetch the FULL current config so we deep-merge instead of overwriting.
  const getRes = await fetch(agentUrl, { headers });
  if (!getRes.ok) {
    const detail = await getRes.text().catch(() => "");
    fail(`GET agent failed: ${getRes.status} ${getRes.statusText}\n${detail.slice(0, 500)}`);
  }
  const agent = await getRes.json();

  const firstMessagePath = ["conversation_config", "agent", "first_message"];
  const current = getDeep(agent, firstMessagePath);
  console.log(`current first_message: ${JSON.stringify(current)}`);
  console.log(`desired first_message: ${JSON.stringify(FIRST_MESSAGE_TEMPLATE)}\n`);

  if (current === FIRST_MESSAGE_TEMPLATE) {
    console.log("✓ Already configured — first_message is already {{first_message}}. No change.");
  } else if (DRY_RUN) {
    console.log("Would PATCH:");
    console.log(`  conversation_config.agent.first_message`);
    console.log(`    - ${JSON.stringify(current)}`);
    console.log(`    + ${JSON.stringify(FIRST_MESSAGE_TEMPLATE)}`);
    console.log("\n(dry run — pass --apply to PATCH)");
  } else {
    // Minimal PATCH body: only the nested field we're changing. ElevenLabs merges
    // a partial conversation_config, so we send just the path we own and leave the
    // Custom LLM, voice, prompt, etc. untouched.
    const patchBody = setDeep({}, firstMessagePath, FIRST_MESSAGE_TEMPLATE);
    const patchRes = await fetch(agentUrl, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    if (!patchRes.ok) {
      const detail = await patchRes.text().catch(() => "");
      fail(`PATCH agent failed: ${patchRes.status} ${patchRes.statusText}\n${detail.slice(0, 500)}`);
    }
    const updated = await patchRes.json().catch(() => null);
    const after = updated ? getDeep(updated, firstMessagePath) : undefined;
    console.log(`✓ PATCHed first_message -> ${JSON.stringify(after ?? FIRST_MESSAGE_TEMPLATE)}`);
  }

  // 2) Dynamic-variable DEFAULTS (placeholders). The exact field name for default
  // values has moved around in the ElevenLabs schema; we attempt the documented
  // path and, if it's absent, print a clear manual instruction rather than guess
  // wrong and clobber config. Defaults only matter as a backstop — our initiation
  // paths always set first_message + display_name — but they keep the agent sane
  // if a conversation ever starts without them.
  const placeholdersPath = [
    "conversation_config",
    "agent",
    "dynamic_variables",
    "dynamic_variable_placeholders",
  ];
  const existingPlaceholders = getDeep(agent, placeholdersPath);
  const desiredPlaceholders = {
    ...(isObject(existingPlaceholders) ? existingPlaceholders : {}),
    first_message: FIRST_MESSAGE_DEFAULT,
    display_name: DISPLAY_NAME_DEFAULT,
  };

  if (isObject(existingPlaceholders)) {
    const needsUpdate =
      existingPlaceholders.first_message !== FIRST_MESSAGE_DEFAULT ||
      existingPlaceholders.display_name !== DISPLAY_NAME_DEFAULT;
    if (!needsUpdate) {
      console.log("\n✓ Dynamic-variable defaults already set (first_message, display_name).");
    } else if (DRY_RUN) {
      console.log("\nWould set dynamic-variable defaults:");
      console.log(`  conversation_config.agent.dynamic_variables.dynamic_variable_placeholders`);
      console.log(`    first_message = ${JSON.stringify(FIRST_MESSAGE_DEFAULT)}`);
      console.log(`    display_name  = ${JSON.stringify(DISPLAY_NAME_DEFAULT)}`);
      console.log("(dry run — pass --apply to PATCH)");
    } else {
      const patchBody = setDeep({}, placeholdersPath, desiredPlaceholders);
      const patchRes = await fetch(agentUrl, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!patchRes.ok) {
        const detail = await patchRes.text().catch(() => "");
        console.warn(
          `\n! Could not set dynamic-variable defaults: ${patchRes.status} ${patchRes.statusText}\n${detail.slice(0, 300)}`,
        );
        printManualDefaultsInstruction();
      } else {
        console.log("\n✓ Set dynamic-variable defaults (first_message, display_name).");
      }
    }
  } else {
    // We didn't find the placeholders field on this agent — don't guess the schema
    // and risk clobbering. Tell the operator exactly what to set by hand.
    console.log(
      "\n! Could not find dynamic_variable_placeholders on this agent's config.",
    );
    printManualDefaultsInstruction();
  }

  // 3) END-CALL SYSTEM TOOL (detect-only). For Socrates to actually HANG UP when a
  // conversation has wound down — not just speak a goodbye and leave dead air — the
  // agent needs ElevenLabs' built-in "End Call" system tool enabled. The exact
  // schema path for built-in/system tools has shifted across ElevenLabs versions
  // (prompt.tools[] vs prompt.built_in_tools.end_call vs conversation_config.agent.tools),
  // so we DETECT it across the known locations and, if it's not clearly on, print a
  // manual toggle instruction rather than PATCH tool config blind and risk clobbering.
  reportEndCallTool(agent);

  console.log("\nDone.");
}

/** Best-effort read-only check for an enabled "end_call" system/built-in tool. */
function hasEndCallTool(agent) {
  const ac = getDeep(agent, ["conversation_config", "agent"]);
  if (!isObject(ac)) return false;

  // a) prompt.built_in_tools.end_call (object or boolean-ish)
  const builtIn = getDeep(ac, ["prompt", "built_in_tools"]);
  if (isObject(builtIn) && builtIn.end_call) return true;

  // b) prompt.tools[] / agent.tools[] containing an end_call entry
  const toolLists = [getDeep(ac, ["prompt", "tools"]), getDeep(ac, ["tools"])];
  for (const list of toolLists) {
    if (
      Array.isArray(list) &&
      list.some(
        (t) =>
          isObject(t) &&
          (t.name === "end_call" ||
            t.type === "end_call" ||
            t.type === "system" && t.name === "end_call"),
      )
    ) {
      return true;
    }
  }
  return false;
}

function reportEndCallTool(agent) {
  if (hasEndCallTool(agent)) {
    console.log('\n✓ "End Call" system tool appears enabled — Socrates can hang up when a call winds down.');
  } else {
    console.log(
      '\n! "End Call" system tool not detected on this agent.\n' +
        "  MANUAL STEP — in the ElevenLabs dashboard, open this agent → Tools (System tools)\n" +
        '  and enable "End Call". Without it, Socrates can speak a send-off but cannot\n' +
        "  actually disconnect, leaving dead air. The system prompt already instructs it to\n" +
        "  wrap up and stop when a conversation has run its course.",
    );
  }
}

function printManualDefaultsInstruction() {
  console.log(
    "  MANUAL STEP — in the ElevenLabs dashboard, open this agent → Dynamic Variables\n" +
      `  and set defaults:  first_message = "${FIRST_MESSAGE_DEFAULT}"  ·  display_name = "${DISPLAY_NAME_DEFAULT}".\n` +
      "  (Our app always supplies these at call start; defaults are only a backstop.)",
  );
}

main().catch((e) => {
  console.error("\nUnexpected error:", e?.message || e);
  process.exit(1);
});
