import { Children, isValidElement, type ReactNode } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocumentationCode } from "@/components/documentation-code";
import {
  documentationHeadingIds,
  documentationLink,
} from "@/lib/documentation-server";
import type { Locale } from "@/i18n/messages";
import "./documentation-prose.css";

export function DocumentationArticleContent({
  content,
  sourceFile,
  locale,
}: {
  content: string;
  sourceFile: string;
  locale: Locale;
}) {
  return (
    <div className="af-doc-prose">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm, documentationHeadingIds]}
        urlTransform={(url, key) =>
          documentationLink(
            defaultUrlTransform(url),
            sourceFile,
            locale,
            key === "src",
          )
        }
        components={{
          h1: ({ children, id }) => (
            <h2 id={id}>
              <a href={`#${id}`}>{children}</a>
            </h2>
          ),
          h2: ({ children, id }) => (
            <h2 id={id}>
              <a href={`#${id}`}>{children}</a>
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id}>
              <a href={`#${id}`}>{children}</a>
            </h3>
          ),
          a: ({ children, href }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href || undefined}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const element = Children.toArray(children).find((child) =>
              isValidElement(child),
            );
            if (
              isValidElement<{
                children?: ReactNode;
                className?: string;
              }>(element)
            ) {
              const code = String(element.props.children ?? "").replace(
                /\n$/,
                "",
              );
              const language =
                /language-([\w-]+)/.exec(element.props.className ?? "")?.[1] ??
                "text";
              return (
                <DocumentationCode
                  code={code}
                  language={language}
                  locale={locale}
                />
              );
            }
            return <pre>{children}</pre>;
          },
          table: ({ children }) => (
            <div
              className="af-doc-table"
              tabIndex={0}
              role="region"
              aria-label={
                locale === "es" ? "Tabla de referencia" : "Reference table"
              }
            >
              <table>{children}</table>
            </div>
          ),
          img: ({ src, alt }) => (
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              decoding="async"
            />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
