"use client";

import * as TablerIcons from "@tabler/icons-react";

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

const icons = TablerIcons as unknown as Record<string, IconComponent>;

export function IconRenderer({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = icons[name];
  if (!Icon || typeof Icon !== "function") return null;
  return <Icon className={className} style={style} />;
}
