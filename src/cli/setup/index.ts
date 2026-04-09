import type { Interface } from "node:readline/promises";

export interface SetupModule {
  name: string;
  description: string;
  run(rl: Interface): Promise<void>;
}

const modules: SetupModule[] = [];

export function registerSetupModule(mod: SetupModule): void {
  modules.push(mod);
}

export function getSetupModule(name: string): SetupModule | undefined {
  return modules.find((m) => m.name === name);
}

export function getAllSetupModules(): SetupModule[] {
  return [...modules];
}

require("./llm.js");
