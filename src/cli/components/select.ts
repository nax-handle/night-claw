import type { Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { colors as c } from "../../ui/colors";

export type SelectOption<T> = {
  label: string;
  value: T;
};

function clearRenderedLines(lineCount: number): void {
  for (let i = 0; i < lineCount; i += 1) {
    output.write("\x1b[1A");
    output.write("\x1b[2K\r");
  }
}

export async function selectWithArrows<T>(
  rl: Interface,
  title: string,
  options: SelectOption<T>[],
): Promise<T | null> {
  if (options.length === 0) {
    return null;
  }

  const canUseRawMode = input.isTTY && output.isTTY && typeof input.setRawMode === "function";
  if (!canUseRawMode) {
    const fallback = (
      await rl.question(`${title} ${c.dim}(type number)${c.reset}: `)
    ).trim();
    const idx = parseInt(fallback, 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
      return null;
    }
    return options[idx].value;
  }

  return new Promise<T | null>((resolve, reject) => {
    let selected = 0;
    let renderedLines = 0;

    const render = () => {
      if (renderedLines > 0) {
        clearRenderedLines(renderedLines);
      }

      output.write(`${c.bold}${title}${c.reset}\n`);
      output.write(`${c.dim}Use ↑/↓ then Enter.${c.reset}\n`);
      for (let i = 0; i < options.length; i += 1) {
        const prefix = i === selected ? `${c.cyan}>${c.reset}` : " ";
        output.write(`${prefix} ${options[i].label}\n`);
      }
      renderedLines = options.length + 2;
    };

    const cleanup = () => {
      input.off("keypress", onKeypress);
      input.setRawMode(false);
      input.pause();
      rl.resume();
      output.write("\n");
    };

    const onKeypress = (_str: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Aborted with Ctrl+C"));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        const picked = options[selected].value;
        cleanup();
        resolve(picked);
        return;
      }

      if (key.name === "up") {
        selected = selected > 0 ? selected - 1 : options.length - 1;
        render();
        return;
      }

      if (key.name === "down") {
        selected = selected < options.length - 1 ? selected + 1 : 0;
        render();
        return;
      }

      // Optional vim-style fallback for terminals with key mapping issues.
      if (key.name === "k") {
        selected = selected > 0 ? selected - 1 : options.length - 1;
        render();
        return;
      }
      if (key.name === "j") {
        selected = selected < options.length - 1 ? selected + 1 : 0;
        render();
      }
    };

    emitKeypressEvents(input);
    rl.pause();
    input.setRawMode(true);
    input.resume();
    input.on("keypress", onKeypress);
    render();
  });
}
