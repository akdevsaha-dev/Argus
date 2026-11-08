import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Text,
  useApp,
  useBoxMetrics,
  useInput,
  useWindowSize,
  type DOMElement,
} from "ink";
import { resetHistory, runAgent } from "../agent/agent.js";
import Banner from "./components/Banner.js";
import Message, { type ChatMessage } from "./components/Message.js";
import Thinking from "./components/Thinking.js";
import Prompt, { type Command } from "./components/Prompt.js";
import ConfirmTool from "./components/ConfirmTool.js";
import { theme } from "./theme.js";

const COMMANDS: Command[] = [
  { name: "/help", description: "Show available commands" },
  { name: "/clear", description: "Clear the conversation" },
  { name: "/exit", description: "Quit Argus" },
  {
    name: "/reset",
    description: "Clear conversation history and start a fresh session.",
  },
];

interface PendingConfirm {
  name: string;
  args: Record<string, unknown> | undefined;
  resolve: (approved: boolean) => void;
}

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
  const { rows } = useWindowSize();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  // Rows scrolled up from the bottom of the transcript; 0 follows new output.
  const [scrollBack, setScrollBack] = useState(0);
  const [promptVersion, setPromptVersion] = useState(0);
  // A tool call waiting for the user to allow or deny it.
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const nextMessageId = useRef(0);
  const inputRef = useRef(input);
  const thinkingRef = useRef(isThinking);
  inputRef.current = input;
  thinkingRef.current = isThinking;
  const pendingConfirmRef = useRef(pendingConfirm);
  pendingConfirmRef.current = pendingConfirm;

  const viewportRef = useRef<DOMElement>(null);
  const contentRef = useRef<DOMElement>(null);
  const viewport = useBoxMetrics(viewportRef);
  const content = useBoxMetrics(contentRef);
  const maxScroll = Math.max(0, content.height - viewport.height);
  // Before the first message, pin the welcome banner to the top.
  const clampedScrollBack =
    messages.length === 0 ? maxScroll : Math.min(scrollBack, maxScroll);

  // Jump back to the latest output whenever something new is added.
  useEffect(() => setScrollBack(0), [messages.length]);

  function scrollBy(delta: number) {
    setScrollBack((current) =>
      Math.max(0, Math.min(maxScroll, Math.min(current, maxScroll) + delta)),
    );
  }

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

  function answerConfirm(approved: boolean) {
    const pending = pendingConfirmRef.current;
    if (!pending) return;
    pendingConfirmRef.current = null;
    setPendingConfirm(null);
    addMessage("system", `${approved ? "Allowed" : "Denied"} ${pending.name}.`);
    pending.resolve(approved);
  }

  function interrupt() {
    // Settle any open prompt so the agent loop isn't left awaiting forever.
    pendingConfirmRef.current?.resolve(false);
    pendingConfirmRef.current = null;
    setPendingConfirm(null);
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsThinking(false);
    setActivity(null);
    addMessage("system", "Interrupted.");
  }

  function clearScreen() {
    setMessages([]);
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
        (name, args) =>
          new Promise<boolean>((resolve) => {
            setActivity(null);
            setPendingConfirm({ name, args, resolve });
          }),
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

  useInput((char, key) => {
    if (pendingConfirmRef.current) {
      const answer = char.toLowerCase();
      if (answer === "y") answerConfirm(true);
      else if (answer === "n" || key.escape) answerConfirm(false);
      return;
    }

    if (key.escape) {
      if (thinkingRef.current) interrupt();
      else if (inputRef.current) setInput("");
      else exit();
      return;
    }

    const page = Math.max(1, viewport.height - 2);
    if (key.pageUp) return scrollBy(page);
    if (key.pageDown) return scrollBy(-page);
    if (key.upArrow) return scrollBy(1);
    if (key.downArrow) return scrollBy(-1);

    const firstSuggestion = suggestions[0];
    if (key.tab && firstSuggestion) {
      setInput(firstSuggestion.name);
      setPromptVersion((version) => version + 1);
    }
  });

  return (
    <Box flexDirection="column" height={rows} paddingX={1}>
      <Box
        ref={viewportRef}
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        overflow="hidden"
        contentOffsetY={maxScroll - clampedScrollBack}
      >
        <Box ref={contentRef} flexDirection="column" flexShrink={0}>
          <Banner />
          {messages.map((message) => (
            <Box key={message.id} paddingX={1}>
              <Message message={message} />
            </Box>
          ))}
        </Box>
      </Box>

      {messages.length > 0 && clampedScrollBack > 0 && (
        <Box justifyContent="center" flexShrink={0}>
          <Text color={theme.subtle}>
            ↓ {clampedScrollBack} more line{clampedScrollBack === 1 ? "" : "s"}{" "}
            · pgdn to jump down
          </Text>
        </Box>
      )}

      {isThinking && !pendingConfirm && (
        <Box flexShrink={0}>
          <Thinking label={activity ?? undefined} />
        </Box>
      )}

      <Box flexShrink={0} flexDirection="column">
        {pendingConfirm ? (
          <ConfirmTool name={pendingConfirm.name} args={pendingConfirm.args} />
        ) : (
          <Prompt
            key={`prompt-${promptVersion}`}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            busy={isThinking}
            suggestions={isThinking ? [] : suggestions}
          />
        )}
      </Box>
    </Box>
  );
}
