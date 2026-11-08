import React from "react";
import { Box, Text, useWindowSize } from "ink";
import GradientText from "./GradientText.js";
import { theme } from "../theme.js";
import { terminalContext } from "../../lib/terminal-context.js";
import { MODEL } from "../../agent/agent.js";

const LOGO = ["▄▀█ █▀█ █▀▀ █ █ █▀", "█▀█ █▀▄ █▄█ █▄█ ▄█"];

// Below this many columns the block logo no longer fits beside the title.
const LOGO_MIN_COLUMNS = 64;
const MAX_WIDTH = 72;
// Short terminals drop the breathing room so the whole banner stays visible.
const COMPACT_MAX_ROWS = 24;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Box width={9} flexShrink={0}>
        <Text color={theme.subtle}>{label}</Text>
      </Box>
      <Text color={theme.muted} wrap="truncate-start">
        {value}
      </Text>
    </Box>
  );
}

export default function Banner() {
  const { columns, rows } = useWindowSize();
  const showLogo = columns >= LOGO_MIN_COLUMNS;
  const space = rows < COMPACT_MAX_ROWS ? 0 : 1;

  return (
    <Box flexDirection="column" marginBottom={space}>
      <Box
        borderStyle="round"
        borderColor={theme.border}
        paddingX={2}
        flexDirection="column"
        width={Math.min(MAX_WIDTH, columns - 2)}
      >
        <Box marginTop={space}>
          {showLogo && (
            <Box flexDirection="column" marginRight={4} flexShrink={0}>
              {LOGO.map((line) => (
                <GradientText key={line} span={LOGO[0]!.length}>
                  {line}
                </GradientText>
              ))}
            </Box>
          )}
          <Box flexDirection="column">
            <Text>
              <Text bold color={theme.text}>
                Argus
              </Text>
              <Text color={theme.subtle}> v{terminalContext.version}</Text>
            </Text>
            <Text color={theme.muted} wrap="truncate-end">
              AI coding agent for your terminal
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginTop={1} marginBottom={space}>
          <Row label="model" value={MODEL} />
          <Row label="cwd" value={terminalContext.cwd} />
          {terminalContext.branch && <Row label="branch" value={terminalContext.branch} />}
        </Box>
      </Box>

      <Box paddingLeft={1} marginTop={space}>
        <Text color={theme.subtle}>
          Describe a task to get started. Type{" "}
          <Text color={theme.accent}>/help</Text> for commands.
        </Text>
      </Box>
    </Box>
  );
}
