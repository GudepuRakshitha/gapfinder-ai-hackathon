/**
 * Shared domain types for GapFinder AI.
 *
 * These types are used by the backend services, API route handlers and the
 * frontend. Keep this file free of runtime imports so it can be safely used
 * from both server and client components.
 */

export type StorageMode = "supabase" | "local";
export type AuthMode = StorageMode;

export type FileType = "pdf" | "docx" | "txt";

export type MaterialSourceType =
  | "syllabus"
  | "textbook"
  | "notes"
  | "past_paper"
  | "other";

export type MaterialStatus = "processing" | "ready" | "failed";

export type Difficulty = "easy" | "medium" | "hard";
export type QuizDifficulty = Difficulty | "mixed";

export type StrengthStatus = "weak" | "medium" | "strong" | "not_assessed";

export type AIEngine =
  | "groq"
  | "extractive"
  | "rule_based"
  | "retrieval_only"
  | "mixed";

export type PlanPriority = "high" | "medium" | "low";

export type RevisionTaskType = "learn" | "practice" | "review" | "test";

/* -------------------------------------------------------------------------- */
/* Core entities                                                              */
/* -------------------------------------------------------------------------- */

export interface Student {
  id: string;
  email: string;
  fullName: string;
  isDemo: boolean;
  demoSeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialSummary {
  id: string;
  studentId: string;
  name: string;
  fileType: FileType;
  sizeBytes: number;
  wordCount: number;
  charCount: number;
  pageCount: number;
  sourceType: MaterialSourceType;
  status: MaterialStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material extends MaterialSummary {
  extractedText: string;
}

export interface DocumentChunk {
  id: string;
  materialId: string;
  studentId: string;
  chunkIndex: number;
  content: string;
  page: number | null;
  section: string | null;
  sourceType: MaterialSourceType;
  materialName: string;
  wordCount: number;
  createdAt: string;
}

export interface Citation {
  materialId: string;
  materialName: string;
  chunkId?: string;
  page?: number | null;
  section?: string | null;
  sourceType?: MaterialSourceType;
  excerpt?: string;
}

export interface PastPaperMatch {
  question: string;
  materialId: string;
  materialName: string;
  year?: number | null;
}

export interface Subject {
  id: string;
  studentId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  name: string;
  description: string;
  subtopics: string[];
  importance: number; // 1-5, derived from syllabus presence + exam frequency
  examFrequency: number; // number of matching past-paper questions
  pastPaperQuestions: PastPaperMatch[];
  materialIds: string[];
  citations: Citation[];
  aiEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  studentId: string;
  attemptId: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: Difficulty;
  citations: Citation[];
  sourceChunkIds: string[];
  engine: AIEngine;
  createdAt: string;
}

export type PublicQuestion = Omit<
  Question,
  "correctOptionIndex" | "explanation" | "citations" | "sourceChunkIds" | "studentId"
>;

export type QuizAttemptStatus = "generated" | "submitted";

export interface QuizAttempt {
  id: string;
  studentId: string;
  title: string;
  mode: "topic" | "mixed";
  topicIds: string[];
  questionIds: string[];
  status: QuizAttemptStatus;
  engine: AIEngine;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  studentId: string;
  topicId: string;
  topicName: string;
  difficulty: Difficulty;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  explanation: string;
  feedback: string;
  createdAt: string;
}

export interface TopicMastery {
  id: string;
  studentId: string;
  topicId: string;
  topicName: string;
  attempted: number;
  correct: number;
  incorrect: number;
  mastery: number;
  status: StrengthStatus;
  weaknessReason: string;
  recommendedAction: string;
  lastAttemptedAt: string | null;
  updatedAt: string;
}

export interface RevisionTask {
  id: string;
  planId: string;
  studentId: string;
  dayIndex: number;
  scheduledDate: string; // YYYY-MM-DD
  topicId: string | null;
  topicName: string;
  subjectName: string;
  title: string;
  durationMinutes: number;
  objectives: string[];
  priority: PlanPriority;
  taskType: RevisionTaskType;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
}

export interface RevisionPlan {
  id: string;
  studentId: string;
  examDate: string | null;
  daysAvailable: number;
  hoursPerDay: number;
  summary: string;
  totalTasks: number;
  totalMinutes: number;
  aiEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
  tasks: RevisionTask[];
}

export interface ChatMessage {
  id: string;
  studentId: string;
  topicId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  engine: AIEngine;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Analysis                                                                   */
/* -------------------------------------------------------------------------- */

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  subjectName: string;
  attempted: number;
  correct: number;
  incorrect: number;
  mastery: number;
  status: StrengthStatus;
  importance: number;
  examFrequency: number;
  subtopics: string[];
  citations: Citation[];
  weaknessReason: string;
  recommendedAction: string;
  lastAttemptedAt: string | null;
}

export interface IncorrectConcept {
  topicId: string;
  topicName: string;
  topicMastery: number;
  missedCount: number;
  totalCount: number;
  examples: {
    question: string;
    explanation: string;
    difficulty: Difficulty;
    citation: Citation | null;
  }[];
}

export interface LearningInsight {
  summary: string;
  patterns: string[];
  recommendations: string[];
  engine: "groq" | "rule_based";
  generatedAt: string;
}

export interface GapAnalysis {
  generatedAt: string;
  overallMastery: number;
  totalTopics: number;
  assessedTopics: number;
  distribution: {
    weak: number;
    medium: number;
    strong: number;
    notAssessed: number;
  };
  topics: TopicPerformance[];
  frequentlyIncorrectConcepts: IncorrectConcept[];
  insight: LearningInsight;
  aiEnhanced: boolean;
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

export interface AttemptTopicBreakdown {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  percentage: number;
  status: StrengthStatus;
}

export interface AttemptSummary {
  id: string;
  title: string;
  status: QuizAttemptStatus;
  engine: AIEngine;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  topics: AttemptTopicBreakdown[];
}

export interface MasteryTrendPoint {
  date: string;
  label: string;
  mastery: number;
  quizScore: number;
  attemptId: string;
}

export interface DailyActivity {
  date: string;
  label: string;
  minutes: number;
  questions: number;
  quizzes: number;
  tasksCompleted: number;
}

export interface TopicImprovement {
  topicId: string;
  topicName: string;
  firstScore: number;
  latestScore: number;
  delta: number;
  attempts: number;
  status: StrengthStatus;
}

export interface DashboardStats {
  overallMastery: number;
  topicsAnalyzed: number;
  knowledgeGaps: number;
  studyMinutes: number;
  totalQuestionsAnswered: number;
  quizzesTaken: number;
  materialsCount: number;
  chunkCount: number;
  currentStreak: number;
}

export interface ProgressData {
  stats: DashboardStats;
  attempts: AttemptSummary[];
  masteryTrend: MasteryTrendPoint[];
  activity: DailyActivity[];
  topicImprovements: TopicImprovement[];
  todayTasks: RevisionTask[];
  latestPlan: RevisionPlan | null;
  gapAnalysis: GapAnalysis;
  hasMaterials: boolean;
  hasTopics: boolean;
  hasAttempts: boolean;
  hasDemoMaterials: boolean;
}

/* -------------------------------------------------------------------------- */
/* API payloads                                                               */
/* -------------------------------------------------------------------------- */

export interface AuthSession {
  student: Student;
  mode: AuthMode;
  groqConfigured: boolean;
  groqModel: string | null;
  supabaseConfigured: boolean;
  demoCredentials: {
    email: string;
    password: string;
  };
}

export interface AppStatus {
  appName: string;
  version: string;
  storage: StorageMode;
  auth: AuthMode;
  supabaseConfigured: boolean;
  groqConfigured: boolean;
  groqModel: string | null;
  retrieval: {
    method: string;
    chunkSize: number;
    overlap: number;
  };
  demoCredentials: {
    email: string;
    password: string;
  };
  warnings: string[];
}

export interface GenerateQuizRequest {
  topicId?: string;
  subjectId?: string;
  difficulty?: QuizDifficulty;
  count?: number;
}

export interface GenerateQuizResponse {
  attempt: QuizAttempt;
  questions: PublicQuestion[];
  warnings: string[];
  engine: AIEngine;
}

export interface EvaluateAnswerRequest {
  questionId: string;
  selectedOptionIndex: number | null;
}

export interface EvaluateRequest {
  attemptId: string;
  answers: EvaluateAnswerRequest[];
  durationSeconds?: number;
}

export interface EvaluatedQuestion {
  questionId: string;
  question: string;
  options: string[];
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation: string;
  feedback: string;
  difficulty: Difficulty;
  topicId: string;
  topicName: string;
  citations: Citation[];
}

export interface EvaluateResponse {
  attempt: QuizAttempt;
  results: EvaluatedQuestion[];
  topicBreakdown: AttemptTopicBreakdown[];
  planUpdated: boolean;
  overallMastery: number;
  warnings: string[];
}

export interface RevisionPlanRequest {
  daysAvailable: number;
  hoursPerDay: number;
  examDate?: string | null;
}

export interface TutorRequest {
  topicId: string;
  message: string;
}

export interface TutorResponse {
  message: ChatMessage;
  citations: Citation[];
  engine: "groq" | "retrieval_only";
  grounded: boolean;
  aiConfigured: boolean;
  warning?: string;
}

export interface TopicMapResult {
  subjects: Subject[];
  topics: Topic[];
  engine: "groq" | "rule_based" | "mixed";
  warnings: string[];
}

export interface SeedResult {
  materialsCreated: number;
  chunksCreated: number;
  topicsCreated: number;
  alreadySeeded: boolean;
  warnings?: string[];
}

export interface UploadResponse {
  material: MaterialSummary;
  chunksCreated: number;
  pages: number;
  words: number;
  warnings: string[];
}

export interface HealthResponse {
  ok: boolean;
  storage: StorageMode;
  groqConfigured: boolean;
  supabaseConfigured: boolean;
}

/* -------------------------------------------------------------------------- */
/* Generic API envelope                                                       */
/* -------------------------------------------------------------------------- */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}
