import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatDate, proposalStatusColor, cn } from "@/lib/utils";
import { Download, GripVertical, Zap } from "lucide-react";

interface ProposalCardProps {
  proposal: any;
  /** When false, hide status pill (e.g. on kanban where column is the status) */
  showStatusBadge?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function ProposalCard({
  proposal,
  showStatusBadge = true,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}: ProposalCardProps) {
  const inner = (
    <Card
      className={cn(
        "transition-shadow",
        draggable
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "hover:shadow-md",
        isDragging && "opacity-60 ring-2 ring-violet-400"
      )}
    >
      <CardContent className="py-4">
        <div className="mb-3 flex items-start gap-2">
          {draggable && (
            <div
              className="mt-0.5 shrink-0 text-muted-foreground"
              title="Drag to change status"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/proposals/${proposal.id}`} className="group/title block">
              <h3 className="text-sm font-semibold text-foreground group-hover/title:text-brand-600">
                {proposal.title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{proposal.lead?.name}</p>
            {showStatusBadge && proposal.proposalStatus && (
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${proposalStatusColor(proposal.proposalStatus.key)}`}
              >
                {proposal.proposalStatus.label}
              </span>
            )}
          </div>
          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Download PDF"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {proposal.systemSizeKw != null && (
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              {formatNumber(proposal.systemSizeKw)} kW
            </span>
          )}
          {proposal.installCost != null && <span>{formatCurrency(proposal.installCost)}</span>}
          {proposal.paybackYears != null && <span>{proposal.paybackYears} yr payback</span>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{formatDate(proposal.createdAt)}</p>
        {draggable && (
          <Link
            href={`/proposals/${proposal.id}`}
            draggable={false}
            onClick={(ev) => ev.stopPropagation()}
            className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View proposal →
          </Link>
        )}
      </CardContent>
    </Card>
  );

  if (draggable) {
    return (
      <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {inner}
      </div>
    );
  }

  return inner;
}
