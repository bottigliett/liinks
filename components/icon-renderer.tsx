"use client";

import * as TablerIcons from "@tabler/icons-react";
import { createElement } from "react";

const icons = TablerIcons as unknown as Record<string, any>;

// Pre-filter valid icon components (function or forwardRef with render)
const validIcons = new Set<string>();
for (const key of Object.keys(icons)) {
  const val = icons[key];
  if (typeof val === "function" || (val && typeof val.render === "function")) {
    validIcons.add(key);
  }
}

export function IconRenderer({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!validIcons.has(name)) return null;
  return createElement(icons[name], { className, style });
}
