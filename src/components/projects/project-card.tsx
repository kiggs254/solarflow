import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Zap, CheckSquare, GripVertical } from "lucide-react";

interface ProjectCardProps {
  project: any;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function ProjectCard({
  project,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}: ProjectCardProps) {
  const inner = (
    <Card
      className={cn(
        "transition-shadow",
        draggable
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "cursor-pointer group-hover:shadow-md",
        isDragging && "opacity-60 ring-2 ring-sky-400"
      )}
    >
      <CardContent className="py-4">
        <div className="mb-3 flex items-start gap-2">
          {draggable && (
            <div
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-muted-foreground"
              title="Drag to change status"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{project.lead?.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {project.systemSizeKw && (
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              {formatNumber(project.systemSizeKw)} kW
            </span>
          )}
          {project.estimatedCost && <span>{formatCurrency(project.estimatedCost)}</span>}
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {project._count?.tasks ?? 0} tasks
          </span>
        </div>
        {!draggable && (
          <p className="mt-3 text-xs font-medium text-brand-600 group-hover:text-brand-700">
            Open project →
          </p>
        )}
        {draggable && (
          <Link
            href={`/projects/${project.id}`}
            draggable={false}
            onClick={(ev) => ev.stopPropagation()}
            className="mt-3 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View project →
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

  return (
    <Link href={`/projects/${project.id}`} className="group block">
      {inner}
    </Link>
  );
}
