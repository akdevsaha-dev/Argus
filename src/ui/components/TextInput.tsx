import React, { useEffect, useState } from "react";
import { Text, useInput } from "ink";
import { theme } from "../theme.js";

interface Props {
  value: string;
  placeholder?: string;
  focus?: boolean;
  showCursor?: boolean;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export default function TextInput({
  value,
  placeholder = "",
  focus = true,
  showCursor = true,
  onChange,
  onSubmit,
}: Props) {
  const [cursorOffset, setCursorOffset] = useState(value.length);

  useEffect(() => {
    setCursorOffset((offset) => Math.min(offset, value.length));
  }, [value]);

  useInput(
    (input, key) => {
      if (
        key.upArrow ||
        key.downArrow ||
        key.escape ||
        key.tab ||
        (key.shift && key.tab) ||
        (key.ctrl && input === "c")
      ) {
        return;
      }

      if (key.return) {
        onSubmit?.(value);
        return;
      }

      // Cursor sends Cmd+Backspace as Ctrl+U. Kitty may report Cmd directly.
      const deleteToStart =
        (key.ctrl && input === "u") || (key.super && (key.backspace || key.delete));

      if (deleteToStart) {
        const next = value.slice(cursorOffset);
        setCursorOffset(0);
        if (next !== value) onChange(next);
        return;
      }

      let nextCursor = cursorOffset;
      let nextValue = value;

      if (key.leftArrow) {
        nextCursor = Math.max(0, cursorOffset - 1);
      } else if (key.rightArrow) {
        nextCursor = Math.min(value.length, cursorOffset + 1);
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          nextValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
          nextCursor = cursorOffset - 1;
        }
      } else if (input && !key.ctrl && !key.meta && !key.super) {
        nextValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
        nextCursor = cursorOffset + input.length;
      } else {
        return;
      }

      setCursorOffset(nextCursor);
      if (nextValue !== value) onChange(nextValue);
    },
    { isActive: focus },
  );

  if (value.length === 0) {
    const ghost = placeholder || " ";
    return showCursor && focus ? (
      <Text>
        <Text inverse>{ghost[0]}</Text>
        <Text color={theme.subtle}>{ghost.slice(1)}</Text>
      </Text>
    ) : (
      <Text color={theme.subtle}>{placeholder}</Text>
    );
  }

  const before = value.slice(0, cursorOffset);
  const current = value[cursorOffset];
  const after = value.slice(cursorOffset + (current ? 1 : 0));

  return (
    <Text>
      {before}
      {showCursor && focus ? <Text inverse>{current ?? " "}</Text> : current}
      {after}
    </Text>
  );
}
