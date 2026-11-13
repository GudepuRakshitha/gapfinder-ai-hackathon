import type { Metadata } from "next";
import { TopicsView } from "@/components/topics/TopicsView";

export const metadata: Metadata = { title: "Topic map" };

export default function TopicsPage() {
  return <TopicsView />;
}
