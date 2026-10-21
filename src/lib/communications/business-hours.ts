import {
  CommunicationsError,
  type BusinessHoursEvaluation,
  type BusinessHoursSchedule,
  type BusinessHoursWeekday,
} from "./contracts";

const formatters = new Map<string, Intl.DateTimeFormat>();
const minutesPerDay = 24 * 60;
const minutesPerWeek = 7 * minutesPerDay;

function invalid(message: string): never {
  throw new CommunicationsError("invalid-argument", message);
}

function formatter(timezone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timezone);
  if (cached) return cached;
  let result: Intl.DateTimeFormat;
  try {
    result = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return invalid("Business hours require a supported IANA timezone.");
  }
  // A small cache avoids growing with arbitrary imported timezone names.
  if (formatters.size >= 16) formatters.delete(formatters.keys().next().value!);
  formatters.set(timezone, result);
  return result;
}

function timeMinutes(value: string, allowEndOfDay = false): number {
  if (allowEndOfDay && value === "24:00") return minutesPerDay;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    return invalid("Business hours use local HH:mm times.");
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

function validLocalDate(value: string): boolean {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Default business policy, without an inferred or bundled national calendar. */
export function createDefaultBusinessHoursSchedule(): BusinessHoursSchedule {
  return {
    timezone: "America/Bogota",
    weekly: ([1, 2, 3, 4, 5] as BusinessHoursWeekday[]).map((day) => ({
      day,
      start: "08:00",
      end: "18:00",
    })),
    holidays: [],
  };
}

/** Validate and copy imported policy before it can affect routing. */
export function validateBusinessHoursSchedule(
  schedule: BusinessHoursSchedule,
): BusinessHoursSchedule {
  if (
    !schedule ||
    typeof schedule.timezone !== "string" ||
    schedule.timezone.length > 100 ||
    !Array.isArray(schedule.weekly) ||
    !Array.isArray(schedule.holidays) ||
    schedule.weekly.length > 28 ||
    schedule.holidays.length > 3660
  )
    return invalid("Invalid business-hours schedule.");
  formatter(schedule.timezone);

  const segments: { start: number; end: number }[] = [];
  const weekly = schedule.weekly.map((period) => {
    if (
      !period ||
      !Number.isInteger(period.day) ||
      period.day < 0 ||
      period.day > 6
    )
      return invalid("Business-hours weekdays must be integers from 0 to 6.");
    const start = timeMinutes(period.start);
    const end = timeMinutes(period.end, true);
    if (start === end)
      return invalid(
        "An interval must have a distinct start and end; use 00:00–24:00 for all day.",
      );
    const absoluteStart = period.day * minutesPerDay + start;
    const absoluteEnd =
      period.day * minutesPerDay + end + (end < start ? minutesPerDay : 0);
    if (absoluteEnd > minutesPerWeek) {
      segments.push(
        { start: absoluteStart, end: minutesPerWeek },
        { start: 0, end: absoluteEnd - minutesPerWeek },
      );
    } else segments.push({ start: absoluteStart, end: absoluteEnd });
    return { day: period.day, start: period.start, end: period.end };
  });
  segments.sort((a, b) => a.start - b.start);
  for (let index = 1; index < segments.length; index++)
    if (segments[index].start < segments[index - 1].end)
      return invalid(
        "Business-hours intervals must not overlap, including across midnight.",
      );

  const dates = new Set<string>();
  const holidays = schedule.holidays.map((holiday) => {
    if (
      !holiday ||
      !validLocalDate(holiday.date) ||
      dates.has(holiday.date) ||
      (holiday.label !== undefined &&
        (typeof holiday.label !== "string" || holiday.label.length > 120))
    )
      return invalid(
        "Holiday overrides require unique valid local ISO dates and short labels.",
      );
    dates.add(holiday.date);
    return {
      date: holiday.date,
      ...(holiday.label === undefined ? {} : { label: holiday.label }),
    };
  });
  return { timezone: schedule.timezone, weekly, holidays };
}

/** Opening is inclusive; closing and every explicit holiday date are exclusive. */
export function evaluateBusinessHours(
  schedule: BusinessHoursSchedule,
  at: Date | number = Date.now(),
): BusinessHoursEvaluation {
  const policy = validateBusinessHoursSchedule(schedule);
  const epoch = at instanceof Date ? at.getTime() : at;
  if (typeof epoch !== "number" || !Number.isFinite(new Date(epoch).getTime()))
    return invalid("Business hours require a valid Date or epoch timestamp.");
  const parts = formatter(policy.timezone).formatToParts(epoch);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? "";
  const localDate = `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
  const localTime = `${part("hour")}:${part("minute")}`;
  const weekday = new Date(
    `${localDate}T12:00:00Z`,
  ).getUTCDay() as BusinessHoursWeekday;
  const minute = timeMinutes(localTime);
  const previousDay = (weekday + 6) % 7;
  const holiday = policy.holidays.some((item) => item.date === localDate);
  const isOpen =
    !holiday &&
    policy.weekly.some((period) => {
      const start = timeMinutes(period.start);
      const end = timeMinutes(period.end, true);
      if (end > start)
        return period.day === weekday && minute >= start && minute < end;
      // An overnight period belongs to its opening day; the next local day's
      // holiday still takes precedence over the carry-over portion.
      return (
        (period.day === weekday && minute >= start) ||
        (period.day === previousDay && minute < end)
      );
    });
  return {
    isOpen,
    reason: holiday ? "holiday" : isOpen ? "open" : "closed",
    localDate,
    localTime,
    weekday,
  };
}

export function isBusinessHoursOpen(
  schedule: BusinessHoursSchedule,
  at: Date | number = Date.now(),
): boolean {
  return evaluateBusinessHours(schedule, at).isOpen;
}
