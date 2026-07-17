export const BRAND = {
  name: "SequrAI",
  slogan: "Think Ahead.",
  positioning: "SequrAI tells you when your AI-built application is ready to ship and the fastest path to get there.",
} as const;

export const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
] as const;

export const PRODUCT_FLOW = [
  {
    word: "Connect",
    line: "Link the repositories you want SequrAI to protect.",
  },
  {
    word: "Analyze",
    line: "Every push is reviewed against production and security risks.",
  },
  {
    word: "Improve",
    line: "SequrAI tells you what matters and prepares the fastest fix.",
  },
  {
    word: "Ship",
    line: "Deploy when your application is truly ready.",
  },
] as const;

export const WORKFLOW_STEPS = [
  "Push received",
  "Incremental analysis",
  "Risk evaluated",
  "Roadmap updated",
  "Ready to ship",
] as const;

/** Static preview data — faithful reconstruction of real dashboard UI patterns */
export const PREVIEW = {
  score: 64,
  projectedScore: 87,
  blockers: 3,
  estimatedMinutes: 12,
  roadmap: [
    { rank: 1, title: "Remove service role key from client bundle", delta: 8, minutes: 4 },
    { rank: 2, title: "Add auth guard to admin API route", delta: 9, minutes: 5 },
    { rank: 3, title: "Restrict CORS to production domains", delta: 6, minutes: 3 },
  ],
  timeline: [
    { title: "Production check completed", time: "2m ago" },
    { title: "Roadmap updated — 3 blockers", time: "2m ago" },
    { title: "Push received on main", time: "3m ago" },
  ],
  githubCheck: {
    repo: "mohafnh9-cell/sequrai-app",
    commit: "feat: production readiness",
    status: "SequrAI — 3 blockers found",
  },
} as const;

export const PLANS = [
  {
    name: "Builder",
    price: "49",
    positioning: "For individual developers.",
    features: [
      "5 projects",
      "50 scans per month",
      "AI fix prompts",
      "Production Ready Score",
      "14-day free trial",
    ],
    highlighted: false,
  },
  {
    name: "Studio",
    price: "99",
    positioning: "For agencies and teams with multiple projects.",
    features: [
      "20 projects",
      "200 scans per month",
      "Full AI Fix Center",
      "GitHub automation",
      "14-day free trial",
    ],
    highlighted: true,
  },
] as const;

export const PRODUCT_LABELS = ["One score.", "Clear priorities.", "Every push reviewed."] as const;
