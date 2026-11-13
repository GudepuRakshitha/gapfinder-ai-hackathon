import type {
  ChatMessage,
  DocumentChunk,
  Material,
  MaterialSummary,
  Question,
  QuizAttempt,
  RevisionPlan,
  RevisionTask,
  Student,
  StudentAnswer,
  Subject,
  Topic,
  TopicMastery,
} from "@/backend/types";

export interface CreateStudentInput {
  id?: string;
  email: string;
  fullName?: string;
  isDemo?: boolean;
  demoSeeded?: boolean;
}

export interface DataStore {
  readonly mode: "supabase" | "local";

  /* Students ------------------------------------------------------------- */
  getStudentById(id: string): Promise<Student | null>;
  getStudentByEmail(email: string): Promise<Student | null>;
  createStudent(input: CreateStudentInput): Promise<Student>;
  updateStudent(
    id: string,
    patch: Partial<Pick<Student, "fullName" | "demoSeeded">>,
  ): Promise<Student>;

  /* Materials ------------------------------------------------------------ */
  listMaterials(studentId: string): Promise<MaterialSummary[]>;
  getMaterial(studentId: string, materialId: string): Promise<Material | null>;
  createMaterial(material: Material): Promise<Material>;
  updateMaterial(
    studentId: string,
    materialId: string,
    patch: Partial<
      Pick<
        Material,
        | "status"
        | "wordCount"
        | "charCount"
        | "pageCount"
        | "extractedText"
        | "sourceType"
        | "name"
      >
    >,
  ): Promise<Material>;
  deleteMaterial(studentId: string, materialId: string): Promise<void>;

  /* Chunks --------------------------------------------------------------- */
  createChunks(chunks: DocumentChunk[]): Promise<void>;
  listChunks(studentId: string, materialIds?: string[]): Promise<DocumentChunk[]>;
  countChunks(studentId: string): Promise<number>;
  deleteChunksForMaterial(studentId: string, materialId: string): Promise<void>;

  /* Curriculum ----------------------------------------------------------- */
  listSubjects(studentId: string): Promise<Subject[]>;
  listTopics(studentId: string): Promise<Topic[]>;
  getTopic(studentId: string, topicId: string): Promise<Topic | null>;
  replaceCurriculum(
    studentId: string,
    subjects: Subject[],
    topics: Topic[],
  ): Promise<void>;
  saveTopics(studentId: string, topics: Topic[]): Promise<void>;

  /* Quizzes -------------------------------------------------------------- */
  createAttemptWithQuestions(
    attempt: QuizAttempt,
    questions: Question[],
  ): Promise<void>;
  getAttempt(studentId: string, attemptId: string): Promise<QuizAttempt | null>;
  updateAttempt(
    studentId: string,
    attemptId: string,
    patch: Partial<
      Pick<
        QuizAttempt,
        | "status"
        | "submittedAt"
        | "durationSeconds"
        | "correctCount"
        | "scorePercentage"
        | "totalQuestions"
      >
    >,
  ): Promise<QuizAttempt>;
  listAttempts(studentId: string): Promise<QuizAttempt[]>;
  getQuestionsByIds(studentId: string, ids: string[]): Promise<Question[]>;
  listQuestionsForAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<Question[]>;

  /* Answers & mastery ---------------------------------------------------- */
  createAnswers(answers: StudentAnswer[]): Promise<void>;
  listAnswersForAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<StudentAnswer[]>;
  listAnswers(studentId: string): Promise<StudentAnswer[]>;
  listMastery(studentId: string): Promise<TopicMastery[]>;
  upsertMastery(rows: TopicMastery[]): Promise<void>;

  /* Revision plans ------------------------------------------------------- */
  getLatestPlan(studentId: string): Promise<RevisionPlan | null>;
  createPlan(plan: RevisionPlan, tasks: RevisionTask[]): Promise<RevisionPlan>;
  updatePlan(
    studentId: string,
    planId: string,
    patch: Partial<
      Pick<
        RevisionPlan,
        | "examDate"
        | "daysAvailable"
        | "hoursPerDay"
        | "summary"
        | "totalTasks"
        | "totalMinutes"
        | "aiEnhanced"
      >
    >,
  ): Promise<void>;
  replaceTasks(
    studentId: string,
    planId: string,
    tasks: RevisionTask[],
  ): Promise<void>;
  updateTask(
    studentId: string,
    taskId: string,
    patch: Partial<Pick<RevisionTask, "completed" | "completedAt">>,
  ): Promise<RevisionTask>;

  /* Tutor chat ----------------------------------------------------------- */
  addChatMessage(message: ChatMessage): Promise<void>;
  listChatMessages(
    studentId: string,
    topicId: string,
    limit?: number,
  ): Promise<ChatMessage[]>;
  clearChatMessages(studentId: string, topicId: string): Promise<void>;
}
