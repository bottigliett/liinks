import { ClientStyle } from "./types";

export function getCardBoxStyle(
  s: ClientStyle,
  widget?: { bgColor?: string; textColor?: string },
): React.CSSProperties {
  const bg = widget?.bgColor || s.widgetBgColor;
  const radius = getBorderRadiusValue(s.borderRadius);

  switch (s.cardStyle) {
    case "flat":
      return {
        backgroundColor: bg,
        border: `1px solid ${s.widgetBorderColor}`,
        borderRadius: radius,
      };
    case "shadow":
      return {
        backgroundColor: bg,
        border: `1px solid ${s.widgetBorderColor}`,
        borderRadius: radius,
        boxShadow: `0 2px 0px ${s.widgetBorderColor}`,
      };
    case "outline":
      return {
        backgroundColor: bg,
        border: `2px solid #000`,
        borderRadius: radius,
      };
    case "brutal":
      return {
        backgroundColor: bg,
        border: `2px solid #000`,
        borderRadius: 0,
        boxShadow: `4px 4px 0px #000`,
      };
    default:
      return {
        backgroundColor: bg,
        border: `1px solid ${s.widgetBorderColor}`,
        borderRadius: radius,
        boxShadow: `0 2px 0px ${s.widgetBorderColor}`,
      };
  }
}

function getBorderRadiusValue(br: ClientStyle["borderRadius"]): number {
  const map: Record<string, number> = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, "2xl": 20, full: 9999 };
  return map[br] ?? 20;
}
