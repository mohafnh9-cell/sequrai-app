export const BRAND = {
  name: "SequrAI",
  positioning:
    "Know if your AI-built application is ready for production before you deploy.",
} as const;

export const NAV_LINKS = [
  { href: "#product", label: "Product", labelKey: "product" },
  { href: "#how-it-works", label: "How it works", labelKey: "howItWorks" },
  { href: "#pricing", label: "Pricing", labelKey: "pricing" },
] as const;

export const HERO = {
  eyebrow: "For Cursor, Claude Code, and AI builders",
  headline: "Know if your AI-built app is ready for production before you deploy.",
  subline:
    "Connect GitHub. Every push is reviewed automatically. You get a Production Verdict and clear Recommendations.",
  ctaPrimary: "Connect your repository",
  ctaSecondary: "See how it works",
  footnote: "Private beta · First verdict in minutes",
} as const;

export const V1_FEATURES = [
  "Production Verdict",
  "Continuous Reviews",
  "Recommendations",
  "Production Verdict History",
] as const;

export const PRODUCT_FLOW = [
  {
    word: "Connect",
    line: "Link your GitHub repository.",
  },
  {
    word: "Push",
    line: "SequrAI runs a Continuous Review on every code change.",
  },
  {
    word: "Verdict",
    line: "See your Production Verdict — ready or not.",
  },
  {
    word: "Deploy",
    line: "Follow Recommendations, then ship with confidence.",
  },
] as const;

/** Static preview — matches Builder Edition V1 dashboard patterns */
export const PREVIEW = {
  verdictStatus: "Almost Ready",
  score: 64,
  verdictSummary: "Fix 3 issues before you deploy to production.",
  continuousReviews: {
    state: "Up to date",
    lastReview: "2m ago",
  },
  recommendations: [
    { rank: 1, title: "Remove service role key from client bundle" },
    { rank: 2, title: "Add auth guard to admin API route" },
    { rank: 3, title: "Restrict CORS to production domains" },
  ],
} as const;

export const PLANS = [
  {
    name: "Builder Edition",
    phase: "Private Beta",
    price: "29",
    positioning: "For indie hackers and AI builders shipping every week.",
    features: [
      "Production Verdict",
      "Continuous Reviews",
      "Recommendations",
      "Production Verdict History",
      "GitHub repository connection",
    ],
    highlighted: true,
  },
  {
    name: "Builder Edition",
    phase: "Public Beta",
    price: "49",
    positioning: "Same product. Opens after private beta.",
    features: [
      "Production Verdict",
      "Continuous Reviews",
      "Recommendations",
      "Production Verdict History",
      "GitHub repository connection",
    ],
    highlighted: false,
  },
] as const;

export const FINAL_CTA = {
  headline: "Get your Production Verdict",
  subline: "Connect your repository. SequrAI reviews every push automatically.",
  button: "Connect your repository",
} as const;
