import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface Props {
  name: string;
  args: Record<string, unknown> | undefined;
}

/** The one line the user needs to judge the request: the command or the file. */
function describe(name: string, args: Props["args"]): string {
  if (name === "run_bash") return `$ ${String(args?.command ?? "")}`;
  if (name === "edit_file") return String(args?.filePath ?? "");
  return JSON.stringify(args ?? {});
}

export default function ConfirmTool({ name, args }: Props) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.warning}
      paddingX={1}
    >
      <Text>
        <Text color={theme.warning} bold>
          Allow {name}?
        </Text>
      </Text>
      <Text color={theme.text} wrap="truncate-end">
        {describe(name, args)}
      </Text>
      <Text color={theme.subtle}>
        <Text color={theme.success}>y</Text> allow{"  "}
        <Text color={theme.danger}>n</Text>/<Text color={theme.muted}>esc</Text> deny
      </Text>
    </Box>
  );
}
