"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export default function ButtonGroupExample() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const projects = ["Studio", "Morrow", "Arc"];

  return (
    <div className="grid gap-4">
      <ButtonGroup aria-label="Project layout">
        <Button
          type="button"
          variant="outline"
          aria-pressed={view === "grid"}
          onClick={() => setView("grid")}
        >
          Grid
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          List
        </Button>
      </ButtonGroup>
      <ul className={view === "grid" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
        {projects.map((project) => (
          <li
            key={project}
            className="rounded-lg border border-border p-4 text-sm"
          >
            {project}
          </li>
        ))}
      </ul>
    </div>
  );
}
