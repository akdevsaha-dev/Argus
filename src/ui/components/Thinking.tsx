import React from "react";
import { Box, Text, useAnimation } from "ink";
import { gradientAt, brandStops, mix, theme } from "../theme.js";

const FRAMES = ["◐", "◓", "◑", "◒"];
const VERBS = ["Thinking", "Reading context", "Planning", "Reasoning"];

/** Text with a highlight that sweeps left to right. */
function Shimmer({ text, frame }: { text: string; frame: number }) {
  const chars = [...text];
  const head = frame % (chars.length + 8);

  return (
    <Text>
      {chars.map((ch, i) => {
        const glow = Math.max(0, 1 - Math.abs(i - head) / 3);
        return (
          <Text key={i} color={mix(theme.subtle, theme.text, glow)}>
            {ch}
          </Text>
        );
      })}
    </Text>
  );
}

export default function Thinking() {
  const { frame, time } = useAnimation({ interval: 80 });
  const seconds = Math.floor(time / 1000);
  const verb = VERBS[Math.floor(seconds / 3) % VERBS.length]!;
  const spinnerColor = gradientAt(brandStops, (Math.sin(time / 400) + 1) / 2);

  return (
    <Box marginBottom={1} paddingLeft={1}>
      <Text color={spinnerColor}>{FRAMES[Math.floor(frame / 2) % FRAMES.length]} </Text>
      <Shimmer text={`${verb}…`} frame={frame} />
      <Text color={theme.subtle}>
        {"  "}
        {seconds}s · <Text color={theme.muted}>esc</Text> to interrupt
      </Text>
    </Box>
  );
}
