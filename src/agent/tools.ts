export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
};

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "save_config",
      description: "Save a credential or setting to nightclaw.config.json. Use service='llm' for LLM/AI settings. Use service='prompt' for AI style/persona. Use service='telegram'/'zalo'/'gog' for messaging credentials.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Target: 'llm' for AI settings, 'prompt' for AI style/persona, or a service name: telegram, zalo, gog",
            enum: ["llm", "prompt", "telegram", "zalo", "gog"],
          },
          key: {
            type: "string",
            description: "Config key. For llm: apiKey, model, provider, baseUrl. For prompt: system. For telegram: botToken. For zalo: cookie.",
          },
          value: {
            type: "string",
            description: "The value to save",
          },
        },
        required: ["service", "key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_config",
      description: "Read the current nightclaw configuration. Use service='llm' for AI settings, 'prompt' for AI style, or a service name for credentials.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Optional: 'llm', 'prompt', or a service name (telegram, zalo, gog). Omit for full config.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_shell",
      description: "Execute a shell command, typically a CLI tool like gog. Always confirm with the user before destructive operations (send email, delete, etc).",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run",
          },
          reason: {
            type: "string",
            description: "Why this command is being run (shown to user for approval)",
          },
          requireApproval: {
            type: "string",
            description: "true if user must approve before execution (for destructive/sending operations)",
            enum: ["true", "false"],
          },
        },
        required: ["command", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_service",
      description: "Start a messaging service adapter (telegram or zalo bot).",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Service to start: telegram, zalo",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stop_service",
      description: "Stop a running messaging service adapter.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Service to stop: telegram, zalo",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_services",
      description: "List all running service adapters and their status.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_job",
      description: "Schedule a recurring or one-time job. The job runs a prompt through the agent on a schedule.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            description: "Job type",
            enum: ["cron", "interval", "loop", "once"],
          },
          label: {
            type: "string",
            description: "Human-readable name for this job",
          },
          prompt: {
            type: "string",
            description: "The prompt/task to execute when this job fires",
          },
          schedule: {
            type: "string",
            description: "For cron: '0 9 * * 1'. For interval: 'every 30m'. For loop: '5 times every 10m'. For once: '2026-04-09T14:00:00Z'",
          },
          maxRuns: {
            type: "string",
            description: "For loop kind: maximum number of runs",
          },
        },
        required: ["kind", "label", "prompt", "schedule"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "List all scheduled jobs with their status and next run time.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_job",
      description: "Cancel a scheduled job by its id or label.",
      parameters: {
        type: "object",
        properties: {
          jobId: {
            type: "string",
            description: "Job id or partial label to match",
          },
        },
        required: ["jobId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_notes",
      description: "Update the user's personal notes in CLAUDE.md. Write naturally, like a person taking notes. Use this to remember facts about the user, their preferences, people they mention, and what's going on in their life.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            description: "Section name: 'About You', 'How You Like Things', 'People You Talk About', 'Things Going On', 'What Happened Last Time'",
          },
          content: {
            type: "string",
            description: "Natural language content to write. For append/rewrite: the text. For delete with specific item: describe what to remove. For full clear: '*'",
          },
          action: {
            type: "string",
            description: "rewrite: replace whole section. append: add to section. delete: remove section or clear all.",
            enum: ["rewrite", "append", "delete"],
          },
        },
        required: ["section", "content", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_state",
      description: "Read the current CLAUDE.md notes to recall what you know about the user.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_skill",
      description: "Read the full instructions from a skill's SKILL.md. Call this whenever the user asks about, wants to set up, or needs guidance on a specific skill.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Skill name exactly as listed in the available skills index (e.g. 'zalo', 'telegram')",
          },
        },
        required: ["name"],
      },
    },
  },
];
