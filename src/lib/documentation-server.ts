import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { posix } from "node:path";
import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import GithubSlugger from "github-slugger";
import {
  documentationArticles,
  documentationContentLocale,
  documentationPath,
  getDocumentationArticle,
  type DocumentationHeading,
  type DocNavigationItem,
} from "@/lib/documentation";
import type { Locale } from "@/i18n/messages";
import { githubUrl } from "@/lib/catalog";
import { publicPath } from "@/lib/public-path";

type TextNode = {
  type: string;
  value?: string;
  alt?: string | null;
  depth?: number;
  children?: TextNode[];
  data?: { hProperties?: Record<string, unknown> };
};

export function documentationNodeText(node: TextNode): string {
  return (
    node.value ??
    node.alt ??
    node.children?.map(documentationNodeText).join("") ??
    ""
  );
}

function visitHeadings(
  node: TextNode,
  slugger: GithubSlugger,
  headings: DocumentationHeading[],
  assignIds: boolean,
) {
  if (node.type === "heading" && node.depth) {
    const text = documentationNodeText(node);
    const id = slugger.slug(text);
    if (assignIds) {
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id },
      };
    }
    if (node.depth <= 3) {
      headings.push({ id, text, level: node.depth });
    }
  }
  for (const child of node.children ?? []) {
    visitHeadings(child, slugger, headings, assignIds);
  }
}

/** The same AST and slug rules power rendered anchors, search and the outline. */
export function documentationHeadingIds() {
  return (tree: TextNode) => {
    visitHeadings(tree, new GithubSlugger(), [], true);
  };
}
export function documentationHeadings(content: string): DocumentationHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);
  const headings: DocumentationHeading[] = [];
  visitHeadings(tree, new GithubSlugger(), headings, false);
  return headings;
}

export const readDocumentationArticle = cache(
  async (locale: Locale, slug: string) => {
    const article = getDocumentationArticle(slug);
    if (!article) return null;
    const contentLocale = documentationContentLocale(article, locale);
    const sourceFile = article.files[contentLocale];
    if (!sourceFile) throw new Error(`Missing documentation source: ${slug}.`);
    // Sources come from the reviewed manifest, never a request-supplied filename.
    const source = await readFile(resolve(process.cwd(), sourceFile), "utf8");
    const content = source.replace(/^# [^\r\n]+\r?\n/, "").trim();
    return {
      article,
      content,
      contentLocale,
      sourceFile,
      headings: documentationHeadings(content),
    };
  },
);

export const documentationSearchIndex = cache(async (locale: Locale) => {
  const articles = await Promise.all(
    documentationArticles.map(async (article): Promise<DocNavigationItem> => {
      const loaded = await readDocumentationArticle(locale, article.slug);
      return {
        slug: article.slug,
        title: article.title[locale],
        description: article.description[locale],
        group: article.group[locale],
        keywords: loaded?.headings.map((heading) => heading.text) ?? [],
      };
    }),
  );
  return articles;
});

/** Resolve repository Markdown links without exposing local filesystem paths. */
export function documentationLink(
  href: string,
  sourceFile: string,
  locale: Locale,
  image = false,
): string {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return "";
  if (href.startsWith("/")) return publicPath(href);
  const hashIndex = href.indexOf("#");
  const filePart = hashIndex < 0 ? href : href.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? "" : href.slice(hashIndex);
  const relativeFile = posix.normalize(
    posix.join(posix.dirname(sourceFile), filePart),
  );
  if (relativeFile.startsWith("../")) return "";
  const article = documentationArticles.find((item) =>
    Object.values(item.files).includes(relativeFile),
  );
  if (article && !image) {
    const sourceLocale: Locale =
      article.files.es === relativeFile ? "es" : "en";
    // Explicit links to a translation must keep that translation's anchors.
    // Single-language references retain the shell's deliberate fallback locale.
    const targetLocale =
      article.files.en && article.files.es ? sourceLocale : locale;
    return publicPath(
      `${documentationPath(targetLocale, article.slug)}${fragment}`,
    );
  }
  if (relativeFile.startsWith("public/")) {
    return publicPath(`/${relativeFile.slice("public/".length)}${fragment}`);
  }
  if (relativeFile.startsWith("docs/images/")) {
    return publicPath(
      `/assets/showcase/${relativeFile.slice("docs/images/".length)}${fragment}`,
    );
  }
  const encodedPath = relativeFile.split("/").map(encodeURIComponent).join("/");
  return image
    ? `https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/${encodedPath}${fragment}`
    : `${githubUrl}/blob/main/${encodedPath}${fragment}`;
}
