import type {
  AttemptSummary,
  AttemptTopicBreakdown,
  DailyActivity,
  MasteryTrendPoint,
  ProgressData,
  TopicImprovement,
} from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import { buildGapAnalysis } from "@/backend/services/gapAnalysisService";
import {
  addDaysISO,
  formatShortDate,
  percentOf,
  statusForMastery,
  todayISO,
} from "@/lib/utils";

function computeStreak(activeDates: Set<string>): number {
  const today = todayISO();
  let cursor = activeDates.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (activeDates.has(cursor) && streak < 366) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

function buildAttemptBreakdown(
  answers: { topicId: string; topicName: string; isCorrect: boolean }[],
): AttemptTopicBreakdown[] {
  const map = new Map<
    string,
    { topicId: string; topicName: string; correct: number; total: number }
  >();
  for (const answer of answers) {
    const entry = map.get(answer.topicId) ?? {
      topicId: answer.topicId,
      topicName: answer.topicName,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    map.set(answer.topicId, entry);
  }
  return [...map.values()]
    .map((entry) => {
      const percentage = percentOf(entry.correct, entry.total);
      return {
        ...entry,
        percentage,
        status: statusForMastery(percentage, entry.total),
      };
    })
    .sort((a, b) => a.percentage - b.percentage);
}

export async function buildProgressData(studentId: string): Promise<ProgressData> {
  const [gapAnalysis, allAttempts, answers, materials, chunkCount, plan] =
    await Promise.all([
      buildGapAnalysis(studentId),
      db.listAttempts(studentId),
      db.listAnswers(studentId),
      db.listMaterials(studentId),
      db.countChunks(studentId),
      db.getLatestPlan(studentId),
    ]);

  const submittedAttempts = allAttempts
    .filter((attempt) => attempt.status === "submitted")
    .sort((a, b) =>
      (a.submittedAt ?? a.startedAt).localeCompare(b.submittedAt ?? b.startedAt),
    );

  const answersByAttempt = new Map<string, typeof answers>();
  for (const answer of answers) {
    const list = answersByAttempt.get(answer.attemptId) ?? [];
    list.push(answer);
    answersByAttempt.set(answer.attemptId, list);
  }

  const attempts: AttemptSummary[] = [...submittedAttempts]
    .reverse()
    .map((attempt) => ({
      id: attempt.id,
      title: attempt.title,
      status: attempt.status,
      engine: attempt.engine,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationSeconds: attempt.durationSeconds,
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      scorePercentage: attempt.scorePercentage,
      topics: buildAttemptBreakdown(answersByAttempt.get(attempt.id) ?? []),
    }));

  const masteryTrend: MasteryTrendPoint[] = [];
  let cumulativeCorrect = 0;
  let cumulativeTotal = 0;
  for (const attempt of submittedAttempts) {
    cumulativeCorrect += attempt.correctCount;
    cumulativeTotal += attempt.totalQuestions;
    masteryTrend.push({
      date: attempt.submittedAt ?? attempt.startedAt,
      label: formatShortDate(attempt.submittedAt ?? attempt.startedAt),
      mastery: percentOf(cumulativeCorrect, cumulativeTotal),
      quizScore: attempt.scorePercentage,
      attemptId: attempt.id,
    });
  }

  const completedTasks = plan?.tasks.filter((task) => task.completed) ?? [];
  const activityMap = new Map<
    string,
    { minutes: number; questions: number; quizzes: number; tasks: number }
  >();
  const ensureDay = (date: string) => {
    const current = activityMap.get(date) ?? {
      minutes: 0,
      questions: 0,
      quizzes: 0,
      tasks: 0,
    };
    activityMap.set(date, current);
    return current;
  };

  for (const attempt of submittedAttempts) {
    const date = (attempt.submittedAt ?? attempt.startedAt).slice(0, 10);
    const day = ensureDay(date);
    day.minutes += attempt.durationSeconds / 60;
    day.questions += attempt.totalQuestions;
    day.quizzes += 1;
  }
  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    const date = task.completedAt.slice(0, 10);
    const day = ensureDay(date);
    day.minutes += task.durationMinutes;
    day.tasks += 1;
  }

  const today = todayISO();
  const activity: DailyActivity[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysISO(today, index - 6);
    const entry = activityMap.get(date);
    return {
      date,
      label: formatShortDate(`${date}T12:00:00.000Z`),
      minutes: Math.round(entry?.minutes ?? 0),
      questions: entry?.questions ?? 0,
      quizzes: entry?.quizzes ?? 0,
      tasksCompleted: entry?.tasks ?? 0,
    };
  });

  const answersByTopic = new Map<string, typeof answers>();
  for (const answer of answers) {
    const list = answersByTopic.get(answer.topicId) ?? [];
    list.push(answer);
    answersByTopic.set(answer.topicId, list);
  }
  const attemptDate = new Map(
    submittedAttempts.map((attempt) => [
      attempt.id,
      attempt.submittedAt ?? attempt.startedAt,
    ]),
  );

  const topicImprovements: TopicImprovement[] = [];
  for (const topic of gapAnalysis.topics) {
    const topicAnswers = (answersByTopic.get(topic.topicId) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!topicAnswers.length) continue;

    const byAttempt = new Map<string, { correct: number; total: number; date: string }>();
    for (const answer of topicAnswers) {
      const date = attemptDate.get(answer.attemptId) ?? answer.createdAt;
      const entry = byAttempt.get(answer.attemptId) ?? {
        correct: 0,
        total: 0,
        date,
      };
      entry.total += 1;
      if (answer.isCorrect) entry.correct += 1;
      byAttempt.set(answer.attemptId, entry);
    }
    const ordered = [...byAttempt.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (!ordered.length) continue;
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const firstScore = percentOf(first.correct, first.total);
    const latestScore = percentOf(latest.correct, latest.total);

    topicImprovements.push({
      topicId: topic.topicId,
      topicName: topic.topicName,
      firstScore,
      latestScore,
      delta: latestScore - firstScore,
      attempts: ordered.length,
      status: topic.status,
    });
  }
  topicImprovements.sort((a, b) => b.delta - a.delta);

  const studyMinutes = Math.round(
    submittedAttempts.reduce(
      (sum, attempt) => sum + attempt.durationSeconds / 60,
      0,
    ) + completedTasks.reduce((sum, task) => sum + task.durationMinutes, 0),
  );

  const activeDates = new Set(activityMap.keys());
  const todayTasks =
    plan?.tasks
      ?.filter(
        (task) =>
          task.scheduledDate === today
            ? !task.completed
            : !task.completed && task.scheduledDate < today,
      )
      .slice(0, 14) ?? [];

  return {
    stats: {
      overallMastery: gapAnalysis.overallMastery,
      topicsAnalyzed: gapAnalysis.totalTopics,
      knowledgeGaps: gapAnalysis.distribution.weak,
      studyMinutes,
      totalQuestionsAnswered: answers.length,
      quizzesTaken: submittedAttempts.length,
      materialsCount: materials.length,
      chunkCount,
      currentStreak: computeStreak(activeDates),
    },
    attempts,
    masteryTrend,
    activity,
    topicImprovements,
    todayTasks,
    latestPlan: plan,
    gapAnalysis,
    hasMaterials: materials.length > 0,
    hasTopics: gapAnalysis.totalTopics > 0,
    hasAttempts: submittedAttempts.length > 0,
    hasDemoMaterials: materials.some((material) => material.isDemo),
  };
}
