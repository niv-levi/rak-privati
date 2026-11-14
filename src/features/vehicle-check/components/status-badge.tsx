import { CheckCircle2, CircleDashed, CircleHelp, CloudOff, Info, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dataStatusLabels } from "@/lib/labels";
import type { DataStatus } from "@/lib/providers/types";

const map: Record<DataStatus, { variant: "success" | "warning" | "muted" | "destructive" | "outline" | "secondary"; Icon: typeof CheckCircle2 }> = {
  available: { variant: "success", Icon: CheckCircle2 },
  partial: { variant: "warning", Icon: CircleDashed },
  not_found: { variant: "muted", Icon: Search },
  needs_review: { variant: "warning", Icon: CircleHelp },
  unavailable: { variant: "destructive", Icon: CloudOff },
  not_configured: { variant: "outline", Icon: Info },
};

export function DataStatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  const { variant, Icon } = map[status];
  return (
    <Badge variant={variant} className={className}>
      <Icon aria-hidden /> {dataStatusLabels[status]}
    </Badge>
  );
}
