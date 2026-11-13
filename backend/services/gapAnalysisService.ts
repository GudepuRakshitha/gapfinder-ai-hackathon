import type {
  Difficulty,
  GapAnalysis,
  IncorrectConcept,
  LearningInsight,
  Question,
  StudentAnswer,
  Topic,
  TopicMastery,
  TopicPerformance,
} from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import {
  getGroqModel,
  groqJson,
  isGroqConfigured,
} from "@/backend/services/groqService";
import { classifyMastery } from "@/backend/utils/calculateScore";
import { percentOf, statusForMastery } from "@/lib/utils";
import { newId } from "@/backend/utils/id";
import { errorMessage } from "@/backend/utils/errors";
import { dedupeStrings } from "@/backend/utils/text";

interface MasteryAggregate {
  topicId: string;
  topicName: string;
  attempted: number;
  correct: number;
  difficultyMisses: Record<Difficulty, { total: number; missed: number }>;
  lastAttemptedAt: string | null;
}

function aggregateAnswers(
  answers: StudentAnswer[],
): Map<string, MasteryAggregate> {
  const map = new Map<string, MasteryAggregate>();

  for (const answer of answers) {
    const key = answer.topicId || answer.topicName;
    const current =
      map.get(key) ??
      ({
        topicId: answer.topicId,
        topicName: answer.topicName,
        attempted: 0,
        correct: 0,
        difficultyMisses: {
          easy: { total: 0, missed: 0 },
          medium: { total: 0, missed: 0 },
          hard: { total: 0, missed: 0 },
        },
        lastAttemptedAt: null,
      } satisfies MasteryAggregate);

    current.attempted += 1;
    if (answer.isCorrect) current.correct += 1;
    else current.difficultyMisses[answer.difficulty].missed += 1;
    current.difficultyMisses[answer.difficulty].total += 1;
    if (
      !current.lastAttemptedAt ||
      answer.createdAt > current.lastAttemptedAt
    ) {
      current.lastAttemptedAt = answer.createdAt;
    }
    map.set(key, current);
  }

  return map;
}

function dominantWeakness(
  aggregate: MasteryAggregate | undefined,
): { difficulty: Difficulty; missed: number; total: number } | null {
  if (!aggregate) return null;
  const entries = (
    Object.entries(aggregate.difficultyMisses) as [
      Difficulty,
      { total: number; missed: number },
    ][]
  )
    .filter(([, value]) => value.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed);
  if (!entries.length) return null;
  return {
    difficulty: entries[0][0],
    missed: entries[0][1].missed,
    total: entries[0][1].total,
  };
}

function reasonForPerformance(
  aggregate: MasteryAggregate | undefined,
  status: TopicMastery["status"],
): string {
  if (!aggregate || aggregate.attempted === 0) {
    return "No diagnostic data yet. Take a quiz to measure this topic.";
  }
  const mastery = percentOf(aggregate.correct, aggregate.attempted);
  const weakness = dominantWeakness(aggregate);

  if (status === "strong") {
    return `Consistent accuracy: ${aggregate.correct}/${aggregate.attempted} correct (${mastery}%)${weakness ? `, with minor misses on ${weakness.difficulty} questions.` : "."}`;
  }
  if (status === "medium") {
    return `Inconsistent mastery: ${aggregate.correct}/${aggregate.attempted} correct (${mastery}%).${
      weakness
        ? ` Most misses were ${weakness.difficulty} questions (${weakness.missed}/${weakness.total} missed).`
        : ""
    }`;
  }
  return `Weak foundation: only ${aggregate.correct}/${aggregate.attempted} correct (${mastery}%).${
    weakness
      ? ` Errors concentrate in ${weakness.difficulty} questions (${weakness.missed}/${weakness.total} missed).`
      : ""
  }`;
}

function actionForPerformance(
  topic: Topic | undefined,
  status: TopicMastery["status"],
): string {
  const firstSubtopic = topic?.subtopics[0];
  const firstCitation = topic?.citations[0];
  const source = firstCitation
    ? `${firstCitation.materialName}${firstCitation.page ? `, page ${firstCitation.page}` : ""}${firstCitation.section ? ` (§${firstCitation.section})` : ""}`
    : "your study material";

  if (status === "strong") {
    return "Maintain with a short mixed quiz every 3–4 days and one past-paper question.";
  }
  if (status === "medium") {
    return `Review ${firstSubtopic ? `“${firstSubtopic}”` : "the weakest subtopic"} in ${source}, then answer 5 application questions without notes.`;
  }
  if (status === "not_assessed") {
    return "Take a diagnostic quiz first; then the plan will target this topic automatically.";
  }
  return `Re-study ${firstSubtopic ? `“${firstSubtopic}”` : topic?.name ?? "this topic"} in ${source}, write a one-page summary, then retake 5 targeted questions.`;
}

export function calculateMasteryRows(
  topics: Topic[],
  answers: StudentAnswer[],
): TopicMastery[] {
  const aggregates = aggregateAnswers(answers);
  const rows: TopicMastery[] = [];

  for (const topic of topics) {
    const aggregate = aggregates.get(topic.id);
    const attempted = aggregate?.attempted ?? 0;
    const correct = aggregate?.correct ?? 0;
    const mastery = percentOf(correct, attempted);
    const status = statusForMastery(mastery, attempted);
    rows.push({
      id: newId(),
      studentId: topic.studentId,
      topicId: topic.id,
      topicName: topic.name,
      attempted,
      correct,
      incorrect: attempted - correct,
      mastery,
      status,
      weaknessReason: reasonForPerformance(aggregate, status),
      recommendedAction: actionForPerformance(topic, status),
      lastAttemptedAt: aggregate?.lastAttemptedAt ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  // Preserve performance for topics that were removed from the latest topic
  // map, so historical mastery is not silently lost.
  for (const aggregate of aggregates.values()) {
    if (rows.some((row) => row.topicId === aggregate.topicId)) continue;
    const mastery = percentOf(aggregate.correct, aggregate.attempted);
    const status = statusForMastery(mastery, aggregate.attempted);
    rows.push({
      id: newId(),
      studentId: answers[0]?.studentId ?? "",
      topicId: aggregate.topicId,
      topicName: aggregate.topicName,
      attempted: aggregate.attempted,
      correct: aggregate.correct,
      incorrect: aggregate.attempted - aggregate.correct,
      mastery,
      status,
      weaknessReason: reasonForPerformance(aggregate, status),
      recommendedAction: actionForPerformance(undefined, status),
      lastAttemptedAt: aggregate.lastAttemptedAt,
      updatedAt: new Date().toISOString(),
    });
  }

  return rows;
}

/** Persist a deterministic mastery snapshot after each quiz submission. */
export async function recomputeTopicMastery(
  studentId: string,
): Promise<TopicMastery[]> {
  const [topics, answers] = await Promise.all([
    db.listTopics(studentId),
    db.listAnswers(studentId),
  ]);
  const rows = calculateMasteryRows(topics, answers);
  await db.upsertMastery(rows);
  return rows;
}

function ruleBasedInsight(
  topics: TopicPerformance[],
  answers: StudentAnswer[],
): LearningInsight {
  const assessed = topics.filter((topic) => topic.attempted > 0);
  const weak = assessed.filter((topic) => topic.status === "weak");
  const medium = assessed.filter((topic) => topic.status === "medium");
  const strong = assessed.filter((topic) => topic.status === "strong");
  const unassessed = topics.filter((topic) => topic.attempted === 0);
  const totalCorrect = assessed.reduce((sum, topic) => sum + topic.correct, 0);
  const totalAttempted = assessed.reduce((sum, topic) => sum + topic.attempted, 0);
  const overall = percentOf(totalCorrect, totalAttempted);

  const difficultyTotals = {
    easy: { missed: 0, total: 0 },
    medium: { missed: 0, total: 0 },
    hard: { missed: 0, total: 0 },
  };
  for (const answer of answers) {
    difficultyTotals[answer.difficulty].total += 1;
    if (!answer.isCorrect) difficultyTotals[answer.difficulty].missed += 1;
  }
  const hardest = (
    Object.entries(difficultyTotals) as [
      Difficulty,
      { missed: number; total: number },
    ][]
  )
    .filter(([, value]) => value.total > 0)
    .sort((a, b) => {
      const rateA = a[1].missed / a[1].total;
      const rateB = b[1].missed / b[1].total;
      return rateB - rateA;
    })[0];

  const patterns: string[] = [];
  if (weak.length) {
    patterns.push(
      `${weak.length} weak ${weak.length === 1 ? "topic" : "topics"} below 50% mastery: ${weak
        .slice(0, 4)
        .map((topic) => `${topic.topicName} (${topic.mastery}%)`)
        .join(", ")}${weak.length > 4 ? ", …" : ""}.`,
    );
  }
  if (hardest && hardest[1].missed > 0) {
    patterns.push(
      `Highest error rate on ${hardest[0]} questions: ${hardest[1].missed}/${hardest[1].total} missed (${percentOf(
        hardest[1].missed,
        hardest[1].total,
      )}%).`,
    );
  }
  if (strong.length) {
    patterns.push(
      `Strongest area: ${strong[0].topicName} at ${strong[0].mastery}%.`,
    );
  }
  if (unassessed.length) {
    patterns.push(
      `${unassessed.length} ${unassessed.length === 1 ? "topic has" : "topics have"} not been diagnosed yet.`,
    );
  }
  const highStakesWeak = weak.filter(
    (topic) => topic.importance >= 4 || topic.examFrequency > 0,
  );
  if (highStakesWeak.length) {
    patterns.push(
      `${highStakesWeak.length} weak ${highStakesWeak.length === 1 ? "topic is" : "topics are"} high-importance for exams, so they should be scheduled first.`,
    );
  }

  const recommendations = dedupeStrings(
    assessed
      .filter((topic) => topic.status !== "strong")
      .sort((a, b) => {
        const aScore = (100 - a.mastery) * 0.7 + a.importance * 5;
        const bScore = (100 - b.mastery) * 0.7 + b.importance * 5;
        return bScore - aScore;
      })
      .slice(0, 3)
      .map((topic) => topic.recommendedAction),
  );

  if (!recommendations.length) {
    recommendations.push(
      unassessed.length
        ? "Take a mixed diagnostic quiz to assess the remaining topics."
        : "Keep mastery fresh with one mixed quiz every few days.",
    );
  }

  const summary = totalAttempted
    ? `Your cumulative mastery is ${overall}% across ${assessed.length} assessed ${
        assessed.length === 1 ? "topic" : "topics"
      }. ${
        weak.length
          ? `${weak.length} ${weak.length === 1 ? "topic needs" : "topics need"} targeted revision, starting with ${weak[0].topicName}.`
          : medium.length
            ? `${medium.length} ${medium.length === 1 ? "topic is" : "topics are"} close to strong; focused practice should close the gap.`
            : "Every assessed topic is currently in the strong band — protect that with spaced retrieval."
      }`
    : "No quiz data yet. Upload your material, take the diagnostic quiz, and GapFinder will show exactly which topics need work.";

  return {
    summary,
    patterns,
    recommendations,
    engine: "rule_based",
    generatedAt: new Date().toISOString(),
  };
}

interface AiGapResponse {
  summary?: unknown;
  patterns?: unknown;
  recommendations?: unknown;
}

function stringList(value: unknown, max = 4, maxLength = 280): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 5)
    .slice(0, max)
    .map((item) => item.slice(0, maxLength));
}

async function aiInsight(
  topics: TopicPerformance[],
  base: LearningInsight,
): Promise<{ insight: LearningInsight; warning?: string }> {
  if (!isGroqConfigured()) {
    return {
      insight: base,
      warning:
        "AI narrative requires GROQ_API_KEY; showing the deterministic analysis instead.",
    };
  }

  const payload = {
    overall: base.summary,
    distribution: {
      weak: topics.filter((topic) => topic.status === "weak").length,
      medium: topics.filter((topic) => topic.status === "medium").length,
      strong: topics.filter((topic) => topic.status === "strong").length,
      notAssessed: topics.filter((topic) => topic.attempted === 0).length,
    },
    topics: topics.map((topic) => ({
      name: topic.topicName,
      subject: topic.subjectName,
      mastery: topic.mastery,
      attempted: topic.attempted,
      correct: topic.correct,
      importance: topic.importance,
      examFrequency: topic.examFrequency,
      status: topic.status,
      reason: topic.weaknessReason,
    })),
  };

  try {
    const response = await groqJson<AiGapResponse>({
      messages: [
        {
          role: "system",
          content:
            "You are an academic coach. Analyse only the supplied quiz performance data. Never invent scores or topics. Be specific, encouraging and concise.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Explain this student's learning gaps and give a prioritized action plan.",
            rules: [
              "Only reference topics and scores present in the data.",
              "summary: 2–3 sentences, under 90 words.",
              "patterns: 2–4 bullets about error patterns and priority.",
              "recommendations: 2–4 concrete next actions.",
              "Return valid JSON only.",
            ],
            responseSchema: {
              summary: "string",
              patterns: ["string"],
              recommendations: ["string"],
            },
            data: payload,
          }),
        },
      ],
      temperature: 0.3,
      maxTokens: 1100,
      timeoutMs: 35_000,
      retries: 1,
    });

    const summary =
      typeof response.summary === "string"
        ? response.summary.replace(/\s+/g, " ").trim().slice(0, 700)
        : "";
    const patterns = stringList(response.patterns, 4);
    const recommendations = stringList(response.recommendations, 4);

    if (summary.length < 25 || !recommendations.length) {
      return {
        insight: base,
        warning:
          "The AI gap narrative could not be validated; showing the deterministic analysis.",
      };
    }

    return {
      insight: {
        summary,
        patterns: patterns.length ? patterns : base.patterns,
        recommendations,
        engine: "groq",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      insight: base,
      warning: `AI gap narrative failed (${errorMessage(error)}); showing the deterministic analysis.`,
    };
  }
}

export async function buildGapAnalysis(
  studentId: string,
  options: { withAI?: boolean } = {},
): Promise<GapAnalysis> {
  const [topics, answers, masteryRows] = await Promise.all([
    db.listTopics(studentId),
    db.listAnswers(studentId),
    db.listMastery(studentId),
  ]);

  const masteryMap = new Map(masteryRows.map((row) => [row.topicId, row]));
  const computedRows = new Map(
    calculateMasteryRows(topics, answers).map((row) => [row.topicId, row]),
  );
  const rows = computedRows;

  const performances: TopicPerformance[] = topics.map((topic) => {
    const row = rows.get(topic.id) ?? masteryMap.get(topic.id);
    const attempted = row?.attempted ?? 0;
    const correct = row?.correct ?? 0;
    const mastery = attempted
      ? percentOf(correct, attempted)
      : (row?.mastery ?? 0);
    const status = statusForMastery(mastery, attempted);
    return {
      topicId: topic.id,
      topicName: topic.name,
      subjectName: topic.subjectName,
      attempted,
      correct,
      incorrect: attempted - correct,
      mastery,
      status,
      importance: topic.importance,
      examFrequency: topic.examFrequency,
      subtopics: topic.subtopics,
      citations: topic.citations,
      weaknessReason:
        row?.weaknessReason ?? reasonForPerformance(undefined, "not_assessed"),
      recommendedAction:
        row?.recommendedAction ?? actionForPerformance(topic, "not_assessed"),
      lastAttemptedAt: row?.lastAttemptedAt ?? null,
    };
  });

  // Include historical topic performance that no longer appears in the map.
  for (const row of computedRows.values()) {
    if (performances.some((item) => item.topicId === row.topicId)) continue;
    if (!row.attempted) continue;
    performances.push({
      topicId: row.topicId,
      topicName: row.topicName,
      subjectName: "Previous topic",
      attempted: row.attempted,
      correct: row.correct,
      incorrect: row.incorrect,
      mastery: row.mastery,
      status: row.status,
      importance: 2,
      examFrequency: 0,
      subtopics: [],
      citations: [],
      weaknessReason: row.weaknessReason,
      recommendedAction: row.recommendedAction,
      lastAttemptedAt: row.lastAttemptedAt,
    });
  }

  const questionIds = dedupeStrings(
    answers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId),
  );
  let questions: Question[] = [];
  if (questionIds.length) {
    questions = await db.getQuestionsByIds(studentId, questionIds);
  }
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  const conceptsMap = new Map<
    string,
    {
      topicName: string;
      topicMastery: number;
      missedCount: number;
      totalCount: number;
      examples: IncorrectConcept["examples"];
    }
  >();
  for (const answer of answers.filter((item) => !item.isCorrect)) {
    const topic = performances.find((item) => item.topicId === answer.topicId);
    const key = answer.topicId || answer.topicName;
    const existing = conceptsMap.get(key) ?? {
      topicName: answer.topicName,
      topicMastery: topic?.mastery ?? 0,
      missedCount: 0,
      totalCount: topic?.attempted ?? 0,
      examples: [],
    };
    existing.missedCount += 1;
    if (existing.examples.length < 3) {
      const question = questionMap.get(answer.questionId);
      existing.examples.push({
        question: question?.question ?? "Question unavailable",
        explanation: answer.explanation || question?.explanation || "",
        difficulty: answer.difficulty,
        citation: question?.citations[0] ?? null,
      });
    }
    conceptsMap.set(key, existing);
  }

  const frequentlyIncorrectConcepts = [...conceptsMap.values()]
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 6)
    .map((concept) => {
      const topicId =
        performances.find((topic) => topic.topicName === concept.topicName)
          ?.topicId ?? "";
      return {
        topicId,
        topicName: concept.topicName,
        topicMastery: concept.topicMastery,
        missedCount: concept.missedCount,
        totalCount: concept.totalCount,
        examples: concept.examples,
      } satisfies IncorrectConcept;
    });

  const totalAttempted = performances.reduce(
    (sum, topic) => sum + topic.attempted,
    0,
  );
  const totalCorrect = performances.reduce(
    (sum, topic) => sum + topic.correct,
    0,
  );
  const overallMastery = percentOf(totalCorrect, totalAttempted);
  const distribution = {
    weak: performances.filter((topic) => topic.status === "weak").length,
    medium: performances.filter((topic) => topic.status === "medium").length,
    strong: performances.filter((topic) => topic.status === "strong").length,
    notAssessed: performances.filter((topic) => topic.attempted === 0).length,
  };

  const warnings: string[] = [];
  let insight = ruleBasedInsight(performances, answers);
  let aiEnhanced = false;

  if (options.withAI) {
    const result = await aiInsight(performances, insight);
    insight = result.insight;
    aiEnhanced = result.insight.engine === "groq";
    if (result.warning) warnings.push(result.warning);
    if (isGroqConfigured() && aiEnhanced) {
      warnings.push(`Narrative generated with ${getGroqModel()}.`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    overallMastery,
    totalTopics: performances.length,
    assessedTopics: performances.filter((topic) => topic.attempted > 0).length,
    distribution,
    topics: performances.sort((a, b) => {
      const order = { weak: 0, medium: 1, not_assessed: 2, strong: 3 };
      return order[a.status] - order[b.status] || a.mastery - b.mastery;
    }),
    frequentlyIncorrectConcepts,
    insight,
    aiEnhanced,
    warnings,
  };
}

export function classifyStatus(
  mastery: number,
  attempted: number,
): "weak" | "medium" | "strong" | "not_assessed" {
  return classifyMastery(mastery, attempted);
}
