"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ArrowUpRight, FileText, Hash, Search } from "lucide-react";
import type { Locale } from "@/i18n/messages";
import {
  documentationPath,
  type DocNavigationItem,
  type DocumentationHeading,
} from "@/lib/documentation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type { DocumentationHeading } from "@/lib/documentation";

/**
 * The server's keywords make heading terms in every article searchable.
 * Optional heading metadata adds direct section results with known anchor IDs.
 * Pass serializable metadata, never the article bodies.
 * The active article falls back to DocumentationShell's headings prop.
 */
export type DocumentationSearchArticle = DocNavigationItem & {
  headings?: readonly DocumentationHeading[];
};

export interface DocumentationSearchProps {
  locale: Locale;
  activeSlug: string;
  articles: readonly DocumentationSearchArticle[];
  headings: readonly DocumentationHeading[];
  className?: string;
}

/**
 * Slugs are relative to /docs; "start" is the documentation home.
 * Keep this path unprefixed: Next Link/router apply basePath themselves.
 */
export function documentationArticleHref(
  locale: Locale,
  slug: string,
  headingId?: string,
) {
  const path = documentationPath(locale, slug);
  return headingId ? `${path}#${encodeURIComponent(headingId)}` : path;
}

type SearchResult = {
  key: string;
  href: string;
  title: string;
  description: string;
  group: string;
  section: boolean;
  normalizedTitle: string;
  normalizedDescription: string;
  normalizedGroup: string;
  normalizedKeywords: string;
  searchable: string;
};

const resultLimit = 32;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isEditing(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      Boolean(
        target.closest(
          'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
        ),
      ))
  );
}

export function DocumentationSearch({
  locale,
  activeSlug,
  articles,
  headings,
  className,
}: DocumentationSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const text = (en: string, es: string) => (locale === "es" ? es : en);
  const label = text("Search documentation", "Buscar documentación");

  const changeOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "k" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing ||
        event.defaultPrevented ||
        isEditing(event.target) ||
        // Base UI traps focus without requiring an aria-modal attribute.
        document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        return;
      }
      event.preventDefault();
      changeOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [changeOpen]);

  const index = useMemo(() => {
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    for (const article of articles) {
      const articleHeadings =
        article.headings ?? (article.slug === activeSlug ? headings : []);
      const normalizedTitle = normalize(article.title);
      const normalizedDescription = normalize(article.description);
      const normalizedGroup = normalize(article.group);
      const normalizedKeywords = normalize((article.keywords ?? []).join(" "));
      const base = `${normalizedTitle} ${normalizedDescription} ${normalizedGroup}`;
      const key = `article:${article.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          key,
          href: documentationArticleHref(locale, article.slug),
          title: article.title,
          description: article.description,
          group: article.group,
          section: false,
          normalizedTitle,
          normalizedDescription,
          normalizedGroup,
          normalizedKeywords,
          searchable: `${base} ${normalizedKeywords} ${normalize(articleHeadings.map((heading) => heading.text).join(" "))}`,
        });
      }
      for (const heading of articleHeadings) {
        if (!heading.id || !heading.text) continue;
        const headingKey = `section:${article.slug}#${heading.id}`;
        if (seen.has(headingKey)) continue;
        seen.add(headingKey);
        results.push({
          key: headingKey,
          href: documentationArticleHref(locale, article.slug, heading.id),
          title: heading.text,
          description: article.title,
          group: article.group,
          section: true,
          normalizedTitle: normalize(heading.text),
          normalizedDescription: `${normalizedTitle} ${normalizedDescription}`,
          normalizedGroup,
          normalizedKeywords: "",
          searchable: `${base} ${normalize(heading.text)}`,
        });
      }
    }
    return results;
  }, [activeSlug, articles, headings, locale]);

  const matches = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return index.filter((result) => !result.section);
    return index
      .filter(
        (result) =>
          tokens.every((token) => result.searchable.includes(token)) &&
          (!result.section ||
            tokens.some((token) => result.normalizedTitle.includes(token))),
      )
      .map((result, order) => ({
        result,
        order,
        score: tokens.reduce(
          (score, token) =>
            score +
            (result.normalizedTitle.includes(token) ? 40 : 0) +
            (result.normalizedTitle.startsWith(token) ? 20 : 0) +
            (result.normalizedKeywords.includes(token) ? 16 : 0) +
            (result.normalizedDescription.includes(token) ? 10 : 0) +
            (result.normalizedGroup.includes(token) ? 4 : 0),
          0,
        ),
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map(({ result }) => result);
  }, [index, query]);

  const shown = matches.slice(0, resultLimit);
  const groups = new Map<string, SearchResult[]>();
  for (const result of shown) {
    const group = query.trim()
      ? text("Results", "Resultados")
      : result.group || text("Guides", "Guías");
    groups.set(group, [...(groups.get(group) ?? []), result]);
  }
  const count = new Intl.NumberFormat(locale).format(matches.length);
  const resultStatus =
    matches.length > resultLimit
      ? text(
          `Showing ${resultLimit} of ${count} results. Refine your search.`,
          `Mostrando ${resultLimit} de ${count} resultados. Afina la búsqueda.`,
        )
      : text(
          `${count} ${matches.length === 1 ? "result" : "results"}`,
          `${count} ${matches.length === 1 ? "resultado" : "resultados"}`,
        );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        aria-label={label}
        aria-keyshortcuts="Meta+K Control+K"
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "size-8 gap-2 px-0 text-muted-foreground motion-reduce:transition-none md:h-9 md:w-60 md:justify-start md:px-3",
              className,
            )}
          />
        }
      >
        <Search aria-hidden="true" />
        <span className="hidden min-w-0 truncate text-xs md:inline">
          {label}
        </span>
        <kbd
          aria-hidden="true"
          className="ml-auto hidden shrink-0 rounded border border-border bg-surface-subtle px-1.5 py-0.5 font-sans text-[10px] xl:inline"
        >
          ⌘ / Ctrl K
        </kbd>
      </DialogTrigger>
      <DialogContent
        lang={locale}
        initialFocus={inputRef}
        closeLabel={text("Close search", "Cerrar búsqueda")}
        className="flex max-w-2xl flex-col overflow-hidden rounded-2xl p-0"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          {text(
            "Search article titles, descriptions and section headings. Use the arrow keys to choose a result, then Enter to open it.",
            "Busca títulos, descripciones y encabezados. Usa las flechas para elegir un resultado y Enter para abrirlo.",
          )}
        </DialogDescription>
        <Command
          label={label}
          shouldFilter={false}
          loop
          className="flex min-h-0 flex-col"
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 pr-12">
            <Search
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              aria-label={label}
              placeholder={text(
                "Try installation, tokens, Figma…",
                "Prueba instalación, tokens, Figma…",
              )}
              className="h-16 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Command.List
            aria-label={text(
              "Documentation results",
              "Resultados de documentación",
            )}
            className="max-h-[min(55dvh,440px)] min-h-0 overflow-y-auto overscroll-contain p-2"
          >
            <Command.Empty className="px-6 py-12 text-center">
              <FileText
                className="mx-auto mb-3 size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                {text("No matching articles", "No hay artículos coincidentes")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {text(
                  "Try a shorter phrase or another section title.",
                  "Prueba una frase más corta u otro título de sección.",
                )}
              </p>
            </Command.Empty>
            {[...groups].map(([group, results]) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {results.map((result) => {
                  const Icon = result.section ? Hash : FileText;
                  return (
                    <Command.Item
                      key={result.key}
                      value={result.key}
                      onSelect={() => {
                        changeOpen(false);
                        router.push(result.href);
                      }}
                      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 text-foreground outline-none transition-colors aria-selected:border-primary/20 aria-selected:bg-accent aria-selected:text-accent-foreground motion-reduce:transition-none"
                    >
                      <span className="mt-0.5 rounded-lg border border-border bg-surface p-2 text-muted-foreground group-aria-selected:border-primary/25 group-aria-selected:text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {result.title}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {result.section
                            ? `${text("Section in", "Sección en")} ${result.description}`
                            : result.description}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-subtle/60 px-5 py-3 text-[11px] text-muted-foreground">
          <span role="status" aria-live="polite" aria-atomic="true">
            {resultStatus}
          </span>
          <span aria-hidden="true">
            {text(
              "↑ ↓ navigate · Enter open · Esc close",
              "↑ ↓ elegir · Enter abrir · Esc cerrar",
            )}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
