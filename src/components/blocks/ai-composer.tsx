"use client";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export type AIComposerLabels = {
  placeholder: string;
  input: string;
  send: string;
  stop: string;
  model: string;
  attach: string;
  balanced: string;
  precise: string;
  creative: string;
  attached: string;
};
export function AIComposer({
  prompt,
  onPromptChange,
  onSend,
  onCancel,
  pending,
  model,
  onModelChange,
  labels,
  className,
  onAttach,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  pending: boolean;
  model: string;
  onModelChange: (value: string) => void;
  labels: AIComposerLabels;
  className?: string;
  onAttach?: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (prompt.trim() && !pending) onSend();
      }}
      className={cn(
        "af-card af-shadow-elevated relative isolate overflow-hidden rounded-xl border border-border bg-surface p-3 transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 sm:p-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-75"
        style={{ background: "var(--af-gradient-text)" }}
      />
      <Textarea
        aria-label={labels.input}
        placeholder={labels.placeholder}
        value={prompt}
        maxLength={4000}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!pending && prompt.trim()) onSend();
          }
        }}
        className="min-h-24 resize-none border-0 bg-transparent px-2 text-sm leading-7 shadow-none hover:border-transparent focus-visible:ring-0"
      />
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/65 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Select
            value={model}
            onValueChange={onModelChange}
            aria-label={labels.model}
            options={[
              { value: "balanced", label: labels.balanced },
              { value: "precise", label: labels.precise },
              { value: "creative", label: labels.creative },
            ]}
            className="h-9 w-[min(190px,44vw)] bg-surface-subtle/65 text-[13px]"
          />
          {onAttach && (
            <>
              <Button
                type="button"
                aria-label={labels.attach}
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip aria-hidden="true" />
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,.csv,.json"
                className="sr-only"
                tabIndex={-1}
                aria-label={labels.attach}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAttach(file);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
        {pending ? (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <Square className="size-3!" aria-hidden="true" />
            {labels.stop}
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            appearance="gradient"
            aria-label={labels.send}
            disabled={!prompt.trim()}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
