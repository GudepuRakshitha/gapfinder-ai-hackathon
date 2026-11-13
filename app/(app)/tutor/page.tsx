import type { Metadata } from "next";
import { TutorView } from "@/components/tutor/TutorView";

export const metadata: Metadata = { title: "AI tutor" };

export default async function TutorPage({ searchParams }: PageProps<"/tutor">) {
  const params = await searchParams;
  const topicId = typeof params.topicId === "string" ? params.topicId : undefined;
  return <TutorView initialTopicId={topicId} />;
}
