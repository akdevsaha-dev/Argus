import React, { useRef, useState } from "react";
import { Box, Static, useApp, useInput, useStdout } from "ink";
import { resetHistory, runAgent } from "../agent/agent.js";
import Banner from "./components/Banner.js";
import Message, { type ChatMessage } from "./components/Message.js";
import Thinking from "./components/Thinking.js";
import Prompt, { type Command } from "./components/Prompt.js";

const COMMANDS: Command[] = [
  { name: "/help", description: "Show available commands" },
  { name: "/clear", description: "Clear the conversation" },
  { name: "/exit", description: "Quit Argus" },
  {
    name: "/reset",
    description: "Clear conversation history and start a fresh session.",
  },
];

type StaticItem = { id: "banner" } | ChatMessage;

export default function App() {
  const { exit } = useApp();
  const { write } = useStdout();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
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
    abortRef.current?.abort();
    abortRef.current = null;
    setIsThinking(false);
    setActivity(null);
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
      case "/reset":
        resetHistory();
        setMessages([]);
        setEpoch((e) => e + 1);
        write("\x1b[2J\x1b[3J\x1b[H");
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
    setActivity(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();

    void (async () => {
      try {
        await runAgent(
          trimmed,
          (text) => {
            setActivity(null);
            push({ role: "assistant", content: text });
          },
          (name) => setActivity(`Using ${name}`),
          controller.signal,
        );

        if (controller.signal.aborted) return;

        const durationMs = Date.now() - startedAt;
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            const message = next[i];
            if (message?.role === "assistant") {
              next[i] = { ...message, durationMs };
              break;
            }
          }
          return next;
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        push({ role: "error", content: message });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsThinking(false);
          setActivity(null);
        }
      }
    })();
  };

  const items: StaticItem[] = [{ id: "banner" }, ...messages];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Static key={`output-${epoch}`} items={items}>
        {(item) => (
          <Box key={item.id} paddingX={1}>
            {"role" in item ? <Message message={item} /> : <Banner />}
          </Box>
        )}
      </Static>

      {isThinking && <Thinking label={activity ?? undefined} />}

      <Prompt
        key={`prompt-${inputKey}`}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        busy={isThinking}
        suggestions={isThinking ? [] : suggestions}
      />
    </Box>
  );
}
