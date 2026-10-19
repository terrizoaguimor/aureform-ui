"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";

export default function EmptyExample() {
  const [projects, setProjects] = useState<string[]>([]);

  if (!projects.length) {
    return (
      <Empty
        title="A little quiet here."
        description="Create a local example project to get started."
        action={
          <Button
            type="button"
            onClick={() => setProjects(["Untitled project"])}
          >
            Create project
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid justify-items-start gap-3">
      <p role="status" className="text-sm">
        Created locally: {projects[0]}
      </p>
      <Button type="button" variant="outline" onClick={() => setProjects([])}>
        Reset example
      </Button>
    </div>
  );
}
