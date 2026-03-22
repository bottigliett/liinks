// Brand images available for widget icons
export const BRAND_IMAGES = [
  { value: "/brands/google.png", label: "Google" },
  { value: "/brands/instagram.png", label: "Instagram" },
  { value: "/brands/linkedin.png", label: "LinkedIn" },
  { value: "/brands/logo_tecnocasa_base.png", label: "Tecnocasa" },
  { value: "/brands/logo_tecnorete_base.png", label: "Tecnorete" },
  { value: "/brands/logo-industriale.png", label: "Industriale" },
  { value: "/brands/contatti.svg", label: "Contatti" },
] as const;

// Pre-built templates for new client creation
export interface ClientTemplate {
  name: string;
  description: string;
  defaultAvatar?: string;
  widgets: {
    type: "link" | "social" | "text" | "map";
    title?: string;
    url?: string;
    size: "small" | "medium" | "wide" | "large";
    icon?: string;
    brandImage?: string;
    bgColor?: string;
    textColor?: string;
    platform?: string;
    username?: string;
    lat?: number;
    lng?: number;
    mapLabel?: string;
  }[];
}

export const CLIENT_TEMPLATES: ClientTemplate[] = [
  {
    name: "Tecnocasa",
    description: "Template per agenzie Tecnocasa con vCard, mappa, Instagram, sito e Google Review",
    defaultAvatar: "/brands/logo_tecnocasa_round.png",
    widgets: [
      {
        type: "link",
        title: "Salva contatto",
        url: "",
        size: "small",
        brandImage: "/brands/contatti.svg",
      },
      {
        type: "map",
        size: "small",
        lat: 45.0,
        lng: 10.0,
        mapLabel: "La nostra sede",
      },
      {
        type: "link",
        title: "Seguici su Instagram",
        url: "",
        size: "wide",
        brandImage: "/brands/instagram.png",
      },
      {
        type: "link",
        title: "Trova la tua nuova casa",
        url: "",
        size: "wide",
        brandImage: "/brands/logo_tecnocasa_base.png",
      },
      {
        type: "link",
        title: "Lascia una recensione",
        url: "",
        size: "wide",
        brandImage: "/brands/google.png",
      },
    ],
  },
  {
    name: "Tecnorete",
    description: "Template per agenzie Tecnorete con vCard, mappa, Instagram, sito e Google Review",
    defaultAvatar: "/brands/logo_tecnorete_round.png",
    widgets: [
      {
        type: "link",
        title: "Salva contatto",
        url: "",
        size: "small",
        brandImage: "/brands/contatti.svg",
      },
      {
        type: "map",
        size: "small",
        lat: 45.0,
        lng: 10.0,
        mapLabel: "La nostra sede",
      },
      {
        type: "link",
        title: "Seguici su Instagram",
        url: "",
        size: "wide",
        brandImage: "/brands/instagram.png",
      },
      {
        type: "link",
        title: "Trova la tua nuova casa",
        url: "",
        size: "wide",
        brandImage: "/brands/logo_tecnorete_base.png",
      },
      {
        type: "link",
        title: "Lascia una recensione",
        url: "",
        size: "wide",
        brandImage: "/brands/google.png",
      },
    ],
  },
  {
    name: "Industriale",
    description: "Template per agenzie Industriale con vCard, mappa, Instagram, sito e Google Review",
    widgets: [
      {
        type: "link",
        title: "Salva contatto",
        url: "",
        size: "small",
        brandImage: "/brands/contatti.svg",
      },
      {
        type: "map",
        size: "small",
        lat: 45.0,
        lng: 10.0,
        mapLabel: "La nostra sede",
      },
      {
        type: "link",
        title: "Seguici su Instagram",
        url: "",
        size: "wide",
        brandImage: "/brands/instagram.png",
      },
      {
        type: "link",
        title: "Scopri i nostri immobili",
        url: "",
        size: "wide",
        brandImage: "/brands/logo-industriale.png",
      },
      {
        type: "link",
        title: "Lascia una recensione",
        url: "",
        size: "wide",
        brandImage: "/brands/google.png",
      },
    ],
  },
];
