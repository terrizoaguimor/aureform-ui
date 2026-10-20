import type {
  IntegrationAction,
  IntegrationDocument,
} from "../../lib/integrations/contracts";

export function productDocumentFormats(action?: IntegrationAction) {
  const supported: IntegrationDocument["format"][] = [
    "markdown",
    "text",
    "json",
  ];
  const field = action?.fields.find((item) => item.id === "format");
  if (!field?.options?.length) return supported;
  return supported.filter((format) =>
    field.options!.some((option) => option.value === format),
  );
}

/** Empty serialized documents; consumer bindings still validate their SDK schema. */
export function productBlankDocument(
  action?: IntegrationAction,
  integrationId?: string,
): IntegrationDocument {
  const format = productDocumentFormats(action)[0] ?? "json";
  const json =
    integrationId === "lexical"
      ? {
          root: {
            children: [
              {
                children: [],
                direction: null,
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
                textFormat: 0,
                textStyle: "",
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "root",
            version: 1,
          },
        }
      : integrationId === "blocknote"
        ? [{ type: "paragraph", props: {}, content: [], children: [] }]
        : {};
  return {
    id: "",
    title: "",
    content: format === "json" ? JSON.stringify(json, null, 2) : "",
    format,
    revision: 0,
    updatedAt: "",
  };
}
