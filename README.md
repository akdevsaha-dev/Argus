# Argus

> An AI coding agent that lives in your terminal.

Argus is a command-line coding agent in the spirit of Claude Code. Point it at a repository, describe what you want in plain language, and it reads code, runs commands, edits files, and iterates until the task is done, asking your permission before it does anything risky.

Argus Panoptes was the hundred-eyed watchman of Greek myth. This Argus watches your codebase.

---

## Status

🚧 **Early development.** Nothing below is guaranteed to work yet. This README describes the target design and serves as the project roadmap.

---

## Features (planned)

- **Interactive REPL**: a chat-style terminal UI with streaming output, markdown rendering, and syntax-highlighted diffs.
- **Agentic loop**: the model plans, calls tools, sees the results, and keeps going until the task is complete or it needs your input.
- **Built-in tools**: read, write, and edit files; glob and grep search; run shell commands; fetch web pages.
- **Permission system**: every tool call is checked against a policy (`ask`, `allow`, `deny`). Writes and shell commands ask by default.
- **Project memory**: an `ARGUS.md` file at the repo root gives the agent persistent, project-specific instructions.
- **Context management**: token tracking, automatic summarization of long conversations, and session resume.
- **Headless mode**: `argus -p "fix the failing test"` runs one task non-interactively for scripts and CI.
- **Slash commands**: `/help`, `/clear`, `/compact`, `/model`, `/cost`, `/undo`, plus custom commands defined in `.argus/commands/`.
- **MCP support**: connect external tools through the Model Context Protocol.
- **Subagents**: spawn focused child agents for parallel research or isolated tasks.
- **Checkpoints**: snapshot files before edits so `/undo` can roll back any change.
- **Hooks**: run your own scripts before or after tool calls (for example, to auto-format after every edit).

---

## Quick start

```bash
# Install (once published)
npm install -g argus-cli

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start an interactive session in your project
cd my-project
argus

# Or run one task headlessly
argus -p "add input validation to the signup form and write tests"
```

### Example session

```
$ argus
argus › the date parser crashes on ISO strings with timezones, fix it

● Grep "parseDate" → 4 matches
● Read src/utils/date.ts
● Edit src/utils/date.ts
  - const [date, time] = input.split("T");
  + const parsed = new Date(input);
  + if (Number.isNaN(parsed.getTime())) throw new InvalidDateError(input);
  Allow this edit? [y]es / [n]o / [a]lways for this session › y
● Bash npm test -- date
  ✓ 12 passed

Fixed. `parseDate` now delegates to `Date` for ISO 8601 input, including
offsets like `+05:30`. I added a regression test in `date.test.ts`.
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         CLI / TUI                            │
│        (input, streaming render, permission prompts)         │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                         Agent loop                           │
│  build prompt → call model → parse tool calls → check perms  │
│  → execute tools → append results → repeat until end_turn    │
└───────┬──────────────────┬───────────────────┬───────────────┘
        │                  │                   │
┌───────▼───────┐  ┌───────▼────────┐  ┌───────▼──────────────┐
│ Model client  │  │ Tool registry  │  │ Context manager      │
│ (Anthropic    │  │ Read, Write,   │  │ token counting,      │
│  API, stream- │  │ Edit, Bash,    │  │ compaction, session  │
│  ing, retries)│  │ Grep, Glob,    │  │ persistence, ARGUS.md│
│               │  │ WebFetch, MCP  │  │                      │
└───────────────┘  └───────┬────────┘  └──────────────────────┘
                           │
                   ┌───────▼────────┐
                   │ Permission     │
                   │ engine + hooks │
                   └────────────────┘
```

### The agent loop

The core of Argus is a simple loop:

```ts
while (true) {
  const response = await model.stream({ system, messages, tools });
  messages.push(response.message);

  if (response.stopReason !== "tool_use") break;

  const results = [];
  for (const call of response.toolCalls) {
    const decision = await permissions.check(call); // may prompt the user
    results.push(
      decision.allowed
        ? await tools.run(call)
        : { tool_use_id: call.id, content: "User denied this action.", is_error: true }
    );
  }
  messages.push({ role: "user", content: results });

  if (context.nearLimit(messages)) messages = await context.compact(messages);
}
```

Everything else (tools, permissions, the UI, memory) plugs into this loop.

### Tools

Each tool is a self-describing module:

```ts
export const ReadTool: Tool = {
  name: "Read",
  description: "Read a file from disk. Returns contents with line numbers.",
  inputSchema: z.object({
    file_path: z.string(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  permission: "allow",     // read-only tools don't prompt by default
  async run({ file_path, offset, limit }, ctx) { /* ... */ },
};
```

| Tool       | Purpose                                         | Default permission |
| ---------- | ----------------------------------------------- | ------------------ |
| `Read`     | Read a file, with optional line range           | allow              |
| `Glob`     | Find files by pattern                           | allow              |
| `Grep`     | Search file contents (ripgrep-backed)           | allow              |
| `Edit`     | Exact string replacement in a file              | ask                |
| `Write`    | Create or overwrite a file                      | ask                |
| `Bash`     | Run a shell command with a timeout              | ask                |
| `WebFetch` | Fetch a URL and convert it to markdown          | ask                |
| `Task`     | Spawn a subagent with its own context           | allow              |
| `TodoWrite`| Maintain a visible task list for long work      | allow              |

---

## Project structure

```
argus/
├── src/
│   ├── cli/            # Entry point, arg parsing, headless mode
│   ├── ui/             # Ink (React for terminals) components
│   ├── agent/          # Agent loop, system prompt, subagents
│   ├── model/          # Anthropic client, streaming, retries
│   ├── tools/          # One file per built-in tool
│   ├── permissions/    # Policy engine, rule matching, prompts
│   ├── context/        # Token counting, compaction, sessions
│   ├── config/         # Settings loading and merging
│   ├── mcp/            # MCP client integration
│   ├── hooks/          # Pre/post tool-call hooks
│   └── commands/       # Slash command implementations
├── tests/
├── ARGUS.md            # Argus's own project memory (dogfooding!)
├── package.json
└── tsconfig.json
```

---

## Tech stack

| Concern         | Choice                                                         |
| --------------- | -------------------------------------------------------------- |
| Language        | TypeScript on Node.js 20+                                      |
| Model API       | [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) with Claude models (default `claude-sonnet-5-5`) |
| Terminal UI     | [Ink](https://github.com/vadimdemedes/ink)                     |
| Arg parsing     | [Commander](https://github.com/tj/commander.js)                |
| Schemas         | [Zod](https://zod.dev) (converted to JSON Schema for tool defs) |
| Search          | [ripgrep](https://github.com/BurntSushi/ripgrep)               |
| MCP             | [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) |
| Tests           | [Vitest](https://vitest.dev)                                   |
| Build           | [tsup](https://tsup.egoist.dev)                                |

---

## Configuration

Settings merge from lowest to highest precedence:

1. Built-in defaults
2. User settings: `~/.argus/settings.json`
3. Project settings: `.argus/settings.json` (committed)
4. Local overrides: `.argus/settings.local.json` (gitignored)
5. CLI flags

```json
{
  "model": "claude-sonnet-5-5",
  "permissions": {
    "allow": ["Bash(npm test*)", "Bash(git status)", "Edit(src/**)"],
    "deny": ["Bash(rm -rf*)", "Read(.env*)"]
  },
  "hooks": {
    "postToolUse": [
      { "match": "Edit|Write", "command": "npx prettier --write $ARGUS_FILE" }
    ]
  },
  "mcpServers": {
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] }
  }
}
```

### Project memory (`ARGUS.md`)

Put an `ARGUS.md` in your repo root to tell Argus how your project works. It is loaded into the system prompt at the start of each session.

```md
# Project notes
- Use pnpm, not npm.
- Run `pnpm test:unit` before claiming anything works.
- API handlers live in src/routes; never import from src/legacy.
```

### CLI flags

| Flag                      | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `-p, --print <prompt>`    | Run one prompt headlessly and print the result     |
| `-m, --model <id>`        | Override the model                                 |
| `-c, --continue`          | Resume the most recent session in this directory   |
| `-r, --resume <id>`       | Resume a specific session                          |
| `--allow <rule>`          | Add an allow rule for this run                     |
| `--yolo`                  | Skip all permission prompts (use in sandboxes only)|
| `--output-format <fmt>`   | `text` \| `json` \| `stream-json` (headless mode)  |
| `--max-turns <n>`         | Cap the number of agent loop iterations            |

---

## Roadmap

### Milestone 0: Hello, agent
- [ ] Project scaffolding (TypeScript, tsup, Vitest, ESLint)
- [ ] Minimal REPL: read a line, send it to Claude, stream the reply
- [ ] Agent loop with `Read` and `Bash` tools
- [ ] Headless `-p` mode

### Milestone 1: A useful coding agent
- [ ] `Edit`, `Write`, `Glob`, `Grep` tools
- [ ] Permission engine with interactive prompts and allow/deny rules
- [ ] Colored diff rendering for edits
- [ ] `ARGUS.md` loading
- [ ] Settings file hierarchy

### Milestone 2: Long sessions
- [ ] Token counting and cost display (`/cost`)
- [ ] Automatic and manual (`/compact`) context compaction
- [ ] Prompt caching for the system prompt and tool definitions
- [ ] Session persistence plus `--continue` and `--resume`
- [ ] File checkpoints and `/undo`

### Milestone 3: Extensibility
- [ ] Custom slash commands from `.argus/commands/*.md`
- [ ] Pre/post tool-call hooks
- [ ] MCP client support
- [ ] Subagents via the `Task` tool
- [ ] `TodoWrite` tool for multi-step task tracking

### Milestone 4: Polish
- [ ] Interrupt with Esc mid-generation without losing state
- [ ] Image input (paste screenshots)
- [ ] Sandboxed `Bash` (macOS `sandbox-exec`, Linux bubblewrap)
- [ ] Git-aware features: commit messages, PR descriptions
- [ ] Publish to npm

---

## Development

```bash
git clone https://github.com/<you>/argus.git
cd argus
npm install

npm run dev        # run from source with hot reload
npm test           # unit tests
npm run build      # bundle to dist/
npm link           # make `argus` available globally from your checkout
```

### Design principles

1. **The loop is simple; the tools are smart.** Keep the agent loop small and easy to read. Put capability into well-described tools.
2. **Safe by default.** Nothing writes to disk or runs a command without permission unless the user has explicitly allowed it.
3. **Show your work.** Every tool call and its result should be visible and understandable in the terminal.
4. **Fail loudly.** Tool errors go back to the model as errors, not swallowed or disguised as success.
5. **Dogfood it.** Once Milestone 1 lands, use Argus to build Argus.

---

## Security

Argus executes code and edits files on your machine on behalf of a language model. Treat it accordingly:

- Review permission prompts before approving, especially for `Bash`.
- Keep secrets out of reach with `deny` rules (for example `Read(.env*)`).
- Use `--yolo` only inside containers or VMs.
- Content fetched from the web or read from files can contain prompt injection. Argus will treat tool output as data, not instructions, but no defense is perfect.

---

## Acknowledgements

Inspired by [Claude Code](https://docs.anthropic.com/en/docs/claude-code) from Anthropic, along with [Aider](https://aider.chat), [OpenAI Codex CLI](https://github.com/openai/codex), and [opencode](https://github.com/sst/opencode).

## License

MIT
