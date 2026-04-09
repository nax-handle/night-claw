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

// Side-effect imports must come after the Map is defined
// Using require-style dynamic imports avoids the hoisting issue in CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./help.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./setup.js");
