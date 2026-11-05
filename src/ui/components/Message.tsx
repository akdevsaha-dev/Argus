import React from "react";
import { Box, Text } from "ink";
import GradientText from "./GradientText.js";
import { theme } from "../theme.js";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  /** Response time in ms, shown under assistant messages. */
  durationMs?: number;
}

const formatDuration = (ms: number) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

export default function Message({ message }: { message: ChatMessage }) {
  switch (message.role) {
    case "user":
      return (
        <Box
          borderStyle="bold"
          borderTop={false}
          borderRight={false}
          borderBottom={false}
          borderColor={theme.accent}
          paddingLeft={1}
          marginBottom={1}
        >
          <Text color={theme.text}>{message.content}</Text>
        </Box>
      );

    case "assistant":
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.accent}>◆ </Text>
            <GradientText bold>argus</GradientText>
          </Box>
          <Box paddingLeft={2}>
            <Text color={theme.text}>{message.content}</Text>
          </Box>
          {message.durationMs !== undefined && (
            <Box paddingLeft={2}>
              <Text color={theme.subtle}>
                <Text color={theme.success}>✓</Text> done in{" "}
                {formatDuration(message.durationMs)}
              </Text>
            </Box>
          )}
        </Box>
      );

    case "error":
      return (
        <Box marginBottom={1} paddingLeft={1}>
          <Text color={theme.danger}>✗ {message.content}</Text>
        </Box>
      );

    default:
      return (
        <Box marginBottom={1} paddingLeft={1}>
          <Text color={theme.subtle}>· {message.content}</Text>
        </Box>
      );
  }
}
