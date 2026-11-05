import React from "react";
import { Box, Text } from "ink";
import GradientText from "./GradientText.js";
import { theme } from "../theme.js";
import { terminalContext } from "../../lib/terminal-context.js";

const LOGO = ["▄▀█ █▀█ █▀▀ █ █ █▀", "█▀█ █▀▄ █▄█ █▄█ ▄█"];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Box width={9}>
        <Text color={theme.subtle}>{label}</Text>
      </Box>
      <Text color={theme.muted}>{value}</Text>
    </Box>
  );
}

export default function Banner() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="round"
        borderColor={theme.border}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignSelf="flex-start"
      >
        <Box>
          <Box flexDirection="column" marginRight={4}>
            {LOGO.map((line) => (
              <GradientText key={line} span={LOGO[0]!.length}>
                {line}
              </GradientText>
            ))}
          </Box>
          <Box flexDirection="column">
            <Text>
              <Text bold color={theme.text}>
                Argus
              </Text>
              <Text color={theme.subtle}> v{terminalContext.version}</Text>
            </Text>
            <Text color={theme.muted}>AI coding agent for your terminal</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Row label="cwd" value={terminalContext.cwd} />
          {terminalContext.branch && <Row label="branch" value={terminalContext.branch} />}
        </Box>
      </Box>

      <Box paddingLeft={1} marginTop={1}>
        <Text color={theme.subtle}>
          Describe a task to get started. Type{" "}
          <Text color={theme.accent}>/help</Text> for commands.
        </Text>
      </Box>
    </Box>
  );
}
