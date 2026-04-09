import { randomUUID } from "node:crypto";
import type { ScheduledJob, JobKind } from "./types.js";
import { loadJobs, saveJobs } from "./persist.js";
import {
  nextCronDate,
  parseInterval,
  parseLoop,
} from "./cron.js";
import type { AgentSession } from "../agent/index.js";
import { runTurn } from "../agent/index.js";
import type { NightclawConfig } from "../config/index.js";
import { colors as c } from "../ui/colors.js";

let jobs: ScheduledJob[] = [];
let tickTimer: ReturnType<typeof setInterval> | null = null;
let agentSession: AgentSession | null = null;
let agentConfig: NightclawConfig | null = null;

export async function startScheduler(
  session: AgentSession,
  config: NightclawConfig,
  tickIntervalMs = 60_000,
): Promise<void> {
  agentSession = session;
  agentConfig = config;
  jobs = await loadJobs();

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => void tick(), tickIntervalMs);

  console.log(`${c.dim}[scheduler] started, ${jobs.filter((j) => j.status === "active").length} active jobs${c.reset}`);
}

export function stopScheduler(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

async function tick(): Promise<void> {
  const now = new Date();
  const activeJobs = jobs.filter((j) => j.status === "active");

  for (const job of activeJobs) {
    if (!job.nextRunAt) continue;
    const nextRun = new Date(job.nextRunAt);
    if (now < nextRun) continue;

    // Fire the job
    console.log(`\n${c.cyan}[scheduler]${c.reset} firing job: ${job.label}`);
    job.lastRunAt = now.toISOString();
    job.runCount++;

    // Run the prompt through the agent (fire and forget)
    if (agentSession && agentConfig) {
      void runTurn(job.prompt, agentSession, agentConfig)
        .then((result) => {
          console.log(`${c.dim}[scheduler] ${job.label}: ${result.slice(0, 100)}...${c.reset}`);
        })
        .catch((err) => {
          console.error(`${c.red}[scheduler error] ${job.label}: ${err instanceof Error ? err.message : String(err)}${c.reset}`);
        });
    }

    // Compute next run
    computeNextRun(job);

    // Check if done
    if (job.maxRuns && job.runCount >= job.maxRuns) {
      job.status = "done";
      job.nextRunAt = undefined;
      console.log(`${c.dim}[scheduler] job "${job.label}" completed (${job.runCount}/${job.maxRuns} runs)${c.reset}`);
    }
  }

  await saveJobs(jobs);
}

function computeNextRun(job: ScheduledJob): void {
  const now = new Date();

  switch (job.kind) {
    case "cron": {
      const next = nextCronDate(job.schedule, now);
      job.nextRunAt = next?.toISOString();
      break;
    }
    case "interval": {
      const ms = parseInterval(job.schedule);
      if (ms) job.nextRunAt = new Date(now.getTime() + ms).toISOString();
      break;
    }
    case "loop": {
      const loop = parseLoop(job.schedule);
      if (loop) job.nextRunAt = new Date(now.getTime() + loop.intervalMs).toISOString();
      break;
    }
    case "once":
      job.status = "done";
      job.nextRunAt = undefined;
      break;
  }
}

export async function createJob(params: Record<string, string>): Promise<string> {
  const { kind, label, prompt, schedule, maxRuns } = params;
  if (!kind || !label || !prompt || !schedule) {
    return "Missing required fields: kind, label, prompt, schedule";
  }

  const now = new Date();
  const job: ScheduledJob = {
    id: `j${randomUUID().slice(0, 6)}`,
    kind: kind as JobKind,
    label,
    prompt,
    schedule,
    createdAt: now.toISOString(),
    status: "active",
    runCount: 0,
  };

  if (maxRuns) job.maxRuns = parseInt(maxRuns, 10);

  // Compute first nextRunAt
  switch (job.kind) {
    case "cron": {
      const next = nextCronDate(schedule, now);
      if (!next) return `Invalid cron expression: ${schedule}`;
      job.nextRunAt = next.toISOString();
      break;
    }
    case "interval": {
      const ms = parseInterval(schedule);
      if (!ms) return `Invalid interval: ${schedule}. Use format "every 30m", "every 2h", "every 1d"`;
      job.nextRunAt = new Date(now.getTime() + ms).toISOString();
      break;
    }
    case "loop": {
      const loop = parseLoop(schedule);
      if (!loop) return `Invalid loop: ${schedule}. Use format "5 times every 10m"`;
      job.maxRuns = loop.maxRuns;
      job.nextRunAt = new Date(now.getTime() + loop.intervalMs).toISOString();
      break;
    }
    case "once": {
      const d = new Date(schedule);
      if (isNaN(d.getTime())) return `Invalid datetime: ${schedule}`;
      job.nextRunAt = d.toISOString();
      break;
    }
  }

  jobs.push(job);
  await saveJobs(jobs);

  const nextStr = job.nextRunAt
    ? new Date(job.nextRunAt).toLocaleString()
    : "unknown";

  return `Created job "${label}" (${kind})\nSchedule: ${schedule}\nNext run: ${nextStr}\nID: ${job.id}`;
}

export function listJobs(): string {
  const active = jobs.filter((j) => j.status === "active");
  if (active.length === 0) return "No scheduled jobs.";

  const lines = active.map((j, i) => {
    const next = j.nextRunAt ? new Date(j.nextRunAt).toLocaleString() : "unknown";
    const runs = j.maxRuns ? `${j.runCount}/${j.maxRuns}` : String(j.runCount);
    return `${i + 1}. [${j.id}] ${j.label} (${j.kind}, next: ${next}, runs: ${runs})`;
  });

  return `${active.length} active job(s):\n${lines.join("\n")}`;
}

export function cancelJob(jobIdOrLabel: string): string {
  const idx = jobs.findIndex(
    (j) =>
      j.id === jobIdOrLabel ||
      j.label.toLowerCase().includes(jobIdOrLabel.toLowerCase()),
  );

  if (idx === -1) return `No job found matching "${jobIdOrLabel}".`;

  const job = jobs[idx];
  if (!job) return `No job found matching "${jobIdOrLabel}".`;

  jobs.splice(idx, 1);
  void saveJobs(jobs);

  const remaining = jobs.filter((j) => j.status === "active").length;
  return `Cancelled "${job.label}". ${remaining} job(s) remaining.`;
}

export function pauseJob(jobIdOrLabel: string): string {
  const job = jobs.find(
    (j) =>
      j.id === jobIdOrLabel ||
      j.label.toLowerCase().includes(jobIdOrLabel.toLowerCase()),
  );
  if (!job) return `No job found matching "${jobIdOrLabel}".`;
  job.status = "paused";
  void saveJobs(jobs);
  return `Paused "${job.label}".`;
}

export function resumeJob(jobIdOrLabel: string): string {
  const job = jobs.find(
    (j) =>
      j.id === jobIdOrLabel ||
      j.label.toLowerCase().includes(jobIdOrLabel.toLowerCase()),
  );
  if (!job) return `No job found matching "${jobIdOrLabel}".`;
  job.status = "active";
  void saveJobs(jobs);
  return `Resumed "${job.label}".`;
}

export function createJobManager() {
  return {
    create: createJob,
    list: listJobs,
    cancel: cancelJob,
    pause: pauseJob,
    resume: resumeJob,
  };
}
