import type { Interface } from "node:readline/promises";

export interface SlashCommand {
  name: string;
  description: string;
  run(args: string[], rl: Interface): Promise<void>;
}

const commands = new Map<string, SlashCommand>();

export function registerCommand(cmd: SlashCommand): void {
  commands.set(cmd.name, cmd);
}

export function getCommand(name: string): SlashCommand | undefined {
  return commands.get(name);
}

export function getAllCommands(): SlashCommand[] {
  return [...commands.values()];
}

import "./help.js";
import "./setup.js";
