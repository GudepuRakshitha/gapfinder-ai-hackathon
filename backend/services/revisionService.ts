import type {
  GapAnalysis,
  PlanPriority,
  RevisionPlan,
  RevisionPlanRequest,
  RevisionTask,
  RevisionTaskType,
  TopicPerformance,
} from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import { buildGapAnalysis } from "@/backend/services/gapAnalysisService";
import {
  groqJson,
  isGroqConfigured,
} from "@/backend/services/groqService";
import {
  ValidationError,
} from "@/backend/utils/errors";
import { newId } from "@/backend/utils/id";
import {
  validateRevisionPlanInput,
} from "@/backend/utils/validateInput";
import {
  addDaysISO,
  daysBetween,
  formatDate,
  percentOf,
  todayISO,
} from "@/lib/utils";
import { dedupeStrings } from "@/backend/utils/text";

interface BuildPlanOptions {
  enhanceWithAI?: boolean;
  preserveCompletion?: boolean;
}

function topicWeight(topic: TopicPerformance): number {
  const mastery =
    topic.status === "not_assessed" ? 38 : Math.max(0, topic.mastery);
  const gap = 105 - mastery;
  const importance = 0.7 + topic.importance * 0.06;
  const statusMultiplier =
    topic.status === "weak"
      ? 1.3
      : topic.status === "not_assessed"
        ? 1.15
        : topic.status === "medium"
          ? 1
          : 0.6;
  return gap * importance * statusMultiplier;
}

function priorityFor(topic: TopicPerformance): PlanPriority {
  if (topic.status === "weak" || topic.status === "not_assessed") return "high";
  if (topic.status === "medium") return "medium";
  return "low";
}

function tasksPerDay(minutes: number): number {
  if (minutes >= 180) return 3;
  if (minutes >= 90) return 2;
  return 1;
}

function taskDuration(totalMinutes: number, tasks: number): number {
  const raw = Math.round(totalMinutes / Math.max(1, tasks) / 5) * 5;
  return Math.min(90, Math.max(20, raw));
}

function sourceLabel(topic: TopicPerformance): string {
  const citation = topic.citations[0];
  if (!citation) return "your mapped study material";
  return `${citation.materialName}${
    citation.page ? `, page ${citation.page}` : ""
  }${citation.section ? ` (§${citation.section})` : ""}`;
}

function objectivesFor(
  topic: TopicPerformance,
  taskType: RevisionTaskType,
): string[] {
  const subtopics = topic.subtopics.slice(0, 3);
  const first = subtopics[0] ?? topic.topicName;

  if (taskType === "learn") {
    return dedupeStrings([
      `Explain ${first} in your own words without looking at notes.`,
      `Re-read ${sourceLabel(topic)} and write a one-page summary.`,
      subtopics[1]
        ? `Draw a concept map linking ${first} to ${subtopics[1]}.`
        : `List the three most examinable facts in ${topic.topicName}.`,
      `Finish with 3 self-check questions and log any uncertainty.`,
    ]).slice(0, 4);
  }
  if (taskType === "practice") {
    return dedupeStrings([
      `Answer 8 targeted questions on ${topic.topicName}.`,
      `Review every incorrect answer and write down why it was wrong.`,
      `Score at least 80% before moving on.`,
      `Re-attempt the missed concepts after a 10-minute break.`,
    ]).slice(0, 4);
  }
  if (taskType === "test") {
    return [
      "Complete the diagnostic under timed conditions without notes.",
      "Compare your score with the previous attempt.",
      "Read every explanation and citation, not just the final score.",
      "Mark the two concepts that still feel least secure.",
    ];
  }
  return dedupeStrings([
    `Recall ${first} from memory before checking your notes.`,
    `Explain ${topic.topicName} aloud as if teaching a classmate.`,
    `Do 5 mixed questions to keep this topic fresh.`,
  ]).slice(0, 4);
}

function taskTitle(topic: TopicPerformance, taskType: RevisionTaskType): string {
  if (taskType === "learn") return `Rebuild foundations — ${topic.topicName}`;
  if (taskType === "practice") return `Targeted practice — ${topic.topicName}`;
  if (taskType === "review") return `Spaced review — ${topic.topicName}`;
  return `Timed mini-test — ${topic.topicName}`;
}

function deterministicSummary(
  gap: GapAnalysis,
  days: number,
  hoursPerDay: number,
  tasks: RevisionTask[],
  examDate: string | null,
  compressedFrom: number,
): string {
  const weak = gap.topics.filter((topic) => topic.status === "weak");
  const medium = gap.topics.filter((topic) => topic.status === "medium");
  const strong = gap.topics.filter((topic) => topic.status === "strong");
  const totalMinutes = tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const parts = [
    `${tasks.length} tasks across ${days} ${days === 1 ? "day" : "days"} (~${Math.round(totalMinutes / 60)}h total).`,
    weak.length
      ? `${weak.length} weak ${weak.length === 1 ? "topic is" : "topics are"} front-loaded: ${weak
          .slice(0, 3)
          .map((topic) => topic.topicName)
          .join(", ")}.`
      : medium.length
        ? `${medium.length} medium topics get focused practice to push them into the strong band.`
        : "No weak topics detected; the plan protects mastery with spaced review.",
    strong.length
      ? `${strong.length} strong ${strong.length === 1 ? "topic is" : "topics are"} maintained with light retrieval.`
      : "",
    examDate
      ? `Exam date: ${formatDate(`${examDate}T12:00:00.000Z`, { month: "short", day: "numeric", year: "numeric" })}.`
      : `Based on ${hoursPerDay}h of study time per day.`,
    compressedFrom > days
      ? `Compressed from ${compressedFrom} days to fit before your exam.`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}

interface AiPlanSummary {
  summary?: unknown;
}

async function enhanceSummary(
  summary: string,
  gap: GapAnalysis,
  days: number,
  hoursPerDay: number,
): Promise<{ summary: string; aiEnhanced: boolean }> {
  if (!isGroqConfigured()) return { summary, aiEnhanced: false };

  try {
    const response = await groqJson<AiPlanSummary>({
      messages: [
        {
          role: "system",
          content:
            "You are a study coach. Write a concise, encouraging plan summary using only the supplied topics and mastery data. Never invent topics or scores.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Write a 2–3 sentence coaching summary for this revision plan.",
            constraints: `The plan spans ${days} days at ${hoursPerDay} hours/day. Mention which topics come first and why. Under 90 words. Return JSON {"summary":"..."}.`,
            topics: gap.topics.slice(0, 10).map((topic) => ({
              name: topic.topicName,
              mastery: topic.mastery,
              status: topic.status,
              importance: topic.importance,
              examFrequency: topic.examFrequency,
            })),
            ruleBasedSummary: summary,
          }),
        },
      ],
      temperature: 0.4,
      maxTokens: 350,
      timeoutMs: 25_000,
      retries: 1,
    });
    const aiSummary =
      typeof response.summary === "string"
        ? response.summary.replace(/\s+/g, " ").trim().slice(0, 700)
        : "";
    if (aiSummary.length >= 40) {
      return { summary: aiSummary, aiEnhanced: true };
    }
  } catch {
    // Summary enhancement is optional; keep the deterministic version.
  }
  return { summary, aiEnhanced: false };
}

function preserveCompletedTasks(
  tasks: RevisionTask[],
  previous: RevisionPlan | null,
): RevisionTask[] {
  if (!previous?.tasks.length) return tasks;
  const completedByTopic = new Map<string, RevisionTask>();
  for (const task of previous.tasks) {
    if (!task.completed) continue;
    const key = `${task.topicId ?? "all"}|${task.taskType}`;
    if (!completedByTopic.has(key)) completedByTopic.set(key, task);
  }
  return tasks.map((task) => {
    const match = completedByTopic.get(`${task.topicId ?? "all"}|${task.taskType}`);
    if (!match) return task;
    // Do not carry completion onto a final all-topic re-test; it should be
    // taken again after a new quiz result.
    if (!task.topicId) return task;
    return {
      ...task,
      completed: true,
      completedAt: match.completedAt ?? new Date().toISOString(),
    };
  });
}

export async function generatePlan(
  studentId: string,
  request: RevisionPlanRequest,
  options: BuildPlanOptions = {},
): Promise<RevisionPlan> {
  const input = validateRevisionPlanInput(request);
  const gap = await buildGapAnalysis(studentId);
  if (!gap.topics.length) {
    throw new ValidationError(
      "Map your topics before generating a revision plan.",
    );
  }

  const today = todayISO();
  let effectiveDays = input.daysAvailable;
  if (input.examDate) {
    const daysUntilExam = daysBetween(today, input.examDate) + 1;
    if (daysUntilExam < 1) {
      throw new ValidationError("The exam date must be today or later.");
    }
    effectiveDays = Math.max(1, Math.min(effectiveDays, daysUntilExam));
  }

  const dailyMinutes = Math.max(30, Math.round(input.hoursPerDay * 60 * 0.9));
  const perDay = tasksPerDay(dailyMinutes);
  const priorityTopics = [...gap.topics].sort(
    (a, b) => topicWeight(b) - topicWeight(a),
  );
  const usage = new Map<string, number>();
  const tasks: RevisionTask[] = [];
  let sortOrder = 0;

  const pushTask = (
    dayIndex: number,
    topic: TopicPerformance | null,
    taskType: RevisionTaskType,
    title: string,
    duration: number,
    objectives: string[],
    priority: PlanPriority,
  ) => {
    tasks.push({
      id: newId(),
      planId: "",
      studentId,
      dayIndex,
      scheduledDate: addDaysISO(today, dayIndex),
      topicId: topic?.topicId ?? null,
      topicName: topic?.topicName ?? "All topics",
      subjectName: topic?.subjectName ?? "Mixed",
      title,
      durationMinutes: duration,
      objectives,
      priority,
      taskType,
      sortOrder: sortOrder++,
      completed: false,
      completedAt: null,
    });
  };

  const hasUnassessed = priorityTopics.some(
    (topic) => topic.status === "not_assessed",
  );
  const strongTopics = priorityTopics.filter(
    (topic) => topic.status === "strong",
  );

  for (let day = 0; day < effectiveDays; day += 1) {
    const isLastDay = day === effectiveDays - 1;
    const slots = perDay;
    const duration = taskDuration(dailyMinutes, slots);

    for (let slot = 0; slot < slots; slot += 1) {
      if (isLastDay && slot === slots - 1 && effectiveDays >= 2) {
        pushTask(
          day,
          null,
          "test",
          "Full mixed diagnostic re-test",
          Math.min(90, Math.max(30, duration)),
          objectivesFor(
            {
              ...priorityTopics[0],
              topicName: "all topics",
            },
            "test",
          ),
          "high",
        );
        continue;
      }
      if (day === 0 && slot === 0 && hasUnassessed) {
        const unassessed = priorityTopics.find(
          (topic) => topic.status === "not_assessed",
        );
        pushTask(
          day,
          unassessed ?? null,
          "test",
          "Baseline diagnostic — unassessed topics",
          Math.min(60, Math.max(25, duration)),
          [
            "Complete a mixed diagnostic quiz to establish baselines.",
            "Read every explanation and citation after submitting.",
            "The plan will re-prioritise automatically after the quiz.",
          ],
          "high",
        );
        continue;
      }

      const chosen = [...priorityTopics].sort((a, b) => {
        const scoreA =
          topicWeight(a) / (1 + (usage.get(a.topicId) ?? 0) * 1.4);
        const scoreB =
          topicWeight(b) / (1 + (usage.get(b.topicId) ?? 0) * 1.4);
        return scoreB - scoreA;
      })[0];
      if (!chosen) break;

      const count = (usage.get(chosen.topicId) ?? 0) + 1;
      usage.set(chosen.topicId, count);
      const taskType: RevisionTaskType =
        count === 1 ? "learn" : count === 2 ? "practice" : "review";
      pushTask(
        day,
        chosen,
        taskType,
        taskTitle(chosen, taskType),
        duration,
        objectivesFor(chosen, taskType),
        priorityFor(chosen),
      );
    }

    const remainingMinutes = Math.max(0, dailyMinutes - duration * slots);
    if (isLastDay && strongTopics.length && remainingMinutes >= 15) {
      pushTask(
        day,
        null,
        "review",
        "Spaced maintenance — strong topics",
        Math.min(45, remainingMinutes),
        [
          `Quick recall check for ${strongTopics
            .slice(0, 4)
            .map((topic) => topic.topicName)
            .join(", ")}.`,
          "Answer 5 mixed questions and stop when accuracy is above 85%.",
        ],
        "low",
      );
    }
  }

  const previous = await db.getLatestPlan(studentId);
  const planId = previous?.id ?? newId();
  const withCompletion = options.preserveCompletion === false
    ? tasks
    : preserveCompletedTasks(tasks, previous);
  for (const task of withCompletion) task.planId = planId;

  const totalMinutes = withCompletion.reduce(
    (sum, task) => sum + task.durationMinutes,
    0,
  );
  const baseSummary = deterministicSummary(
    gap,
    effectiveDays,
    input.hoursPerDay,
    withCompletion,
    input.examDate,
    input.daysAvailable,
  );
  const enhanced =
    options.enhanceWithAI === false
      ? { summary: baseSummary, aiEnhanced: false }
      : await enhanceSummary(
          baseSummary,
          gap,
          effectiveDays,
          input.hoursPerDay,
        );

  const now = new Date().toISOString();
  if (previous) {
    await db.updatePlan(studentId, planId, {
      examDate: input.examDate,
      daysAvailable: effectiveDays,
      hoursPerDay: input.hoursPerDay,
      summary: enhanced.summary,
      totalTasks: withCompletion.length,
      totalMinutes,
      aiEnhanced: enhanced.aiEnhanced,
    });
    await db.replaceTasks(studentId, planId, withCompletion);
    return {
      ...previous,
      examDate: input.examDate,
      daysAvailable: effectiveDays,
      hoursPerDay: input.hoursPerDay,
      summary: enhanced.summary,
      totalTasks: withCompletion.length,
      totalMinutes,
      aiEnhanced: enhanced.aiEnhanced,
      updatedAt: now,
      tasks: withCompletion,
    };
  }

  const plan: RevisionPlan = {
    id: planId,
    studentId,
    examDate: input.examDate,
    daysAvailable: effectiveDays,
    hoursPerDay: input.hoursPerDay,
    summary: enhanced.summary,
    totalTasks: withCompletion.length,
    totalMinutes,
    aiEnhanced: enhanced.aiEnhanced,
    createdAt: now,
    updatedAt: now,
    tasks: withCompletion,
  };
  return db.createPlan(plan, withCompletion);
}

/** Regenerate an existing plan after new quiz evidence arrives. */
export async function refreshPlan(studentId: string): Promise<boolean> {
  const existing = await db.getLatestPlan(studentId);
  if (!existing) return false;
  await generatePlan(
    studentId,
    {
      daysAvailable: existing.daysAvailable,
      hoursPerDay: existing.hoursPerDay,
      examDate: existing.examDate,
    },
    { enhanceWithAI: false, preserveCompletion: true },
  );
  return true;
}

export async function getPlan(studentId: string): Promise<RevisionPlan | null> {
  return db.getLatestPlan(studentId);
}

export async function toggleTask(
  studentId: string,
  taskId: string,
  completed: boolean,
): Promise<RevisionTask> {
  return db.updateTask(studentId, taskId, {
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  });
}

export function planProgress(plan: RevisionPlan): number {
  if (!plan.tasks.length) return 0;
  return percentOf(
    plan.tasks.filter((task) => task.completed).length,
    plan.tasks.length,
  );
}
