/**
 * Minimal cron expression parser.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 * e.g. "0 9 * * 1" = every Monday at 09:00
 */

type CronField = number[] | null; // null = wildcard (every)

type ParsedCron = {
  minute: CronField;
  hour: CronField;
  dom: CronField;   // day of month
  month: CronField;
  dow: CronField;   // day of week (0=Sun, 1=Mon ... 6=Sat)
};

function parseField(field: string, min: number, max: number): CronField {
  if (field === "*") return null;

  const values: number[] = [];

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepNum = parseInt(step ?? "1", 10);
      const [rangeStart, rangeEnd] = range === "*"
        ? [min, max]
        : (range ?? "").split("-").map(Number);
      for (let i = rangeStart ?? min; i <= (rangeEnd ?? max); i += stepNum) {
        values.push(i);
      }
    } else if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start ?? min; i <= (end ?? max); i++) {
        values.push(i);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) values.push(n);
    }
  }

  return values.length > 0 ? values : null;
}

export function parseCron(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = parts;
  return {
    minute: parseField(minuteStr ?? "*", 0, 59),
    hour: parseField(hourStr ?? "*", 0, 23),
    dom: parseField(domStr ?? "*", 1, 31),
    month: parseField(monthStr ?? "*", 1, 12),
    dow: parseField(dowStr ?? "*", 0, 6),
  };
}

function matches(field: CronField, value: number): boolean {
  if (field === null) return true;
  return field.includes(value);
}

export function cronMatches(expr: string, date: Date): boolean {
  const parsed = parseCron(expr);
  if (!parsed) return false;

  return (
    matches(parsed.minute, date.getMinutes()) &&
    matches(parsed.hour, date.getHours()) &&
    matches(parsed.dom, date.getDate()) &&
    matches(parsed.month, date.getMonth() + 1) &&
    matches(parsed.dow, date.getDay())
  );
}

/** Compute the next Date after `from` that matches the cron expression */
export function nextCronDate(expr: string, from: Date): Date | null {
  const parsed = parseCron(expr);
  if (!parsed) return null;

  // Step through minutes up to 1 year ahead
  const candidate = new Date(from.getTime() + 60_000); // start 1 minute ahead
  candidate.setSeconds(0, 0);

  const limit = new Date(from.getTime() + 366 * 24 * 60 * 60 * 1000);

  while (candidate < limit) {
    if (
      matches(parsed.month, candidate.getMonth() + 1) &&
      matches(parsed.dom, candidate.getDate()) &&
      matches(parsed.dow, candidate.getDay()) &&
      matches(parsed.hour, candidate.getHours()) &&
      matches(parsed.minute, candidate.getMinutes())
    ) {
      return new Date(candidate);
    }
    candidate.setTime(candidate.getTime() + 60_000);
  }

  return null;
}

/**
 * Parse interval strings like "every 30m", "every 2h", "every 1d"
 * Returns milliseconds, or null if not parseable.
 */
export function parseInterval(schedule: string): number | null {
  const match = schedule.match(/every\s+(\d+)\s*(m|min|h|hour|d|day)/i);
  if (!match) return null;
  const n = parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "").toLowerCase();
  if (unit.startsWith("m")) return n * 60_000;
  if (unit.startsWith("h")) return n * 3_600_000;
  if (unit.startsWith("d")) return n * 86_400_000;
  return null;
}

/**
 * Parse loop strings like "5 times every 10m"
 * Returns { maxRuns, intervalMs } or null.
 */
export function parseLoop(schedule: string): { maxRuns: number; intervalMs: number } | null {
  const match = schedule.match(/(\d+)\s*times?\s+every\s+(\d+)\s*(m|min|h|hour|d|day)/i);
  if (!match) return null;
  const maxRuns = parseInt(match[1] ?? "0", 10);
  const n = parseInt(match[2] ?? "0", 10);
  const unit = (match[3] ?? "").toLowerCase();
  let intervalMs = n * 60_000;
  if (unit.startsWith("h")) intervalMs = n * 3_600_000;
  if (unit.startsWith("d")) intervalMs = n * 86_400_000;
  return { maxRuns, intervalMs };
}
