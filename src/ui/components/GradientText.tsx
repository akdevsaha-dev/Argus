import React from "react";
import { Text } from "ink";
import { brandStops, gradientAt } from "../theme.js";

interface Props {
  children: string;
  stops?: string[];
  bold?: boolean;
  /** Spread the gradient over this many columns instead of the text length. */
  span?: number;
}

export default function GradientText({
  children,
  stops = brandStops,
  bold,
  span,
}: Props) {
  const chars = [...children];
  const width = Math.max(1, (span ?? chars.length) - 1);

  return (
    <Text bold={bold}>
      {chars.map((ch, i) => (
        <Text key={i} color={gradientAt(stops, i / width)}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}
