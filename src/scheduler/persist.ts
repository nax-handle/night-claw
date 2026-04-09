import { readClaudeState, writeSection } from "../state/claude-md.js";
import type { ScheduledJob } from "./types.js";

const JOBS_SECTION = "Jobs";

export async function loadJobs(): Promise<ScheduledJob[]> {
  const state = await readClaudeState();
  const section = state.sections.find((s) => s.title === JOBS_SECTION);
  if (!section?.content) return [];

  try {
    // Jobs are stored as JSON array in an HTML comment block
    const match = section.content.match(/<!--JOBS:([\s\S]*?)-->/);
    if (!match?.[1]) return [];
    return JSON.parse(match[1]) as ScheduledJob[];
  } catch {
    return [];
  }
}

export async function saveJobs(jobs: ScheduledJob[]): Promise<void> {
  const json = JSON.stringify(jobs, null, 2);

  // Build a human-readable summary table + hidden JSON data
  const activeJobs = jobs.filter((j) => j.status !== "done");
  const doneJobs = jobs.filter((j) => j.status === "done");

  let content = "";

  if (activeJobs.length > 0) {
    content += "| id | kind | schedule | label | status | nextRun | runs |\n";
    content += "|----|------|----------|-------|--------|---------|------|\n";
    for (const job of activeJobs) {
      const nextRun = job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : "-";
      const runs = job.maxRuns ? `${job.runCount}/${job.maxRuns}` : String(job.runCount);
      content += `| ${job.id} | ${job.kind} | ${job.schedule} | ${job.label} | ${job.status} | ${nextRun} | ${runs} |\n`;
    }
  }

  if (doneJobs.length > 0) {
    content += `\n${doneJobs.length} completed job(s) archived.\n`;
  }

  content += `\n<!--JOBS:${json}-->`;

  await writeSection(JOBS_SECTION, content);
}
