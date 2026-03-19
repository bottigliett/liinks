export type WidgetType = "link" | "social" | "text" | "map";

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "x"
  | "facebook"
  | "linkedin"
  | "github"
  | "spotify"
  | "website";

export interface Widget {
  id: string;
  type: WidgetType;
  order: number;
  size: "small" | "medium" | "wide" | "large";
  rowSpan?: number; // custom row span override (default based on size)
  // Styling per widget
  bgColor?: string;
  textColor?: string;
  icon?: string;
  brandImage?: string; // path to brand image (e.g. /brands/google.png)
  // Link widget
  title?: string;
  url?: string;
  description?: string;
  // Social widget
  platform?: SocialPlatform;
  username?: string;
  // Text widget
  content?: string;
  // Map widget
  lat?: number;
  lng?: number;
  mapLabel?: string;
}

export type LayoutAlignment = "center" | "left";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface ClientStyle {
  bgColor: string;
  textColor: string;
  subtextColor: string;
  widgetBgColor: string;
  widgetBorderColor: string;
  widgetTextColor: string;
  borderRadius: BorderRadius;
  alignment: LayoutAlignment;
  showAvatar: boolean;
  avatarStyle: "circle" | "rounded" | "square";
  gridGap: "tight" | "normal" | "loose";
  rowHeight: number;
  iconBorderRadius: number;
}

export const DEFAULT_STYLE: ClientStyle = {
  bgColor: "#ffffff",
  textColor: "#18181b",
  subtextColor: "#71717a",
  widgetBgColor: "#ffffff",
  widgetBorderColor: "#e4e4e7",
  widgetTextColor: "#18181b",
  borderRadius: "2xl",
  alignment: "left",
  showAvatar: true,
  avatarStyle: "circle",
  gridGap: "normal",
  rowHeight: 140,
  iconBorderRadius: 17,
};

export interface Client {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  accentColor: string;
  style: ClientStyle;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  clients: Client[];
}
