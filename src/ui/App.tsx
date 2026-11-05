import React, { useRef, useState } from "react";
import { Box, Static, useApp, useInput, useStdout, useWindowSize } from "ink";
import Banner from "./components/Banner.js";
import Message, { type ChatMessage } from "./components/Message.js";
import Thinking from "./components/Thinking.js";
import Prompt, { type Command } from "./components/Prompt.js";

const COMMANDS: Command[] = [
  { name: "/help", description: "Show available commands" },
  { name: "/clear", description: "Clear the conversation" },
  { name: "/exit", description: "Quit Argus" },
];

type StaticItem = { id: "banner" } | ChatMessage;

export default function App() {
  const { exit } = useApp();
  const { columns } = useWindowSize();
  const { write } = useStdout();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const pending = useRef<NodeJS.Timeout | null>(null);
  const nextId = useRef(0);

  const push = (msg: Omit<ChatMessage, "id">) => {
    const message: ChatMessage = { ...msg, id: String(nextId.current++) };
    setMessages((prev) => [...prev, message]);
  };

  const suggestions =
    input.startsWith("/") && !input.includes(" ")
      ? COMMANDS.filter((c) => c.name.startsWith(input))
      : [];

  const interrupt = () => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
    setIsThinking(false);
    push({ role: "system", content: "Interrupted." });
  };

  useInput((_char, key) => {
    if (key.escape) {
      if (isThinking) interrupt();
      else if (input) setInput("");
      else exit();
    } else if (key.tab && suggestions[0]) {
      setInput(suggestions[0].name);
      setInputKey((k) => k + 1);
    }
  });

  const runCommand = (name: string) => {
    switch (name) {
      case "/exit":
        exit();
        break;
      case "/clear":
        write("\x1b[2J\x1b[3J\x1b[H");
        setMessages([]);
        setEpoch((e) => e + 1);
        break;
      case "/help":
        push({
          role: "system",
          content: COMMANDS.map(
            (c) => `${c.name.padEnd(8)} ${c.description}`,
          ).join("\n  "),
        });
        break;
      default:
        push({ role: "error", content: `Unknown command ${name}. Try /help.` });
    }
  };

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isThinking) return;

    setInput("");

    if (trimmed.startsWith("/")) {
      runCommand(trimmed.split(/\s+/)[0]!);
      return;
    }

    push({ role: "user", content: trimmed });
    setIsThinking(true);

    const startedAt = Date.now();
    pending.current = setTimeout(() => {
      pending.current = null;
      push({
        role: "assistant",
        content: `Echoing task: "${trimmed}". Ready to wire up the LLM ReAct loop in Phase 2.`,
        durationMs: Date.now() - startedAt,
      });
      setIsThinking(false);
    }, 6000);
  };

  const items: StaticItem[] = [{ id: "banner" }, ...messages];

  return (
    <Box flexDirection="column" width={Math.max(1, columns - 1)}>
      <Static key={`output-${epoch}`} items={items}>
        {(item) => (
          <Box key={item.id} paddingX={1}>
            {"role" in item ? <Message message={item} /> : <Banner />}
          </Box>
        )}
      </Static>

      <Box flexDirection="column" paddingX={1}>
      {isThinking && <Thinking />}

      <Prompt
        key={`prompt-${inputKey}`}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        busy={isThinking}
        suggestions={isThinking ? [] : suggestions}
      />
      </Box>
    </Box>
  );
}
