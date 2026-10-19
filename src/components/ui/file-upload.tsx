"use client";
import { useRef, useState } from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export type UploadLabels = {
  title: string;
  description: string;
  browse: string;
  remove: string;
  tooLarge: string;
  invalidType: string;
};
export function FileUpload({
  files,
  onFilesChange,
  accept,
  maxBytes = 10 * 1024 * 1024,
  multiple = true,
  labels,
  disabled,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  maxBytes?: number;
  multiple?: boolean;
  labels: UploadLabels;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false),
    [error, setError] = useState("");
  const addFiles = (incoming: FileList | null) => {
    if (disabled || !incoming) return;
    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      if (file.size > maxBytes) {
        setError(`${file.name}: ${labels.tooLarge}`);
        return;
      }
      if (
        accept &&
        !accept
          .split(",")
          .some((a) =>
            a.trim().startsWith(".")
              ? file.name.toLowerCase().endsWith(a.trim().toLowerCase())
              : a.trim().endsWith("/*")
                ? file.type.startsWith(a.trim().slice(0, -1))
                : file.type === a.trim(),
          )
      ) {
        setError(`${file.name}: ${labels.invalidType}`);
        return;
      }
      accepted.push(file);
    }
    setError("");
    onFilesChange(
      multiple
        ? [...files, ...accepted].filter(
            (f, i, all) =>
              all.findIndex((a) => a.name === f.name && a.size === f.size) ===
              i,
          )
        : accepted.slice(0, 1),
    );
    if (input.current) input.current.value = "";
  };
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle/40 p-8 text-center",
          dragging && "border-primary bg-accent",
          disabled && "opacity-50",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">{labels.title}</p>
        <p className="text-xs text-muted-foreground">{labels.description}</p>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {labels.browse}
        </Button>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-label={labels.browse}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive-foreground">
          {error}
        </p>
      )}
      <ul className="mt-3 grid gap-2">
        {files.map((file, i) => (
          <li
            key={`${file.name}-${file.size}`}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-xs"
          >
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${labels.remove} ${file.name}`}
              onClick={() => onFilesChange(files.filter((_, n) => n !== i))}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
