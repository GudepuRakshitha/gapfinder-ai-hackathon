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
  assertSupabaseAdmin,
  getSupabaseAdmin,
} from "@/backend/database/supabase";
import { NotFoundError } from "@/backend/utils/errors";

type Row = Record<string, unknown>;

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) =>
    char.toUpperCase(),
  );
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function rowToEntity<T>(row: Row): T {
  const entity: Row = {};
  for (const [key, value] of Object.entries(row)) {
    entity[toCamel(key)] = value;
  }
  return entity as T;
}

function entityToRow(value: object): Row {
  const row: Row = {};
  for (const [key, field] of Object.entries(value)) {
    if (field === undefined) continue;
    row[toSnake(key)] = field;
  }
  return row;
}

function now(): string {
  return new Date().toISOString();
}

const MATERIAL_SUMMARY_COLUMNS =
  "id,student_id,name,file_type,size_bytes,word_count,char_count,page_count,source_type,status,is_demo,created_at,updated_at";

const store: DataStore = {
  mode: "supabase",

  async getStudentById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    return data ? rowToEntity<Student>(data as Row) : null;
  },

  async getStudentByEmail(email) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .ilike("email", email)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    return data ? rowToEntity<Student>(data as Row) : null;
  },

  async createStudent(input: CreateStudentInput) {
    const timestamp = now();
    const row = {
      ...(input.id ? { id: input.id } : {}),
      email: input.email.toLowerCase(),
      full_name: input.fullName?.trim() || input.email.split("@")[0],
      is_demo: Boolean(input.isDemo),
      demo_seeded: Boolean(input.demoSeeded),
      created_at: timestamp,
      updated_at: timestamp,
    };
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .insert(row)
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    return rowToEntity<Student>(data as Row);
  },

  async updateStudent(id, patch) {
    const update: Row = { updated_at: now() };
    if (patch.fullName !== undefined) update.full_name = patch.fullName;
    if (patch.demoSeeded !== undefined) update.demo_seeded = patch.demoSeeded;
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    if (!data) throw new NotFoundError("Student not found.");
    return rowToEntity<Student>(data as Row);
  },

  async listMaterials(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("materials")
      .select(MATERIAL_SUMMARY_COLUMNS)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<MaterialSummary>(row as Row));
  },

  async getMaterial(studentId, materialId) {
    const { data, error } = await getSupabaseAdmin()
      .from("materials")
      .select("*")
      .eq("student_id", studentId)
      .eq("id", materialId)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    return data ? rowToEntity<Material>(data as Row) : null;
  },

  async createMaterial(material) {
    const { data, error } = await getSupabaseAdmin()
      .from("materials")
      .insert(entityToRow(material))
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    return rowToEntity<Material>(data as Row);
  },

  async updateMaterial(studentId, materialId, patch) {
    const update = entityToRow({ ...patch, updatedAt: now() });
    const { data, error } = await getSupabaseAdmin()
      .from("materials")
      .update(update)
      .eq("student_id", studentId)
      .eq("id", materialId)
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    if (!data) throw new NotFoundError("Material not found.");
    return rowToEntity<Material>(data as Row);
  },

  async deleteMaterial(studentId, materialId) {
    const { error } = await getSupabaseAdmin()
      .from("materials")
      .delete()
      .eq("student_id", studentId)
      .eq("id", materialId);
    if (error) assertSupabaseAdmin(error);
  },

  async createChunks(chunks) {
    if (!chunks.length) return;
    const rows = chunks.map((chunk) => entityToRow(chunk));
    for (let index = 0; index < rows.length; index += 400) {
      const batch = rows.slice(index, index + 400);
      const { error } = await getSupabaseAdmin().from("document_chunks").insert(batch);
      if (error) assertSupabaseAdmin(error);
    }
  },

  async listChunks(studentId, materialIds) {
    let query = getSupabaseAdmin()
      .from("document_chunks")
      .select("*")
      .eq("student_id", studentId)
      .order("chunk_index", { ascending: true })
      .limit(5000);
    if (materialIds?.length) query = query.in("material_id", materialIds);
    const { data, error } = await query;
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<DocumentChunk>(row as Row));
  },

  async deleteChunksForMaterial(studentId, materialId) {
    const { error } = await getSupabaseAdmin()
      .from("document_chunks")
      .delete()
      .eq("student_id", studentId)
      .eq("material_id", materialId);
    if (error) assertSupabaseAdmin(error);
  },

  async countChunks(studentId) {
    const { count, error } = await getSupabaseAdmin()
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId);
    if (error) assertSupabaseAdmin(error);
    return count ?? 0;
  },

  async listSubjects(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("subjects")
      .select("*")
      .eq("student_id", studentId)
      .order("name");
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<Subject>(row as Row));
  },

  async listTopics(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("topics")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at");
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<Topic>(row as Row));
  },

  async getTopic(studentId, topicId) {
    const { data, error } = await getSupabaseAdmin()
      .from("topics")
      .select("*")
      .eq("student_id", studentId)
      .eq("id", topicId)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    return data ? rowToEntity<Topic>(data as Row) : null;
  },

  async replaceCurriculum(studentId, subjects, topics) {
    const admin = getSupabaseAdmin();
    // Topics use deterministic ids, so deleting and re-inserting keeps quiz
    // history and mastery linked by the same topic id.
    const { error: topicDeleteError } = await admin
      .from("topics")
      .delete()
      .eq("student_id", studentId);
    if (topicDeleteError) assertSupabaseAdmin(topicDeleteError);
    const { error: subjectDeleteError } = await admin
      .from("subjects")
      .delete()
      .eq("student_id", studentId);
    if (subjectDeleteError) assertSupabaseAdmin(subjectDeleteError);

    if (subjects.length) {
      const { error } = await admin
        .from("subjects")
        .insert(subjects.map((subject) => entityToRow(subject)));
      if (error) assertSupabaseAdmin(error);
    }
    if (topics.length) {
      const { error } = await admin
        .from("topics")
        .insert(topics.map((topic) => entityToRow(topic)));
      if (error) assertSupabaseAdmin(error);
    }
  },

  async saveTopics(studentId, topics) {
    if (!topics.length) return;
    const rows = topics
      .filter((topic) => topic.studentId === studentId)
      .map((topic) => entityToRow(topic));
    const { error } = await getSupabaseAdmin()
      .from("topics")
      .upsert(rows, { onConflict: "id" });
    if (error) assertSupabaseAdmin(error);
  },

  async createAttemptWithQuestions(attempt, questions) {
    const admin = getSupabaseAdmin();
    const { error: attemptError } = await admin
      .from("quiz_attempts")
      .insert(entityToRow(attempt));
    if (attemptError) assertSupabaseAdmin(attemptError);

    const rows = questions.map((question) => entityToRow(question));
    const { error: questionError } = await admin.from("questions").insert(rows);
    if (questionError) {
      await admin.from("quiz_attempts").delete().eq("id", attempt.id);
      assertSupabaseAdmin(questionError);
    }
  },

  async getAttempt(studentId, attemptId) {
    const { data, error } = await getSupabaseAdmin()
      .from("quiz_attempts")
      .select("*")
      .eq("student_id", studentId)
      .eq("id", attemptId)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    return data ? rowToEntity<QuizAttempt>(data as Row) : null;
  },

  async updateAttempt(studentId, attemptId, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("quiz_attempts")
      .update(entityToRow(patch))
      .eq("student_id", studentId)
      .eq("id", attemptId)
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    if (!data) throw new NotFoundError("Quiz attempt not found.");
    return rowToEntity<QuizAttempt>(data as Row);
  },

  async listAttempts(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("quiz_attempts")
      .select("*")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<QuizAttempt>(row as Row));
  },

  async getQuestionsByIds(studentId, ids) {
    if (!ids.length) return [];
    const { data, error } = await getSupabaseAdmin()
      .from("questions")
      .select("*")
      .eq("student_id", studentId)
      .in("id", ids);
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<Question>(row as Row));
  },

  async listQuestionsForAttempt(studentId, attemptId) {
    const { data, error } = await getSupabaseAdmin()
      .from("questions")
      .select("*")
      .eq("student_id", studentId)
      .eq("attempt_id", attemptId)
      .order("created_at");
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<Question>(row as Row));
  },

  async createAnswers(answers) {
    if (!answers.length) return;
    const rows = answers.map((answer) => entityToRow(answer));
    const { error } = await getSupabaseAdmin()
      .from("student_answers")
      .upsert(rows, { onConflict: "question_id", ignoreDuplicates: true });
    if (error) assertSupabaseAdmin(error);
  },

  async listAnswersForAttempt(studentId, attemptId) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_answers")
      .select("*")
      .eq("student_id", studentId)
      .eq("attempt_id", attemptId)
      .order("created_at");
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<StudentAnswer>(row as Row));
  },

  async listAnswers(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_answers")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at")
      .limit(5000);
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<StudentAnswer>(row as Row));
  },

  async listMastery(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("topic_mastery")
      .select("*")
      .eq("student_id", studentId);
    if (error) assertSupabaseAdmin(error);
    return (data ?? []).map((row) => rowToEntity<TopicMastery>(row as Row));
  },

  async upsertMastery(rows) {
    if (!rows.length) return;
    const { error } = await getSupabaseAdmin()
      .from("topic_mastery")
      .upsert(rows.map((row) => entityToRow(row)), {
        onConflict: "student_id,topic_id",
      });
    if (error) assertSupabaseAdmin(error);
  },

  async getLatestPlan(studentId) {
    const { data, error } = await getSupabaseAdmin()
      .from("revision_plans")
      .select("*, revision_tasks(*)")
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) assertSupabaseAdmin(error);
    if (!data) return null;
    const row = data as Row;
    const tasks = Array.isArray(row.revision_tasks)
      ? (row.revision_tasks as Row[])
      : [];
    const plan = rowToEntity<RevisionPlan>(row);
    return {
      ...plan,
      tasks: tasks
        .map((task) => rowToEntity<RevisionTask>(task))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },

  async createPlan(plan, tasks) {
    const admin = getSupabaseAdmin();
    const { tasks: _tasks, ...planRow } = plan;
    const { data, error } = await admin
      .from("revision_plans")
      .insert(entityToRow(planRow))
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    if (tasks.length) {
      const { error: taskError } = await admin
        .from("revision_tasks")
        .insert(tasks.map((task) => entityToRow(task)));
      if (taskError) {
        await admin.from("revision_plans").delete().eq("id", plan.id);
        assertSupabaseAdmin(taskError);
      }
    }
    return { ...rowToEntity<RevisionPlan>(data as Row), tasks };
  },

  async updatePlan(studentId, planId, patch) {
    const { error } = await getSupabaseAdmin()
      .from("revision_plans")
      .update(entityToRow({ ...patch, updatedAt: now() }))
      .eq("student_id", studentId)
      .eq("id", planId);
    if (error) assertSupabaseAdmin(error);
  },

  async replaceTasks(studentId, planId, tasks) {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("revision_tasks")
      .delete()
      .eq("student_id", studentId)
      .eq("plan_id", planId);
    if (error) assertSupabaseAdmin(error);
    if (tasks.length) {
      const { error: insertError } = await admin
        .from("revision_tasks")
        .insert(tasks.map((task) => entityToRow(task)));
      if (insertError) assertSupabaseAdmin(insertError);
    }
  },

  async updateTask(studentId, taskId, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("revision_tasks")
      .update(entityToRow(patch))
      .eq("student_id", studentId)
      .eq("id", taskId)
      .select("*")
      .single();
    if (error) assertSupabaseAdmin(error);
    if (!data) throw new NotFoundError("Revision task not found.");
    return rowToEntity<RevisionTask>(data as Row);
  },

  async addChatMessage(message) {
    const { error } = await getSupabaseAdmin()
      .from("chat_history")
      .insert(entityToRow(message));
    if (error) assertSupabaseAdmin(error);
  },

  async listChatMessages(studentId, topicId, limit = 40) {
    const { data, error } = await getSupabaseAdmin()
      .from("chat_history")
      .select("*")
      .eq("student_id", studentId)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) assertSupabaseAdmin(error);
    return (data ?? [])
      .map((row) => rowToEntity<ChatMessage>(row as Row))
      .reverse();
  },

  async clearChatMessages(studentId, topicId) {
    const { error } = await getSupabaseAdmin()
      .from("chat_history")
      .delete()
      .eq("student_id", studentId)
      .eq("topic_id", topicId);
    if (error) assertSupabaseAdmin(error);
  },
};

export const supabaseStore = store;
