export type JobKind = "cron" | "interval" | "loop" | "once";
export type JobStatus = "active" | "paused" | "done";

export type ScheduledJob = {
  id: string;
  kind: JobKind;
  label: string;
  prompt: string;
  schedule: string;       // cron expr, "every 30m", "5 times every 10m", ISO datetime
  skills?: string[];
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  status: JobStatus;
  runCount: number;
  maxRuns?: number;
};
