#!/usr/bin/env node

// Register tsx as the TypeScript loader for this process,
// then require the TypeScript entry point directly.
// No build step needed -- always runs the latest source.
const { register } = require("../node_modules/tsx/dist/cjs/api/index.cjs");
const path = require("path");

register();

require(path.join(__dirname, "../src/nightclaw.ts"));
