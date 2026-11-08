import React from "react";
import { Box, Text } from "ink";
import TextInput from "./TextInput.js";
import { theme } from "../theme.js";
import { terminalContext } from "../../lib/terminal-context.js";

export interface Command {
  name: string;
  description: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  busy: boolean;
  suggestions: Command[];
}

export default function Prompt({
  value,
  onChange,
  onSubmit,
  busy,
  suggestions,
}: Props) {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={busy ? theme.border : theme.accent}
        paddingX={1}
      >
        <Box flexShrink={0}>
          <Text color={busy ? theme.subtle : theme.accent} bold>
            {"› "}
          </Text>
        </Box>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          focus={!busy}
          showCursor={!busy}
          placeholder={
            busy ? "Argus is working…" : "Ask Argus to inspect, explain, or edit code"
          }
        />
      </Box>

      {suggestions.length > 0 ? (
        <Box flexDirection="column" paddingX={2}>
          {suggestions.map((cmd, i) => (
            <Box key={cmd.name}>
              <Box width={10}>
                <Text color={i === 0 ? theme.accent : theme.muted} bold={i === 0}>
                  {cmd.name}
                </Text>
              </Box>
              <Text color={theme.subtle}>{cmd.description}</Text>
            </Box>
          ))}
          <Text color={theme.border}>tab to complete</Text>
        </Box>
      ) : (
        <Box paddingX={2} justifyContent="space-between" gap={2}>
          <Text color={theme.subtle} wrap="truncate-end">
            {busy ? (
              <>
                <Text color={theme.muted}>esc</Text> interrupt
              </>
            ) : (
              <>
                <Text color={theme.muted}>↵</Text> send{"  "}
                <Text color={theme.muted}>/</Text> commands{"  "}
                <Text color={theme.muted}>⌘⌫</Text> clear{"  "}
                <Text color={theme.muted}>esc</Text> quit
              </>
            )}
          </Text>
          <Box flexShrink={0}>
            <Text color={theme.subtle}>
              <Text color={busy ? theme.warning : theme.success}>●</Text>{" "}
              {busy ? "working" : "ready"}
              {terminalContext.branch && <Text color={theme.border}>{"  │  "}</Text>}
              {terminalContext.branch && `⎇ ${terminalContext.branch}`}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
