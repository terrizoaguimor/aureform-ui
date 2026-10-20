"use client";

import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { IntegrationSearchFacet } from "@/lib/integrations/contracts";
import {
  selectSearchFacet,
  type SearchFacetSelection,
} from "@/lib/integrations/search-bridge";
import { ProductPanel } from "./product-ui";

export function SearchBridgeFacets({
  facets,
  selection,
  pending,
  changed,
  canApply,
  onChange,
  onApply,
  onClear,
}: {
  facets: IntegrationSearchFacet[];
  selection: SearchFacetSelection;
  pending: boolean;
  changed: boolean;
  canApply: boolean;
  onChange: (selection: SearchFacetSelection) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { l, number } = useLanguage();
  const selectedCount = Object.values(selection).reduce(
    (total, values) => total + values.length,
    0,
  );
  return (
    <ProductPanel
      title={l("Filters from your backend", "Filtros de tu backend")}
      description={l(
        "Bucket counts come from the last search response. Apply your selection to request matching results.",
        "Los conteos vienen de la última respuesta de búsqueda. Aplica la selección para solicitar resultados coincidentes.",
      )}
    >
      {facets.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {facets.map((facet) => (
            <fieldset
              key={facet.id}
              className="min-w-0 rounded-xl border border-border bg-surface-subtle/30 p-4"
              disabled={pending}
            >
              <legend className="max-w-full break-words px-1 text-xs font-semibold">
                {facet.label}
              </legend>
              <p className="mb-3 text-[10px] leading-5 text-muted-foreground">
                {facet.selection === "single"
                  ? l("Choose one value.", "Elige un valor.")
                  : l("Choose one or more values.", "Elige uno o más valores.")}
              </p>
              {facet.selection === "single" ? (
                <RadioGroup
                  aria-label={facet.label}
                  value={selection[facet.id]?.[0] ?? ""}
                  disabled={pending}
                  onValueChange={(value) => {
                    if (typeof value === "string")
                      onChange(
                        selectSearchFacet(selection, facet, value, true),
                      );
                  }}
                >
                  {facet.buckets.map((bucket) => (
                    <label
                      key={bucket.value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-accent has-[:disabled]:cursor-default"
                    >
                      <RadioGroupItem value={bucket.value} />
                      <span className="min-w-0 flex-1 break-words">
                        {bucket.label}
                      </span>
                      <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] tabular-nums text-muted-foreground">
                        {number(bucket.count)}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="grid gap-1">
                  {facet.buckets.map((bucket) => (
                    <label
                      key={bucket.value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        checked={
                          selection[facet.id]?.includes(bucket.value) ?? false
                        }
                        disabled={pending}
                        onCheckedChange={(checked) =>
                          onChange(
                            selectSearchFacet(
                              selection,
                              facet,
                              bucket.value,
                              checked === true,
                            ),
                          )
                        }
                      />
                      <span className="min-w-0 flex-1 break-words">
                        {bucket.label}
                      </span>
                      <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] tabular-nums text-muted-foreground">
                        {number(bucket.count)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {!facet.buckets.length && (
                <p className="text-xs leading-6 text-muted-foreground">
                  {l(
                    "This response has no values for this filter.",
                    "Esta respuesta no tiene valores para este filtro.",
                  )}
                </p>
              )}
            </fieldset>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-6 text-muted-foreground">
          {l(
            "This response did not include facet buckets. The backend must report them before selection is available.",
            "Esta respuesta no incluyó buckets de facetas. El backend debe proporcionarlos para habilitar la selección.",
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p
          role={changed ? "status" : undefined}
          className="text-xs leading-6 text-muted-foreground"
        >
          {changed
            ? l(
                "Your draft changed. Counts and results still describe the last submitted request.",
                "El borrador cambió. Los conteos y los resultados aún corresponden a la última solicitud enviada.",
              )
            : `${number(selectedCount)} ${l("selected values", "valores seleccionados")}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={pending || !selectedCount}
            onClick={onClear}
          >
            {l("Clear facet filters", "Limpiar filtros de facetas")}
          </Button>
          {facets.length > 0 && (
            <Button
              variant="outline"
              disabled={pending || !canApply || !changed}
              onClick={onApply}
            >
              {l("Apply facet filters", "Aplicar filtros de facetas")}
            </Button>
          )}
        </div>
      </div>
    </ProductPanel>
  );
}
