import type { Metadata } from "next";
import { RevisionPlanView } from "@/components/revision/RevisionPlanView";

export const metadata: Metadata = { title: "Revision plan" };

export default function RevisionPlanPage() {
  return <RevisionPlanView />;
}
