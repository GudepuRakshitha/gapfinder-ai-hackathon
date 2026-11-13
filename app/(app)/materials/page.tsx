import type { Metadata } from "next";
import { MaterialsView } from "@/components/materials/MaterialsView";

export const metadata: Metadata = { title: "Study materials" };

export default async function MaterialsPage({ searchParams }: PageProps<"/materials">) {
  const params = await searchParams;
  return <MaterialsView autoSample={params.sample === "1"} />;
}
