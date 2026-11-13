import type { AIEngine } from "@/backend/types";
import { Badge } from "@/components/ui";
import { Bot, Cpu, Search } from "lucide-react";

const ENGINE_META: Record<
  AIEngine,
  { label: string; tone: "brand" | "info" | "neutral"; icon: typeof Bot }
> = {
  groq: { label: "Groq · Llama", tone: "brand", icon: Bot },
  extractive: { label: "Grounded extractive", tone: "info", icon: Cpu },
  rule_based: { label: "Rule-based", tone: "neutral", icon: Cpu },
  retrieval_only: { label: "Retrieval only", tone: "info", icon: Search },
  mixed: { label: "AI + extractive", tone: "info", icon: Cpu },
};

export function EngineBadge({
  engine,
  className,
}: {
  engine: AIEngine;
  className?: string;
}) {
  const meta = ENGINE_META[engine] ?? ENGINE_META.rule_based;
  return (
    <Badge tone={meta.tone} className={className} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}
