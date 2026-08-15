import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export interface AppConfig {
  port: number;
  /** Directory containing the `resolve_bridge` package (the repo's python/ dir). */
  bridgeRoot: string;
  /** Interpreter used to run the bridge. */
  pythonBin: string;
  /** How often the Resolve link is polled, in milliseconds. */
  statusPollMs: number;
  /** Hard ceiling on a single bridge invocation, in milliseconds. */
  bridgeTimeoutMs: number;
  /** Passed through to the bridge so it can find the Resolve scripting API. */
  resolveScriptApi: string | undefined;
  resolveScriptLib: string | undefined;
  /** Where rendered .mov files are written. */
  renderOutputDir: string;
}

/** Resolve a possibly-relative path against the backend's working directory. */
const fromCwd = (value: string): string => (isAbsolute(value) ? value : resolve(process.cwd(), value));

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Defaults assume the backend runs from apps/backend (both `nest start` and
 * `node dist/main.js` do), so the bridge sits two levels up. Every value can be
 * overridden through apps/backend/.env.
 */
export const configuration = (): AppConfig => {
  const bridgeRoot = fromCwd(process.env.RESOLVE_BRIDGE_ROOT ?? '../../python');

  const configuredPython = process.env.PYTHON_BIN;
  const venvPython = resolve(bridgeRoot, '.venv/bin/python3');
  const pythonBin = configuredPython
    ? fromCwd(configuredPython)
    : existsSync(venvPython)
      ? venvPython
      : 'python3';

  return {
    port: toInt(process.env.PORT, 3000),
    bridgeRoot,
    pythonBin,
    statusPollMs: toInt(process.env.STATUS_POLL_MS, 3000),
    bridgeTimeoutMs: toInt(process.env.BRIDGE_TIMEOUT_MS, 15_000),
    resolveScriptApi: process.env.RESOLVE_SCRIPT_API,
    resolveScriptLib: process.env.RESOLVE_SCRIPT_LIB,
    renderOutputDir: fromCwd(process.env.RENDER_OUTPUT_DIR ?? '../../renders'),
  };
};
