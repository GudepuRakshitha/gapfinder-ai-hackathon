import type {
  AttemptTopicBreakdown,
  EvaluateRequest,
  EvaluateResponse,
  EvaluatedQuestion,
  QuizAttempt,
  StudentAnswer,
} from "@/backend/types";
import { db } from "@/backend/database/databaseQueries";
import {
  buildTopicBreakdown,
  isAnswerCorrect,
  scoreAttempt,
} from "@/backend/utils/calculateScore";
import { recomputeTopicMastery } from "@/backend/services/gapAnalysisService";
import { refreshPlan } from "@/backend/services/revisionService";
import {
  groqJson,
  isGroqConfigured,
} from "@/backend/services/groqService";
import { newId } from "@/backend/utils/id";
import {
  ConflictError,
  ValidationError,
  errorMessage,
} from "@/backend/utils/errors";
import { percentOf } from "@/lib/utils";
import { validateSelectedOption } from "@/backend/utils/validateInput";

interface AiFeedbackResponse {
  feedback?: Array<{ questionId?: unknown; message?: unknown }>;
}

async function generateAiFeedback(
  evaluated: EvaluatedQuestion[],
): Promise<{ feedback: Map<string, string>; warning?: string }> {
  const feedback = new Map<string, string>();
  if (!isGroqConfigured()) return { feedback };

  const wrong = evaluated.filter((item) => !item.isCorrect);
  if (!wrong.length) return { feedback };

  try {
    const response = await groqJson<AiFeedbackResponse>({
      messages: [
        {
          role: "system",
          content:
            "You are a supportive tutor. You explain mistakes using only the supplied source-grounded explanations. Never change the marked correct answer. Keep each message under 45 words.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Give one personalized misconception correction and one next step for each wrong answer.",
            rules: [
              "Do not invent facts outside the source explanation.",
              "Reference the student's selected option to explain the likely misconception.",
              "Return valid JSON only.",
            ],
            responseSchema: {
              feedback: [{ questionId: "string", message: "string" }],
            },
            wrongAnswers: wrong.slice(0, 8).map((item) => ({
              questionId: item.questionId,
              question: item.question,
              selected: item.selectedOptionIndex,
              selectedText:
                item.selectedOptionIndex === null
                  ? "No answer"
                  : item.options[item.selectedOptionIndex],
              correctText: item.options[item.correctOptionIndex],
              sourceExplanation: item.explanation,
            })),
          }),
        },
      ],
      temperature: 0.3,
      maxTokens: 900,
      timeoutMs: 30_000,
      retries: 1,
    });

    const allowed = new Set(wrong.map((item) => item.questionId));
    for (const item of response.feedback ?? []) {
      if (
        typeof item.questionId === "string" &&
        allowed.has(item.questionId) &&
        typeof item.message === "string" &&
        item.message.trim().length >= 10
      ) {
        feedback.set(item.questionId, item.message.trim().slice(0, 400));
      }
    }

    return feedback.size
      ? { feedback }
      : {
          feedback,
          warning:
            "AI feedback could not be validated; source explanations are shown instead.",
        };
  } catch (error) {
    return {
      feedback,
      warning: `AI feedback was unavailable (${errorMessage(error)}). Source explanations are shown instead.`,
    };
  }
}

export async function evaluateAttempt(
  studentId: string,
  request: EvaluateRequest,
): Promise<EvaluateResponse> {
  const attempt = await db.getAttempt(studentId, request.attemptId);
  if (!attempt) {
    throw new ValidationError("Quiz attempt not found.");
  }
  if (attempt.status === "submitted") {
    throw new ConflictError(
      "This quiz attempt has already been submitted. Start a new quiz to try again.",
    );
  }

  const questions = await db.listQuestionsForAttempt(studentId, attempt.id);
  if (!questions.length) {
    throw new ValidationError("This quiz attempt has no questions.");
  }

  const submitted = new Map(
    (request.answers ?? []).map((answer) => [
      answer.questionId,
      validateSelectedOption(answer.selectedOptionIndex),
    ]),
  );

  const scored = questions.map((question) => {
    const selectedOptionIndex = submitted.has(question.id)
      ? (submitted.get(question.id) ?? null)
      : null;
    return {
      question,
      selectedOptionIndex,
      isCorrect: isAnswerCorrect(question, selectedOptionIndex),
    };
  });

  const score = scoreAttempt(scored);
  const breakdown: AttemptTopicBreakdown[] = buildTopicBreakdown(scored);

  const now = new Date().toISOString();
  const duration = Math.max(
    0,
    Math.min(4 * 60 * 60, Math.round(Number(request.durationSeconds) || 0)),
  );

  const answers: StudentAnswer[] = scored.map((item) => ({
    id: newId(),
    attemptId: attempt.id,
    questionId: item.question.id,
    studentId,
    topicId: item.question.topicId,
    topicName: item.question.topicName,
    difficulty: item.question.difficulty,
    selectedOptionIndex: item.selectedOptionIndex,
    isCorrect: item.isCorrect,
    explanation: item.question.explanation,
    feedback: item.isCorrect
      ? "Correct. Your answer matches the source-grounded answer."
      : `Not quite. The correct answer is “${
          item.question.options[item.question.correctOptionIndex]
        }”.`,
    createdAt: now,
  }));

  const evaluated: EvaluatedQuestion[] = scored.map((item) => ({
    questionId: item.question.id,
    question: item.question.question,
    options: item.question.options,
    selectedOptionIndex: item.selectedOptionIndex,
    correctOptionIndex: item.question.correctOptionIndex,
    isCorrect: item.isCorrect,
    explanation: item.question.explanation,
    feedback:
      answers.find((answer) => answer.questionId === item.question.id)?.feedback ??
      "",
    difficulty: item.question.difficulty,
    topicId: item.question.topicId,
    topicName: item.question.topicName,
    citations: item.question.citations,
  }));

  const warnings: string[] = [];
  const aiFeedback = await generateAiFeedback(evaluated);
  if (aiFeedback.warning) warnings.push(aiFeedback.warning);
  for (const answer of answers) {
    const personalized = aiFeedback.feedback.get(answer.questionId);
    if (personalized) {
      answer.feedback = `${answer.feedback} ${personalized}`.trim();
      const match = evaluated.find(
        (item) => item.questionId === answer.questionId,
      );
      if (match) match.feedback = answer.feedback;
    }
  }

  const updatedAttempt: QuizAttempt = await db.updateAttempt(studentId, attempt.id, {
    status: "submitted",
    submittedAt: now,
    durationSeconds: duration,
    correctCount: score.correctCount,
    totalQuestions: score.totalQuestions,
    scorePercentage: score.scorePercentage,
  });

  await db.createAnswers(answers);

  const masteryRows = await recomputeTopicMastery(studentId);
  const totalAttempted = masteryRows.reduce(
    (sum, row) => sum + row.attempted,
    0,
  );
  const totalCorrect = masteryRows.reduce((sum, row) => sum + row.correct, 0);
  const overallMastery = percentOf(totalCorrect, totalAttempted);

  let planUpdated = false;
  try {
    planUpdated = await refreshPlan(studentId);
  } catch (error) {
    warnings.push(
      `Your quiz was saved, but the revision plan could not be refreshed automatically (${errorMessage(error)}). Open the revision plan to regenerate it.`,
    );
  }

  return {
    attempt: {
      ...updatedAttempt,
      totalQuestions: score.totalQuestions,
      correctCount: score.correctCount,
      scorePercentage: score.scorePercentage,
    },
    results: evaluated,
    topicBreakdown: breakdown,
    planUpdated,
    overallMastery,
    warnings,
  };
}
