import type { Metadata } from "next";
import { QuizView } from "@/components/quiz/QuizView";

export const metadata: Metadata = { title: "Diagnostic quiz" };

export default async function QuizPage({ searchParams }: PageProps<"/quiz">) {
  const params = await searchParams;
  const topicId = typeof params.topicId === "string" ? params.topicId : undefined;
  return <QuizView initialTopicId={topicId} />;
}
