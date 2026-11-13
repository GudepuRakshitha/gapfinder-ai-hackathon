import type { StrengthStatus } from "@/backend/types";
import { STATUS_META } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: StrengthStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const tone =
    status === "strong"
      ? "success"
      : status === "medium"
        ? "warning"
        : status === "weak"
          ? "danger"
          : "neutral";
  return (
    <Badge tone={tone} className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}
