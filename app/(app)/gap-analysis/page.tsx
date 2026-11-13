import type { Metadata } from "next";
import { GapAnalysisView } from "@/components/gap/GapAnalysisView";

export const metadata: Metadata = { title: "Gap analysis" };

export default function GapAnalysisPage() {
  return <GapAnalysisView />;
}
