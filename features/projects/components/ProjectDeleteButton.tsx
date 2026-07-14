"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import type { ProjectRow } from "@/types/database";

interface ProjectDeleteButtonProps {
  project: ProjectRow;
}

export function ProjectDeleteButton({ project }: ProjectDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:border-destructive/30"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <DeleteProjectDialog project={project} open={open} onOpenChange={setOpen} />
    </>
  );
}
