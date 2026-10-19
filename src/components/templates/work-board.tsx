"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  MoreHorizontal,
  CalendarDays,
  ArrowRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  tasksSeed,
  dealsSeed,
  type BoardRecord,
} from "@/demo/application-data";
import {
  demoAvatarSources,
  getDemoBoardAssigneeAvatarSrc,
} from "@/demo/avatar-assets";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty } from "@/components/ui/empty";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  DeleteDialog,
  useTableLabels,
} from "@/components/templates/data-manager";
import { cn, csv, downloadText } from "@/lib/utils";

type DemoBoardRecord = BoardRecord & { assigneeAvatarSrc?: string | null };

// These are explicit selectable demo people, not identities inferred from records.
const assigneeOptions = [
  {
    value: "Alex Morgan",
    label: "Alex Morgan",
    avatarSrc: demoAvatarSources["alex-morgan"],
  },
  {
    value: "Isabel Torres",
    label: "Isabel Torres",
    avatarSrc: demoAvatarSources["isabel-torres"],
  },
  {
    value: "Leo Martin",
    label: "Leo Martin",
    avatarSrc: demoAvatarSources["leo-martin"],
  },
  {
    value: "Noor Ahmed",
    label: "Noor Ahmed",
    avatarSrc: demoAvatarSources["noor-ahmed"],
  },
];
const boardFixtures = new Map(
  [...tasksSeed, ...dealsSeed].map((item) => [item.id, item]),
);

function boardAvatarSrc(item: DemoBoardRecord): string | undefined {
  if (Object.hasOwn(item, "assigneeAvatarSrc")) {
    return item.assigneeAvatarSrc ?? undefined;
  }
  // A legacy record with a changed assignee has no reliable identity binding.
  return boardFixtures.get(item.id)?.assignee === item.assignee
    ? getDemoBoardAssigneeAvatarSrc(item.id)
    : undefined;
}

export function WorkBoard({
  mode = "tasks",
}: {
  mode?: "tasks" | "task-list" | "pipeline";
}) {
  const { l, common: t, date, currency, locale } = useLanguage(),
    pipeline = mode === "pipeline";
  const [records, setRecords] = useDemoStore<DemoBoardRecord[]>(
    pipeline ? "deals" : "tasks",
    pipeline ? dealsSeed : tasksSeed,
  );
  const [query, setQuery] = useState(""),
    [priority, setPriority] = useState("all"),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<DemoBoardRecord | null>(null),
    [removing, setRemoving] = useState<string | null>(null),
    [dragging, setDragging] = useState<string | null>(null);
  const tableLabels = useTableLabels();
  const stages = pipeline
    ? [
        { id: "lead", label: l("New leads", "Nuevos prospectos") },
        { id: "qualified", label: l("Qualified", "Calificados") },
        { id: "proposal", label: l("Proposal", "Propuesta") },
        { id: "won", label: l("Won", "Cerrados") },
      ]
    : [
        { id: "todo", label: l("To do", "Pendiente") },
        { id: "progress", label: l("In progress", "En progreso") },
        { id: "review", label: l("In review", "En revisión") },
        { id: "done", label: l("Done", "Terminado") },
      ];
  const priorities = [
    { value: "low", label: l("Low", "Baja") },
    { value: "medium", label: l("Medium", "Media") },
    { value: "high", label: l("High", "Alta") },
  ];
  const visible = records.filter(
    (item) =>
      (!query ||
        `${item.title} ${item.description} ${item.assignee} ${item.project}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (priority === "all" || item.priority === priority),
  );
  const move = (id: string, status: string) => {
    setRecords((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    toast.success(
      l("Moved to", "Movido a") +
        " " +
        stages.find((stage) => stage.id === status)?.label,
    );
  };
  const create = (status = stages[0].id) => {
    setEditing({
      id: "",
      title: "",
      description: "",
      status,
      priority: "medium",
      assignee: "Alex Morgan",
      assigneeAvatarSrc: demoAvatarSources["alex-morgan"],
      due: "2026-10-25",
      amount: 0,
      project: pipeline ? "SaaS" : "Product",
    });
    setOpen(true);
  };
  const actions = (item: BoardRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${l("Actions for", "Acciones de")} ${item.title}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setEditing(item);
            setOpen(true);
          }}
        >
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{l("Move to", "Mover a")}</DropdownMenuLabel>
          {stages.map((stage) => (
            <DropdownMenuItem
              key={stage.id}
              disabled={item.status === stage.id}
              onClick={() => move(item.id, stage.id)}
            >
              <ArrowRight className="size-3.5" />
              {stage.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={() => setRemoving(item.id)}>
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const columns: ColumnDef<DemoBoardRecord>[] = [
    {
      accessorKey: "title",
      header: l("Task", "Tarea"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Checkbox
            aria-label={`${l("Mark complete", "Marcar como terminada")}: ${row.original.title}`}
            checked={row.original.status === "done"}
            onCheckedChange={(checked) =>
              move(row.original.id, checked ? "done" : "todo")
            }
          />
          <button
            type="button"
            className="text-left outline-none hover:text-primary focus-visible:underline"
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <p
              className={cn(
                "font-semibold",
                row.original.status === "done" &&
                  "text-muted-foreground line-through",
              )}
            >
              {row.original.title}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {row.original.project}
            </p>
          </button>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: l("Status", "Estado"),
      cell: ({ getValue }) => (
        <Badge
          variant={
            getValue() === "done"
              ? "default"
              : getValue() === "review"
                ? "warning"
                : "neutral"
          }
        >
          {stages.find((stage) => stage.id === getValue())?.label}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: l("Priority", "Prioridad"),
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "high" ? "destructive" : "outline"}>
          {priorities.find((item) => item.value === getValue())?.label}
        </Badge>
      ),
    },
    {
      accessorKey: "assignee",
      header: l("Assignee", "Responsable"),
      cell: ({ getValue, row }) => (
        <span className="flex items-center gap-2">
          <Avatar
            name={String(getValue())}
            src={boardAvatarSrc(row.original)}
            size="sm"
          />
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "due",
      header: l("Due", "Fecha límite"),
      cell: ({ getValue }) => date(String(getValue())),
    },
    {
      id: "actions",
      header: l("Actions", "Acciones"),
      cell: ({ row }) => actions(row.original),
    },
  ];
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          pipeline
            ? "Thoughtful relationships"
            : "One considered step at a time",
          pipeline ? "Relaciones cuidadas" : "Un paso a la vez",
        )}
        title={
          pipeline
            ? l("Sales pipeline", "Embudo de ventas")
            : mode === "task-list"
              ? l("Your task list", "Tu lista de tareas")
              : l("Room to make progress.", "Espacio para avanzar.")
        }
        description={l(
          pipeline
            ? "Keep every opportunity close, from a first hello to a shared ambition."
            : "Small tasks. Shared direction. A clear view of what comes next.",
          pipeline
            ? "Acompaña cada oportunidad, del primer saludo a una ambición compartida."
            : "Pequeñas tareas. Una dirección compartida. Claridad sobre lo que viene.",
        )}
        actions={
          <>
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={publicPath(
                `/${locale}/${pipeline ? "customers" : mode === "tasks" ? "task-list" : "tasks"}/`,
              )}
            >
              {pipeline
                ? l("View customers", "Ver clientes")
                : l(
                    mode === "tasks" ? "List view" : "Board view",
                    mode === "tasks" ? "Vista de lista" : "Vista de tablero",
                  )}
            </a>
            <Button size="sm" onClick={() => create()}>
              <Plus />
              {pipeline
                ? l("New deal", "Nuevo acuerdo")
                : l("New task", "Nueva tarea")}
            </Button>
          </>
        }
      />
      {pipeline && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label={l("Pipeline value", "Valor del embudo")}
            value={currency(
              records
                .filter((item) => item.status !== "won")
                .reduce((sum, item) => sum + item.amount, 0),
            )}
            note={l("Open opportunities", "Oportunidades abiertas")}
          />
          <MetricCard
            label={l("Open deals", "Acuerdos abiertos")}
            value={String(
              records.filter((item) => item.status !== "won").length,
            )}
          />
          <MetricCard
            label={l("Won value", "Valor cerrado")}
            value={currency(
              records
                .filter((item) => item.status === "won")
                .reduce((sum, item) => sum + item.amount, 0),
            )}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" />
            <Input
              aria-label={l("Search records", "Buscar registros")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder={l(
                "Search by title or person…",
                "Buscar por título o persona…",
              )}
            />
          </div>
          <Select
            aria-label={l("Priority filter", "Filtrar por prioridad")}
            value={priority}
            onValueChange={setPriority}
            options={[
              {
                value: "all",
                label: l("All priorities", "Todas las prioridades"),
              },
              ...priorities,
            ]}
            className="w-full sm:w-40"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const exported = visible.map((item) => {
              const record = { ...item };
              delete record.assigneeAvatarSrc;
              return record;
            });
            downloadText(
              pipeline ? "deals.csv" : "tasks.csv",
              csv(exported),
              "text/csv",
            );
          }}
        >
          <Download />
          {t("export")}
        </Button>
      </div>
      {mode === "task-list" ? (
        <DataTable
          data={visible}
          columns={columns}
          labels={tableLabels}
          search={false}
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <section
              key={stage.id}
              aria-label={stage.label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/aureform-record");
                if (records.some((item) => item.id === id)) move(id, stage.id);
                setDragging(null);
              }}
              className={cn(
                "rounded-xl border border-border bg-surface-subtle/50 p-3",
                dragging && "border-dashed border-primary/40",
              )}
            >
              <div className="mb-4 flex items-center justify-between gap-2 px-1">
                <h2 className="text-xs font-semibold">
                  {stage.label}
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {visible.filter((item) => item.status === stage.id).length}
                  </span>
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${l("Add to", "Añadir a")} ${stage.label}`}
                  onClick={() => create(stage.id)}
                >
                  <Plus />
                </Button>
              </div>
              {pipeline && (
                <p className="mb-4 px-1 text-xs text-muted-foreground">
                  {currency(
                    visible
                      .filter((item) => item.status === stage.id)
                      .reduce((sum, item) => sum + item.amount, 0),
                  )}
                </p>
              )}
              <div className="grid gap-3">
                {visible
                  .filter((item) => item.status === stage.id)
                  .map((item) => (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/aureform-record", item.id);
                        setDragging(item.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "p-4 transition-opacity",
                        dragging === item.id && "opacity-50",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Badge
                          variant={
                            item.priority === "high"
                              ? "destructive"
                              : item.priority === "low"
                                ? "outline"
                                : "neutral"
                          }
                        >
                          {
                            priorities.find((p) => p.value === item.priority)
                              ?.label
                          }
                        </Badge>
                        {actions(item)}
                      </div>
                      <button
                        type="button"
                        className="block w-full text-left text-xs font-semibold leading-6 outline-none hover:text-primary focus-visible:underline"
                        onClick={() => {
                          setEditing(item);
                          setOpen(true);
                        }}
                      >
                        {item.title}
                      </button>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                      {pipeline && (
                        <p className="mt-4 text-lg font-semibold tabular-nums">
                          {currency(item.amount)}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {date(item.due, { month: "short", day: "numeric" })}
                        </span>
                        <Avatar
                          name={item.assignee}
                          src={boardAvatarSrc(item)}
                          size="sm"
                        />
                      </div>
                      <p className="sr-only">
                        {l(
                          "Use the actions menu to move this card with the keyboard.",
                          "Usa el menú de acciones para mover esta tarjeta con el teclado.",
                        )}
                      </p>
                    </Card>
                  ))}
              </div>
              {!visible.some((item) => item.status === stage.id) && (
                <button
                  type="button"
                  onClick={() => create(stage.id)}
                  className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="size-4" />
                  {l("Make room for something new", "Añade algo nuevo")}
                </button>
              )}
            </section>
          ))}
        </div>
      )}
      {!visible.length && mode === "task-list" && (
        <Empty title={t("empty")} description={t("noMatch")} />
      )}
      <p className="text-[10px] text-muted-foreground">
        {l(
          "Drag cards or use each card’s actions menu. Changes stay in this browser.",
          "Arrastra las tarjetas o usa su menú de acciones. Los cambios se guardan en este navegador.",
        )}
      </p>
      <BoardEditor
        key={`${editing?.id ?? "new"}-${open}`}
        open={open}
        onOpenChange={setOpen}
        item={editing}
        pipeline={pipeline}
        stages={stages}
        priorities={priorities}
        onSave={(values) => {
          setRecords((previous) =>
            values.id
              ? previous.map((item) => (item.id === values.id ? values : item))
              : [...previous, { ...values, id: crypto.randomUUID() }],
          );
          setOpen(false);
          toast.success(t("saved"));
        }}
      />
      <DeleteDialog
        count={1}
        open={!!removing}
        onOpenChange={(value) => {
          if (!value) setRemoving(null);
        }}
        onDelete={() => {
          setRecords((previous) =>
            previous.filter((item) => item.id !== removing),
          );
          setRemoving(null);
          toast.success(l("Record removed", "Registro eliminado"));
        }}
      />
    </div>
  );
}
function BoardEditor({
  open,
  onOpenChange,
  item,
  pipeline,
  stages,
  priorities,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: DemoBoardRecord | null;
  pipeline: boolean;
  stages: { id: string; label: string }[];
  priorities: { value: string; label: string }[];
  onSave: (item: DemoBoardRecord) => void;
}) {
  const { l, common: t } = useLanguage();
  const schema = z.object({
    title: z
      .string()
      .trim()
      .min(
        2,
        l("Use at least two characters.", "Usa al menos dos caracteres."),
      ),
    description: z.string().max(2000),
    status: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    assignee: z.string().min(1),
    assigneeAvatarSrc: z.string().nullable().optional(),
    due: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, l("Choose a date.", "Elige una fecha.")),
    project: z
      .string()
      .trim()
      .min(1, l("Enter a project.", "Escribe un proyecto.")),
    amount: z.number().min(0),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? {
          ...item,
          assigneeAvatarSrc: boardAvatarSrc(item) ?? null,
        }
      : {
          title: "",
          description: "",
          status: stages[0].id,
          priority: "medium",
          assignee: "Alex Morgan",
          assigneeAvatarSrc: demoAvatarSources["alex-morgan"],
          due: "2026-10-25",
          project: "Product",
          amount: 0,
        },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>
          {item?.id
            ? t("edit")
            : pipeline
              ? l("New opportunity", "Nueva oportunidad")
              : l("A new next step", "Un nuevo paso")}
        </DialogTitle>
        <DialogDescription>
          {l(
            "A few details help everyone move in the same direction.",
            "Unos cuantos detalles ayudan a avanzar en la misma dirección.",
          )}
        </DialogDescription>
        <form
          className="mt-6 grid gap-4"
          onSubmit={form.handleSubmit((values) =>
            onSave({ id: item?.id ?? "", ...values }),
          )}
        >
          <Field
            label={
              pipeline ? l("Opportunity", "Oportunidad") : l("Title", "Título")
            }
            error={form.formState.errors.title?.message}
          >
            <Input {...form.register("title")} maxLength={160} />
          </Field>
          <Field label={l("Description", "Descripción")}>
            <Textarea {...form.register("description")} maxLength={2000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={l("Status", "Estado")}
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v)}
              options={stages.map((stage) => ({
                value: stage.id,
                label: stage.label,
              }))}
            />
            <Select
              label={l("Priority", "Prioridad")}
              value={form.watch("priority")}
              onValueChange={(v) =>
                form.setValue("priority", v as "low" | "medium" | "high")
              }
              options={priorities}
            />
            <Select
              label={l("Assignee", "Responsable")}
              value={form.watch("assignee")}
              onValueChange={(value) => {
                const chosen = assigneeOptions.find(
                  (option) => option.value === value,
                );
                form.setValue("assignee", value);
                form.setValue("assigneeAvatarSrc", chosen?.avatarSrc ?? null);
              }}
              options={assigneeOptions}
            />
            <Field
              label={l("Due date", "Fecha límite")}
              error={form.formState.errors.due?.message}
            >
              <Input type="date" {...form.register("due")} />
            </Field>
            <Field
              label={l("Project", "Proyecto")}
              error={form.formState.errors.project?.message}
            >
              <Input {...form.register("project")} />
            </Field>
            {pipeline && (
              <Field
                label={l("Value (USD)", "Valor (USD)")}
                error={form.formState.errors.amount?.message}
              >
                <Input
                  type="number"
                  step=".01"
                  min="0"
                  {...form.register("amount", { valueAsNumber: true })}
                />
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
