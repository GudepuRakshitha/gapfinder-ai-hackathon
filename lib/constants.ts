import type {
  Difficulty,
  MaterialSourceType,
  QuizDifficulty,
  StrengthStatus,
} from "@/backend/types";

export const APP_NAME = "GapFinder AI";
export const APP_TAGLINE = "Find What You Don't Know. Learn What Matters.";
export const APP_DESCRIPTION =
  "GapFinder AI diagnoses knowledge gaps from your own syllabus, notes and past papers, then builds a revision plan that actually targets them.";

export const DEMO_CREDENTIALS = {
  email: "demo@gapfinder.ai",
  password: "GapFinder2026!",
  name: "Aditi Sharma",
} as const;

export const DEMO_STUDENT_ID = "9b2f5e2e-6c2f-5f0e-9f4a-2a1b3c4d5e6f";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "10 MB";
export const MAX_FILES_PER_UPLOAD = 5;
export const ACCEPTED_FILE_EXTENSIONS = ["pdf", "docx", "txt"] as const;
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const QUIZ_MIN_QUESTIONS = 3;
export const QUIZ_MAX_QUESTIONS = 10;
export const QUIZ_DEFAULT_QUESTIONS = 5;
export const QUIZ_SECONDS_PER_QUESTION = 90;

export const PLAN_MIN_DAYS = 1;
export const PLAN_MAX_DAYS = 60;
export const PLAN_MIN_HOURS = 0.5;
export const PLAN_MAX_HOURS = 12;

export const STRENGTH_THRESHOLDS = {
  medium: 50,
  strong: 75,
} as const;

export const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Your learning overview",
    icon: "LayoutDashboard",
    group: "Learn",
  },
  {
    href: "/materials",
    label: "Study Materials",
    description: "Upload and process documents",
    icon: "FileText",
    group: "Learn",
  },
  {
    href: "/topics",
    label: "Topic Map",
    description: "Your syllabus, mapped",
    icon: "Layers",
    group: "Learn",
  },
  {
    href: "/quiz",
    label: "Diagnostic Quiz",
    description: "Test what you really know",
    icon: "ClipboardCheck",
    group: "Learn",
  },
  {
    href: "/gap-analysis",
    label: "Gap Analysis",
    description: "Where you're losing marks",
    icon: "ScanSearch",
    group: "Insights",
  },
  {
    href: "/revision-plan",
    label: "Revision Plan",
    description: "Your personalized schedule",
    icon: "CalendarCheck",
    group: "Insights",
  },
  {
    href: "/progress",
    label: "Progress",
    description: "Track mastery over time",
    icon: "TrendingUp",
    group: "Insights",
  },
  {
    href: "/tutor",
    label: "AI Tutor",
    description: "Ask your own materials",
    icon: "MessageCircleQuestion",
    group: "Insights",
  },
] as const;

export const PAGE_META: Record<
  string,
  { title: string; subtitle: string }
> = {
  "/dashboard": {
    title: "Learning dashboard",
    subtitle: "A live view of your mastery, gaps and next best actions.",
  },
  "/materials": {
    title: "Study materials",
    subtitle: "Upload the syllabus, notes and past papers you want to learn from.",
  },
  "/topics": {
    title: "Topic map",
    subtitle: "Every topic found in your materials, with source references.",
  },
  "/quiz": {
    title: "Diagnostic quiz",
    subtitle: "Questions grounded in your own uploaded content.",
  },
  "/gap-analysis": {
    title: "Knowledge gap analysis",
    subtitle: "Topic-level diagnosis built from your actual quiz performance.",
  },
  "/revision-plan": {
    title: "Personalized revision plan",
    subtitle: "A schedule that prioritizes weak and high-importance topics.",
  },
  "/progress": {
    title: "Progress tracker",
    subtitle: "See mastery move over time, topic by topic.",
  },
  "/tutor": {
    title: "AI tutor",
    subtitle: "Answers grounded in your uploaded material, with citations.",
  },
  "/login": {
    title: "Welcome back",
    subtitle: "Sign in to continue closing your knowledge gaps.",
  },
};

export const SOURCE_TYPE_OPTIONS: {
  value: MaterialSourceType;
  label: string;
  description: string;
}[] = [
  {
    value: "syllabus",
    label: "Syllabus / curriculum",
    description: "Defines the topics and subtopics you need to cover.",
  },
  {
    value: "textbook",
    label: "Textbook chapter",
    description: "Primary explanatory content used for grounding.",
  },
  {
    value: "notes",
    label: "Class notes",
    description: "Your own notes, summaries or handouts.",
  },
  {
    value: "past_paper",
    label: "Past exam paper",
    description: "Used to calculate topic-wise exam frequency.",
  },
  {
    value: "other",
    label: "Other material",
    description: "Any other supporting document.",
  },
];

export const SOURCE_TYPE_LABELS: Record<MaterialSourceType, string> = {
  syllabus: "Syllabus",
  textbook: "Textbook",
  notes: "Notes",
  past_paper: "Past paper",
  other: "Other",
};

export const DIFFICULTY_OPTIONS: {
  value: QuizDifficulty;
  label: string;
  description: string;
}[] = [
  {
    value: "mixed",
    label: "Mixed",
    description: "A balanced diagnostic across difficulties.",
  },
  { value: "easy", label: "Easy", description: "Recall and definitions." },
  {
    value: "medium",
    label: "Medium",
    description: "Understanding and application.",
  },
  { value: "hard", label: "Hard", description: "Analysis and multi-step reasoning." },
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const STATUS_META: Record<
  StrengthStatus,
  { label: string; description: string; color: string; dot: string }
> = {
  weak: {
    label: "Weak",
    description: "0–49% mastery",
    color:
      "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  medium: {
    label: "Medium",
    description: "50–74% mastery",
    color:
      "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  strong: {
    label: "Strong",
    description: "75–100% mastery",
    color:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  not_assessed: {
    label: "Not assessed",
    description: "Take a quiz to diagnose",
    color:
      "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
};

export const CHART_COLORS = {
  weak: "#ef4444",
  medium: "#f59e0b",
  strong: "#10b981",
  notAssessed: "#cbd5e1",
  primary: "#6d4aff",
  primaryLight: "#a78bfa",
  blue: "#3b82f6",
  lavender: "#ede9fe",
} as const;

export const GRADIENT_STOPS = [
  { offset: "0%", color: "#6d4aff", opacity: 0.9 },
  { offset: "100%", color: "#3b82f6", opacity: 0.7 },
] as const;

export const LOCAL_STORAGE_KEYS = {
  lastTopic: "gapfinder:last-topic",
} as const;
