import React, { useState } from "react";
import { Box, Text, Static, useInput, useApp } from "ink";
import TextInput from "ink-text-input";

export interface chatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export default function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<chatMessage[]>([
    {
      id: "init-1",
      role: "system",
      content: `Initialized in ${process.cwd()} — Type a task or /exit to quit.`,
    },
  ]);
  const [isThinking, setisThinking] = useState(false);
  useInput((inputKey, key) => {
    if (key.escape) {
      exit();
    }
  });

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed || isThinking) return;

    if (trimmed == "/exit") {
      exit();
      return;
    }

    const userMessage: chatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setisThinking(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Echoing task: "${trimmed}". Ready to wire up the LLM ReAct loop in Phase 2.`,
        },
      ]);
      setisThinking(false);
    }, 6000);
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* completed message flush to native terminal scrollback */}
      <Static items={messages}>
        {(msg) => (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Text
              bold
              color={
                msg.role === "user"
                  ? "cyan"
                  : msg.role === "assistant"
                    ? "green"
                    : "grey"
              }
            >
              {msg.role == "user"
                ? "❯ you"
                : msg.role == "assistant"
                  ? "❯ Agent"
                  : "'⚙ System'"}
            </Text>
            <Box paddingLeft={2}>
              <Text>{msg.content}</Text>
            </Box>
          </Box>
        )}
      </Static>
      {isThinking && (
        <Box marginBottom={1}>
          <Text color="yellow">⏳ Agent is reasoning...</Text>
        </Box>
      )}

      <Box
        borderStyle="round"
        borderColor={isThinking ? "gray" : "cyan"}
        paddingX={1}
      >
        <Box marginRight={1}>
          <Text color="cyan" bold>
            ❯
          </Text>
        </Box>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={
            isThinking
              ? "Waiting for agent..."
              : "Ask the agent to inspect or edit code..."
          }
        />
      </Box>
    </Box>
  );
}
