import { mascot } from "../ui/mascot.js";

export function printHelp(): void {
  console.log(`
${mascot}

nightclaw - simple AI agent CLI

Usage:
  nightclaw setup
  nightclaw init-config
  nightclaw "your prompt"
  nightclaw --help

Examples:
  nightclaw setup
  nightclaw init-config
  nightclaw "create a todo app with auth"
`);
}
