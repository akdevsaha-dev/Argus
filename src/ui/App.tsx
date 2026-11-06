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

function addResponseDuration(messages: ChatMessage[], durationMs: number) {
  const updated = [...messages];

  for (let index = updated.length - 1; index >= 0; index--) {
    const message = updated[index];
    if (message?.role === "assistant") {
      updated[index] = { ...message, durationMs };
      break;
    }
  }

  return updated;
}

export default function App() {
  const { exit } = useApp();
  const { write } = useStdout();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [outputVersion, setOutputVersion] = useState(0);
  const [promptVersion, setPromptVersion] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);
  const nextMessageId = useRef(0);
  const inputRef = useRef(input);
  const thinkingRef = useRef(isThinking);
  inputRef.current = input;
  thinkingRef.current = isThinking;

  function addMessage(role: ChatMessage["role"], content: string) {
    const message: ChatMessage = {
      id: String(nextMessageId.current++),
      role,
      content,
    };
    setMessages((previous) => [...previous, message]);
  }

  const suggestions =
    input.startsWith("/") && !input.includes(" ")
      ? COMMANDS.filter((command) => command.name.startsWith(input))
      : [];

  function interrupt() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsThinking(false);
    setActivity(null);
    addMessage("system", "Interrupted.");
  }

  function clearScreen() {
    write("\x1b[2J\x1b[3J\x1b[H");
    setMessages([]);
    setOutputVersion((version) => version + 1);
  }

  function runCommand(name: string) {
    switch (name) {
      case "/exit":
        exit();
        return;
      case "/reset":
        resetHistory();
        clearScreen();
        return;
      case "/clear":
        clearScreen();
        return;
      case "/help": {
        const help = COMMANDS.map(
          (command) => `${command.name.padEnd(8)} ${command.description}`,
        ).join("\n  ");
        addMessage("system", help);
        return;
      }
      default:
        addMessage("error", `Unknown command ${name}. Try /help.`);
    }
  }

  async function sendMessage(text: string) {
    addMessage("user", text);
    setIsThinking(true);
    setActivity(null);

    const controller = new AbortController();
    activeRequest.current = controller;
    const startedAt = Date.now();

    try {
      await runAgent(
        text,
        (reply) => {
          setActivity(null);
          addMessage("assistant", reply);
        },
        (toolName) => setActivity(`Using ${toolName}`),
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const durationMs = Date.now() - startedAt;
      setMessages((previous) => addResponseDuration(previous, durationMs));
    } catch (error) {
      if (controller.signal.aborted) return;

      const message = error instanceof Error ? error.message : String(error);
      addMessage("error", message);
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsThinking(false);
        setActivity(null);
      }
    }
  }

  function handleSubmit(value: string) {
    const text = value.trim();
    if (!text || isThinking) return;

    setInput("");

    if (text.startsWith("/")) {
      const command = text.split(/\s+/)[0]!;
      runCommand(command);
      return;
    }

    void sendMessage(text);
  }

  useInput((_char, key) => {
    if (key.escape) {
      if (thinkingRef.current) interrupt();
      else if (inputRef.current) setInput("");
      else exit();
      return;
    }

    const firstSuggestion = suggestions[0];
    if (key.tab && firstSuggestion) {
      setInput(firstSuggestion.name);
      setPromptVersion((version) => version + 1);
    }
  });

  const items: StaticItem[] = [{ id: "banner" }, ...messages];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Static key={`output-${outputVersion}`} items={items}>
        {(item) => (
          <Box key={item.id} paddingX={1}>
            {"role" in item ? <Message message={item} /> : <Banner />}
          </Box>
        )}
      </Static>

      {isThinking && <Thinking label={activity ?? undefined} />}

      <Prompt
        key={`prompt-${promptVersion}`}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        busy={isThinking}
        suggestions={isThinking ? [] : suggestions}
      />
    </Box>
  );
}
