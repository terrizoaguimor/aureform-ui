"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { calendarSeed, type CalendarEvent } from "@/demo/application-data";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { PageHeading } from "@/components/blocks/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/templates/data-manager";
import { cn, downloadText } from "@/lib/utils";
function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function CalendarTemplate() {
  const { l, common: t, date } = useLanguage(),
    [events, setEvents] = useDemoStore<CalendarEvent[]>(
      "calendar",
      calendarSeed,
    );
  const [month, setMonth] = useState(new Date(2026, 9, 1)),
    [selected, setSelected] = useState("2026-10-19"),
    [category, setCategory] = useState("all"),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<CalendarEvent | null>(null),
    [removing, setRemoving] = useState<string | null>(null),
    [view, setView] = useState("month");
  const categories = [
    { value: "design", label: l("Design", "Diseño") },
    { value: "product", label: l("Product", "Producto") },
    { value: "team", label: l("Team", "Equipo") },
  ];
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    return day;
  });
  const visible = events.filter(
      (event) => category === "all" || event.category === category,
    ),
    daily = visible
      .filter((event) => event.date === selected)
      .sort((a, b) => a.time.localeCompare(b.time));
  const create = () => {
    setEditing({
      id: "",
      title: "",
      date: selected,
      time: "10:00",
      duration: 60,
      category: "design",
      description: "",
    });
    setOpen(true);
  };
  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelected(iso(next));
  };
  const exportCalendar = () => {
    const escape = (v: string) =>
      v
        .replaceAll("\\", "\\\\")
        .replaceAll("\n", "\\n")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Aureform UI//Local demo//EN",
      ...visible.flatMap((event) => {
        const begin =
          event.date.replaceAll("-", "") +
          "T" +
          event.time.replace(":", "") +
          "00";
        const end = new Date(`${event.date}T${event.time}:00`);
        end.setMinutes(end.getMinutes() + event.duration);
        return [
          "BEGIN:VEVENT",
          `UID:${event.id}@aureform.demo`,
          `DTSTAMP:20261018T150000Z`,
          `DTSTART:${begin}`,
          `DTEND:${iso(end).replaceAll("-", "")}T${String(end.getHours()).padStart(2, "0")}${String(end.getMinutes()).padStart(2, "0")}00`,
          `SUMMARY:${escape(event.title)}`,
          `DESCRIPTION:${escape(event.description)}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ];
    downloadText("aureform-calendar.ics", lines.join("\r\n"), "text/calendar");
  };
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "Make time for what matters",
          "Haz tiempo para lo importante",
        )}
        title={l("A little room in your day.", "Un poco de espacio en tu día.")}
        description={l(
          "A considered view of the moments that move your work forward.",
          "Una visión cuidada de los momentos que hacen avanzar tu trabajo.",
        )}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCalendar}>
              <Download />
              {t("export")}
            </Button>
            <Button size="sm" onClick={create}>
              <Plus />
              {l("New event", "Nuevo evento")}
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="capitalize">
                {date(month, { month: "long", year: "numeric" })}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("previous")}
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("next")}
                onClick={() => changeMonth(1)}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMonth(new Date(2026, 9, 1));
                  setSelected("2026-10-18");
                }}
              >
                {l("Demo today", "Hoy en la demo")}
              </Button>
              <Select
                aria-label={l("Calendar view", "Vista de calendario")}
                value={view}
                onValueChange={setView}
                options={[
                  { value: "month", label: l("Month", "Mes") },
                  { value: "agenda", label: l("Agenda", "Agenda") },
                ]}
                className="h-8 w-28"
              />
            </div>
          </CardHeader>
          {view === "month" ? (
            <div className="px-3 pb-4 sm:px-5">
              <div className="grid grid-cols-7 border-b border-border">
                {l("Mon,Tue,Wed,Thu,Fri,Sat,Sun", "Lun,Mar,Mié,Jue,Vie,Sáb,Dom")
                  .split(",")
                  .map((day) => (
                    <p
                      key={day}
                      className="py-3 text-center text-[10px] font-semibold text-muted-foreground"
                    >
                      {day}
                    </p>
                  ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = iso(day),
                    items = visible.filter((event) => event.date === key);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelected(key)}
                      aria-describedby={`calendar-${key}-description`}
                      aria-pressed={selected === key}
                      className={cn(
                        "min-h-20 min-w-0 border-b border-r border-border p-1.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent sm:min-h-28 sm:p-2.5",
                        day.getMonth() !== month.getMonth() &&
                          "text-muted-foreground",
                        selected === key &&
                          "bg-accent/55 ring-1 ring-inset ring-primary/35",
                      )}
                    >
                      <span
                        id={`calendar-${key}-description`}
                        className="sr-only"
                        aria-hidden="true"
                      >
                        {date(day, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                        {`, ${items.length} ${l("events", "eventos")}`}
                      </span>
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-[11px]",
                          key === "2026-10-18" &&
                            "bg-primary text-primary-foreground",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <div className="mt-1 grid gap-1">
                        {items.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className={cn(
                              "block truncate rounded px-1 py-1 text-[8px] font-medium sm:text-[9px]",
                              event.category === "design"
                                ? "bg-accent text-accent-foreground"
                                : event.category === "team"
                                  ? "bg-warning text-warning-foreground"
                                  : "bg-surface-subtle text-foreground",
                            )}
                          >
                            <span className="hidden sm:inline">
                              {event.time}{" "}
                            </span>
                            {event.title}
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="text-[9px]">
                            +{items.length - 2}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <CardContent className="grid gap-3">
              {visible
                .filter((event) =>
                  event.date.startsWith(iso(month).slice(0, 7)),
                )
                .sort((a, b) =>
                  (a.date + a.time).localeCompare(b.date + b.time),
                )
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setEditing(event);
                      setOpen(true);
                    }}
                    className="flex items-center gap-4 rounded-lg border border-border p-4 text-left hover:bg-accent/30"
                  >
                    <span className="text-xs text-muted-foreground">
                      {date(event.date, { month: "short", day: "numeric" })}
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-semibold">
                      {event.title}
                    </span>
                    <span className="text-xs">{event.time}</span>
                  </button>
                ))}
              {!visible.some((event) =>
                event.date.startsWith(iso(month).slice(0, 7)),
              ) && (
                <p className="py-12 text-center text-xs text-muted-foreground">
                  {l("A little open space.", "Un poco de espacio libre.")}
                </p>
              )}
            </CardContent>
          )}
        </Card>
        <div className="grid content-start gap-4">
          <Select
            label={l("Category", "Categoría")}
            options={[
              { value: "all", label: l("All events", "Todos los eventos") },
              ...categories,
            ]}
            value={category}
            onValueChange={setCategory}
          />
          <Card>
            <CardHeader>
              <CardTitle>
                {date(selected, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              {daily.map((event) => (
                <div key={event.id} className="border-t border-border pt-4">
                  <div className="mb-2 flex justify-between gap-2">
                    <Badge
                      variant={
                        event.category === "team" ? "warning" : "outline"
                      }
                    >
                      {
                        categories.find((c) => c.value === event.category)
                          ?.label
                      }
                    </Badge>
                    <button
                      type="button"
                      className="text-[10px] text-primary"
                      onClick={() => {
                        setEditing(event);
                        setOpen(true);
                      }}
                    >
                      {t("edit")}
                    </button>
                  </div>
                  <h3 className="text-xs font-semibold">{event.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="size-3" />
                    {event.time} · {event.duration} min
                  </p>
                  <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              ))}
              {!daily.length && (
                <div className="py-7 text-center">
                  <CalendarDays className="mx-auto mb-3 size-7 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    {l("Nothing planned yet.", "Aún no hay eventos.")}
                  </p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={create}>
                <Plus />
                {l("Add an event", "Añadir un evento")}
              </Button>
            </CardContent>
          </Card>
          <p className="text-[10px] leading-5 text-muted-foreground">
            {l(
              "Floating local times. The exported calendar uses the importing app’s timezone.",
              "Horas locales. El calendario exportado usa la zona horaria de la aplicación que lo importa.",
            )}
          </p>
        </div>
      </div>
      <EventEditor
        key={`${editing?.id}-${open}`}
        open={open}
        onOpenChange={setOpen}
        event={editing}
        categories={categories}
        onRemove={(id) => {
          setOpen(false);
          setRemoving(id);
        }}
        onSave={(values) => {
          setEvents((previous) =>
            values.id
              ? previous.map((event) =>
                  event.id === values.id ? values : event,
                )
              : [...previous, { ...values, id: crypto.randomUUID() }],
          );
          setSelected(values.date);
          setMonth(new Date(`${values.date.slice(0, 7)}-01T12:00:00`));
          setOpen(false);
          toast.success(t("saved"));
        }}
      />
      <DeleteDialog
        count={1}
        open={!!removing}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        onDelete={() => {
          setEvents((previous) =>
            previous.filter((event) => event.id !== removing),
          );
          setRemoving(null);
        }}
      />
    </div>
  );
}
function EventEditor({
  open,
  onOpenChange,
  event,
  categories,
  onSave,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEvent | null;
  categories: { value: string; label: string }[];
  onSave: (e: CalendarEvent) => void;
  onRemove: (id: string) => void;
}) {
  const { l, common: t } = useLanguage();
  const schema = z.object({
    title: z
      .string()
      .trim()
      .min(2, l("Enter an event title.", "Escribe un título.")),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, l("Choose a date.", "Elige una fecha.")),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, l("Choose a time.", "Elige una hora.")),
    duration: z.number().min(5).max(1440),
    category: z.enum(["design", "product", "team"]),
    description: z.string().max(2000),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: event ?? {
      title: "",
      date: "2026-10-19",
      time: "10:00",
      duration: 60,
      category: "design",
      description: "",
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>
          {event?.id
            ? l("Event details", "Detalles del evento")
            : l("Make a little time", "Reserva un poco de tiempo")}
        </DialogTitle>
        <DialogDescription>
          {l(
            "Create an event in your local demo calendar.",
            "Crea un evento en el calendario local de demostración.",
          )}
        </DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={form.handleSubmit((values) =>
            onSave({ id: event?.id ?? "", ...values }),
          )}
        >
          <Field
            label={l("Title", "Título")}
            error={form.formState.errors.title?.message}
          >
            <Input {...form.register("title")} maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={l("Date", "Fecha")}
              error={form.formState.errors.date?.message}
            >
              <Input type="date" {...form.register("date")} />
            </Field>
            <Field
              label={l("Time", "Hora")}
              error={form.formState.errors.time?.message}
            >
              <Input type="time" {...form.register("time")} />
            </Field>
            <Field
              label={l("Duration (minutes)", "Duración (minutos)")}
              error={form.formState.errors.duration?.message}
            >
              <Input
                type="number"
                min={5}
                max={1440}
                {...form.register("duration", { valueAsNumber: true })}
              />
            </Field>
            <Select
              label={l("Category", "Categoría")}
              options={categories}
              value={form.watch("category")}
              onValueChange={(v) =>
                form.setValue("category", v as CalendarEvent["category"])
              }
            />
          </div>
          <Field label={l("Description", "Descripción")}>
            <Textarea {...form.register("description")} />
          </Field>
          <DialogFooter>
            {event?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive-foreground"
                onClick={() => onRemove(event.id)}
              >
                {t("delete")}
              </Button>
            )}
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
