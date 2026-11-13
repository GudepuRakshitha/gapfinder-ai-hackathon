import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
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
import type { CreateStudentInput, DataStore } from "@/backend/database/dataStore";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "@/backend/utils/errors";
import { hashPassword, verifyPassword } from "@/backend/utils/password";
import { newId } from "@/backend/utils/id";
import { DEMO_CREDENTIALS, DEMO_STUDENT_ID } from "@/lib/constants";

interface LocalStudentRecord extends Student {
  passwordHash: string | null;
}

interface LocalData {
  version: 1;
  students: LocalStudentRecord[];
  materials: Material[];
  chunks: DocumentChunk[];
  subjects: Subject[];
  topics: Topic[];
  questions: Question[];
  attempts: QuizAttempt[];
  answers: StudentAnswer[];
  mastery: TopicMastery[];
  plans: RevisionPlan[];
  tasks: RevisionTask[];
  chat: ChatMessage[];
}

interface StoreCache {
  data: LocalData | null;
  loading: Promise<LocalData> | null;
  queue: Promise<unknown>;
}

const globalForStore = globalThis as typeof globalThis & {
  __gapfinderLocalStore?: StoreCache;
};

function cache(): StoreCache {
  if (!globalForStore.__gapfinderLocalStore) {
    globalForStore.__gapfinderLocalStore = {
      data: null,
      loading: null,
      queue: Promise.resolve(),
    };
  }
  return globalForStore.__gapfinderLocalStore;
}

function now(): string {
  return new Date().toISOString();
}

function dataFile(): string {
  const explicit = process.env.GAPFINDER_DATA_FILE?.trim();
  if (explicit) return path.resolve(explicit);
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "gapfinder", "store.json");
  }
  return path.join(process.cwd(), ".data", "store.json");
}

function createDemoStudent(createdAt: string): LocalStudentRecord {
  return {
    id: DEMO_STUDENT_ID,
    email: DEMO_CREDENTIALS.email,
    fullName: DEMO_CREDENTIALS.name,
    isDemo: true,
    demoSeeded: false,
    createdAt,
    updatedAt: createdAt,
    passwordHash: hashPassword(DEMO_CREDENTIALS.password),
  };
}

function emptyData(): LocalData {
  const demo = createDemoStudent(now());
  return {
    version: 1,
    students: [demo],
    materials: [],
    chunks: [],
    subjects: [],
    topics: [],
    questions: [],
    attempts: [],
    answers: [],
    mastery: [],
    plans: [],
    tasks: [],
    chat: [],
  };
}

const ARRAY_KEYS = [
  "students",
  "materials",
  "chunks",
  "subjects",
  "topics",
  "questions",
  "attempts",
  "answers",
  "mastery",
  "plans",
  "tasks",
  "chat",
] as const;

function normalizeData(raw: Partial<LocalData>): LocalData {
  const data = { ...raw } as LocalData;
  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(data[key])) {
      (data as unknown as Record<string, unknown>)[key] = [];
    }
  }
  data.students = data.students.map((student) => ({
    ...student,
    demoSeeded: Boolean(student.demoSeeded),
  }));
  const hasDemo = data.students.some(
    (student) => student.email === DEMO_CREDENTIALS.email,
  );
  if (!hasDemo) {
    data.students.push(createDemoStudent(now()));
  }
  const demo = data.students.find(
    (student) => student.email === DEMO_CREDENTIALS.email,
  );
  if (demo && !demo.passwordHash) {
    demo.passwordHash = hashPassword(DEMO_CREDENTIALS.password);
  }
  return data;
}

async function persist(data: LocalData): Promise<void> {
  const file = dataFile();
  const directory = path.dirname(file);
  try {
    await fs.mkdir(/* turbopackIgnore: true */ directory, { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(/* turbopackIgnore: true */ temp, JSON.stringify(data), "utf-8");
    try {
      await fs.rename(/* turbopackIgnore: true */ temp, file);
    } catch {
      // Windows can refuse to replace an existing file with rename.
      await fs.rm(/* turbopackIgnore: true */ file, { force: true });
      await fs.rename(/* turbopackIgnore: true */ temp, file);
    }
  } catch (error) {
    throw new AppError(
      `The local data store could not be written. Configure Supabase for persistent storage. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
      500,
      "LOCAL_STORAGE_WRITE_FAILED",
    );
  }
}

async function readOrCreate(): Promise<LocalData> {
  const file = dataFile();
  try {
    const raw = await fs.readFile(/* turbopackIgnore: true */ file, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    return normalizeData(parsed);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "ENOENT") {
      const data = emptyData();
      await persist(data);
      return data;
    }
    if (error instanceof SyntaxError) {
      // Preserve the broken file for debugging and start clean.
      try {
        await fs.copyFile(/* turbopackIgnore: true */ file, `${file}.corrupt-${Date.now()}`);
      } catch {
        // ignore
      }
      const data = emptyData();
      await persist(data);
      return data;
    }
    throw error;
  }
}

async function load(): Promise<LocalData> {
  const store = cache();
  if (store.data) return store.data;
  if (!store.loading) {
    store.loading = readOrCreate().then((data) => {
      store.data = data;
      return data;
    });
  }
  return store.loading;
}

async function read<T>(fn: (data: LocalData) => T): Promise<T> {
  const store = cache();
  await store.queue.catch(() => undefined);
  const data = await load();
  return structuredClone(fn(data));
}

function mutate<T>(fn: (data: LocalData) => T | Promise<T>): Promise<T> {
  const store = cache();
  const run = async () => {
    const data = await load();
    const result = await fn(data);
    await persist(data);
    return structuredClone(result);
  };
  const result = store.queue.then(run, run);
  store.queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function stripText(material: Material): MaterialSummary {
  const { extractedText: _extractedText, ...summary } = material;
  return summary;
}

function requireRecord<T>(value: T | undefined, message: string): T {
  if (!value) throw new NotFoundError(message);
  return value;
}

const store: DataStore = {
  mode: "local",

  async getStudentById(id) {
    return read((data) => {
      const student = data.students.find((item) => item.id === id);
      if (!student) return null;
      const { passwordHash: _passwordHash, ...safe } = student;
      return safe;
    });
  },

  async getStudentByEmail(email) {
    return read((data) => {
      const student = data.students.find(
        (item) => item.email.toLowerCase() === email.toLowerCase(),
      );
      if (!student) return null;
      const { passwordHash: _passwordHash, ...safe } = student;
      return safe;
    });
  },

  async createStudent(input: CreateStudentInput) {
    return mutate((data) => {
      const email = input.email.toLowerCase();
      if (
        data.students.some((student) => student.email.toLowerCase() === email)
      ) {
        throw new ValidationError("An account with this email already exists.");
      }
      const timestamp = now();
      const record: LocalStudentRecord = {
        id: input.id ?? newId(),
        email,
        fullName: input.fullName?.trim() || email.split("@")[0],
        isDemo: Boolean(input.isDemo),
        demoSeeded: Boolean(input.demoSeeded),
        createdAt: timestamp,
        updatedAt: timestamp,
        passwordHash: null,
      };
      data.students.push(record);
      const { passwordHash: _passwordHash, ...safe } = record;
      return safe;
    });
  },

  async updateStudent(id, patch) {
    return mutate((data) => {
      const student = requireRecord(
        data.students.find((item) => item.id === id),
        "Student not found.",
      );
      if (patch.fullName !== undefined) student.fullName = patch.fullName;
      if (patch.demoSeeded !== undefined) student.demoSeeded = patch.demoSeeded;
      student.updatedAt = now();
      const { passwordHash: _passwordHash, ...safe } = student;
      return safe;
    });
  },

  async listMaterials(studentId) {
    return read((data) =>
      data.materials
        .filter((material) => material.studentId === studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(stripText),
    );
  },

  async getMaterial(studentId, materialId) {
    return read(
      (data) =>
        data.materials.find(
          (material) =>
            material.id === materialId && material.studentId === studentId,
        ) ?? null,
    );
  },

  async createMaterial(material) {
    return mutate((data) => {
      if (data.materials.some((item) => item.id === material.id)) {
        throw new ValidationError("A material with this id already exists.");
      }
      data.materials.push(material);
      return material;
    });
  },

  async updateMaterial(studentId, materialId, patch) {
    return mutate((data) => {
      const material = requireRecord(
        data.materials.find(
          (item) => item.id === materialId && item.studentId === studentId,
        ),
        "Material not found.",
      );
      Object.assign(material, patch, { updatedAt: now() });
      return material;
    });
  },

  async deleteMaterial(studentId, materialId) {
    return mutate((data) => {
      const index = data.materials.findIndex(
        (item) => item.id === materialId && item.studentId === studentId,
      );
      if (index === -1) throw new NotFoundError("Material not found.");
      data.materials.splice(index, 1);
      data.chunks = data.chunks.filter(
        (chunk) =>
          !(chunk.materialId === materialId && chunk.studentId === studentId),
      );
      return undefined;
    });
  },

  async createChunks(chunks) {
    return mutate((data) => {
      data.chunks.push(...chunks);
      return undefined;
    });
  },

  async listChunks(studentId, materialIds) {
    return read((data) =>
      data.chunks
        .filter(
          (chunk) =>
            chunk.studentId === studentId &&
            (!materialIds?.length || materialIds.includes(chunk.materialId)),
        )
        .sort((a, b) => a.chunkIndex - b.chunkIndex),
    );
  },

  async countChunks(studentId) {
    return read(
      (data) =>
        data.chunks.filter((chunk) => chunk.studentId === studentId).length,
    );
  },

  async deleteChunksForMaterial(studentId, materialId) {
    return mutate((data) => {
      data.chunks = data.chunks.filter(
        (chunk) =>
          !(chunk.materialId === materialId && chunk.studentId === studentId),
      );
      return undefined;
    });
  },

  async listSubjects(studentId) {
    return read((data) =>
      data.subjects.filter((subject) => subject.studentId === studentId),
    );
  },

  async listTopics(studentId) {
    return read((data) =>
      data.topics
        .filter((topic) => topic.studentId === studentId)
        .sort((a, b) => {
          if (a.subjectName === b.subjectName) return a.name.localeCompare(b.name);
          return a.subjectName.localeCompare(b.subjectName);
        }),
    );
  },

  async getTopic(studentId, topicId) {
    return read(
      (data) =>
        data.topics.find(
          (topic) => topic.id === topicId && topic.studentId === studentId,
        ) ?? null,
    );
  },

  async replaceCurriculum(studentId, subjects, topics) {
    return mutate((data) => {
      const subjectIds = new Set(subjects.map((subject) => subject.id));
      const topicIds = new Set(topics.map((topic) => topic.id));

      data.subjects = data.subjects.filter(
        (subject) =>
          subject.studentId !== studentId || subjectIds.has(subject.id),
      );
      for (const subject of subjects) {
        const index = data.subjects.findIndex(
          (item) => item.id === subject.id && item.studentId === studentId,
        );
        if (index >= 0) data.subjects[index] = subject;
        else data.subjects.push(subject);
      }

      data.topics = data.topics.filter(
        (topic) => topic.studentId !== studentId || topicIds.has(topic.id),
      );
      for (const topic of topics) {
        const index = data.topics.findIndex(
          (item) => item.id === topic.id && item.studentId === studentId,
        );
        if (index >= 0) data.topics[index] = topic;
        else data.topics.push(topic);
      }
      return undefined;
    });
  },

  async saveTopics(studentId, topics) {
    return mutate((data) => {
      for (const topic of topics) {
        if (topic.studentId !== studentId) continue;
        const index = data.topics.findIndex(
          (item) => item.id === topic.id && item.studentId === studentId,
        );
        if (index >= 0) data.topics[index] = topic;
        else data.topics.push(topic);
      }
      return undefined;
    });
  },

  async createAttemptWithQuestions(attempt, questions) {
    return mutate((data) => {
      data.attempts.push(attempt);
      data.questions.push(...questions);
      return undefined;
    });
  },

  async getAttempt(studentId, attemptId) {
    return read(
      (data) =>
        data.attempts.find(
          (attempt) =>
            attempt.id === attemptId && attempt.studentId === studentId,
        ) ?? null,
    );
  },

  async updateAttempt(studentId, attemptId, patch) {
    return mutate((data) => {
      const attempt = requireRecord(
        data.attempts.find(
          (item) => item.id === attemptId && item.studentId === studentId,
        ),
        "Quiz attempt not found.",
      );
      Object.assign(attempt, patch);
      return attempt;
    });
  },

  async listAttempts(studentId) {
    return read((data) =>
      data.attempts
        .filter((attempt) => attempt.studentId === studentId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    );
  },

  async getQuestionsByIds(studentId, ids) {
    return read((data) =>
      data.questions.filter(
        (question) =>
          question.studentId === studentId && ids.includes(question.id),
      ),
    );
  },

  async listQuestionsForAttempt(studentId, attemptId) {
    return read((data) =>
      data.questions.filter(
        (question) =>
          question.studentId === studentId &&
          question.attemptId === attemptId,
      ),
    );
  },

  async createAnswers(answers) {
    return mutate((data) => {
      for (const answer of answers) {
        if (!data.answers.some((item) => item.questionId === answer.questionId)) {
          data.answers.push(answer);
        }
      }
      return undefined;
    });
  },

  async listAnswersForAttempt(studentId, attemptId) {
    return read((data) =>
      data.answers
        .filter(
          (answer) =>
            answer.studentId === studentId && answer.attemptId === attemptId,
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  },

  async listAnswers(studentId) {
    return read((data) =>
      data.answers
        .filter((answer) => answer.studentId === studentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  },

  async listMastery(studentId) {
    return read((data) =>
      data.mastery.filter((row) => row.studentId === studentId),
    );
  },

  async upsertMastery(rows) {
    return mutate((data) => {
      for (const row of rows) {
        const index = data.mastery.findIndex(
          (item) =>
            item.studentId === row.studentId && item.topicId === row.topicId,
        );
        if (index >= 0) data.mastery[index] = row;
        else data.mastery.push(row);
      }
      return undefined;
    });
  },

  async getLatestPlan(studentId) {
    return read((data) => {
      const plan = data.plans
        .filter((item) => item.studentId === studentId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (!plan) return null;
      return {
        ...plan,
        tasks: data.tasks
          .filter((task) => task.planId === plan.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    });
  },

  async createPlan(plan, tasks) {
    return mutate((data) => {
      if (data.plans.some((item) => item.id === plan.id)) {
        throw new ValidationError("A plan with this id already exists.");
      }
      data.plans.push(plan);
      data.tasks.push(...tasks);
      return { ...plan, tasks };
    });
  },

  async updatePlan(studentId, planId, patch) {
    return mutate((data) => {
      const plan = requireRecord(
        data.plans.find(
          (item) => item.id === planId && item.studentId === studentId,
        ),
        "Revision plan not found.",
      );
      Object.assign(plan, patch, { updatedAt: now() });
      return undefined;
    });
  },

  async replaceTasks(studentId, planId, tasks) {
    return mutate((data) => {
      data.tasks = data.tasks.filter(
        (task) => !(task.planId === planId && task.studentId === studentId),
      );
      data.tasks.push(...tasks);
      return undefined;
    });
  },

  async updateTask(studentId, taskId, patch) {
    return mutate((data) => {
      const task = requireRecord(
        data.tasks.find(
          (item) => item.id === taskId && item.studentId === studentId,
        ),
        "Revision task not found.",
      );
      if (patch.completed !== undefined) task.completed = patch.completed;
      if (patch.completedAt !== undefined) task.completedAt = patch.completedAt;
      return task;
    });
  },

  async addChatMessage(message) {
    return mutate((data) => {
      data.chat.push(message);
      return undefined;
    });
  },

  async listChatMessages(studentId, topicId, limit = 40) {
    return read((data) =>
      data.chat
        .filter(
          (message) =>
            message.studentId === studentId && message.topicId === topicId,
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-limit),
    );
  },

  async clearChatMessages(studentId, topicId) {
    return mutate((data) => {
      data.chat = data.chat.filter(
        (message) =>
          !(
            message.studentId === studentId && message.topicId === topicId
          ),
      );
      return undefined;
    });
  },
};

/** Local-only credential helpers (Supabase manages passwords in cloud mode). */
export async function verifyLocalCredentials(
  email: string,
  password: string,
): Promise<Student | null> {
  const data = await load();
  const record = data.students.find(
    (student) => student.email.toLowerCase() === email.toLowerCase(),
  );
  if (!record?.passwordHash) return null;
  if (!verifyPassword(password, record.passwordHash)) return null;
  const { passwordHash: _passwordHash, ...safe } = record;
  return structuredClone(safe);
}

export async function setLocalPassword(
  studentId: string,
  password: string,
): Promise<void> {
  await mutate((data) => {
    const student = requireRecord(
      data.students.find((item) => item.id === studentId),
      "Student not found.",
    );
    student.passwordHash = hashPassword(password);
    student.updatedAt = now();
    return undefined;
  });
}

export async function localStudentHasPassword(
  studentId: string,
): Promise<boolean> {
  const data = await load();
  const student = data.students.find((item) => item.id === studentId);
  return Boolean(student?.passwordHash);
}

export const localStore = store;
