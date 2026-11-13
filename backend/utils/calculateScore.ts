import type {
  AttemptTopicBreakdown,
  Question,
  StrengthStatus,
} from "@/backend/types";
import { percentOf, statusForMastery } from "@/lib/utils";
import { STRENGTH_THRESHOLDS } from "@/lib/constants";

export interface ScoredAnswer {
  question: Question;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
}

export function isAnswerCorrect(
  question: Pick<Question, "correctOptionIndex">,
  selectedOptionIndex: number | null,
): boolean {
  return (
    selectedOptionIndex !== null &&
    selectedOptionIndex === question.correctOptionIndex
  );
}

export function scoreAttempt(scored: ScoredAnswer[]): {
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
} {
  const totalQuestions = scored.length;
  const correctCount = scored.filter((answer) => answer.isCorrect).length;
  return {
    correctCount,
    totalQuestions,
    scorePercentage: percentOf(correctCount, totalQuestions),
  };
}

export function classifyMastery(
  mastery: number,
  attempted: number,
): StrengthStatus {
  if (attempted <= 0) return "not_assessed";
  if (mastery >= STRENGTH_THRESHOLDS.strong) return "strong";
  if (mastery >= STRENGTH_THRESHOLDS.medium) return "medium";
  return "weak";
}

export function buildTopicBreakdown(
  scored: ScoredAnswer[],
): AttemptTopicBreakdown[] {
  const map = new Map<
    string,
    { topicId: string; topicName: string; correct: number; total: number }
  >();

  for (const answer of scored) {
    const key = answer.question.topicId;
    const existing = map.get(key) ?? {
      topicId: answer.question.topicId,
      topicName: answer.question.topicName,
      correct: 0,
      total: 0,
    };
    existing.total += 1;
    if (answer.isCorrect) existing.correct += 1;
    map.set(key, existing);
  }

  return [...map.values()]
    .map((item) => {
      const percentage = percentOf(item.correct, item.total);
      return {
        ...item,
        percentage,
        status: statusForMastery(percentage, item.total),
      };
    })
    .sort((a, b) => a.percentage - b.percentage);
}

export function cumulativeMastery(
  answers: { isCorrect: boolean }[],
): number {
  if (!answers.length) return 0;
  return percentOf(
    answers.filter((answer) => answer.isCorrect).length,
    answers.length,
  );
}
