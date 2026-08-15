import { spawn } from 'node:child_process';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

/** The envelope every bridge script prints on stdout. */
export type BridgeEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; [key: string]: unknown } };

/** Failures that happen before a script can answer for itself. */
export const RUNNER_SPAWN_FAILED = 'BRIDGE_SPAWN_FAILED';
export const RUNNER_TIMEOUT = 'BRIDGE_TIMEOUT';
export const RUNNER_BAD_OUTPUT = 'BRIDGE_BAD_OUTPUT';

/**
 * Runs a `resolve_bridge` module as a short-lived subprocess.
 *
 * The contract is deliberately narrow: one JSON object on stdout, anything else
 * on stderr. That keeps this wrapper small and lets the Python side stay
 * stateless — no daemon to supervise, no connection to keep alive.
 */
@Injectable()
export class PythonRunnerService {
  private readonly logger = new Logger(PythonRunnerService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /**
   * Execute `python -m resolve_bridge.<moduleName>`, optionally piping a JSON
   * payload to stdin. Never throws: transport problems come back as an error
   * envelope so callers handle one shape.
   */
  async run<T>(moduleName: string, payload?: unknown): Promise<BridgeEnvelope<T>> {
    const pythonBin = this.config.get('pythonBin', { infer: true });
    const cwd = this.config.get('bridgeRoot', { infer: true });
    const timeoutMs = this.config.get('bridgeTimeoutMs', { infer: true });
    const scriptApi = this.config.get('resolveScriptApi', { infer: true });
    const scriptLib = this.config.get('resolveScriptLib', { infer: true });

    const env: NodeJS.ProcessEnv = { ...process.env };
    if (scriptApi) env.RESOLVE_SCRIPT_API = scriptApi;
    if (scriptLib) env.RESOLVE_SCRIPT_LIB = scriptLib;

    return new Promise<BridgeEnvelope<T>>((resolvePromise) => {
      let settled = false;
      const settle = (result: BridgeEnvelope<T>): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolvePromise(result);
      };

      const child = spawn(pythonBin, ['-m', `resolve_bridge.${moduleName}`], {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        settle({
          ok: false,
          error: {
            code: RUNNER_TIMEOUT,
            message: `resolve_bridge.${moduleName} exceeded ${String(timeoutMs)}ms and was terminated.`,
          },
        });
      }, timeoutMs);

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));

      child.on('error', (err: Error) => {
        settle({
          ok: false,
          error: {
            code: RUNNER_SPAWN_FAILED,
            message: `Could not start "${pythonBin}": ${err.message}`,
          },
        });
      });

      child.on('close', (code) => {
        if (stderr.trim().length > 0) {
          this.logger.debug(`resolve_bridge.${moduleName} stderr: ${stderr.trim()}`);
        }

        const trimmed = stdout.trim();
        if (trimmed.length === 0) {
          settle({
            ok: false,
            error: {
              code: RUNNER_BAD_OUTPUT,
              message:
                `resolve_bridge.${moduleName} produced no output (exit ${String(code)}). ` +
                (stderr.trim() || 'No stderr was captured.'),
            },
          });
          return;
        }

        // A script may log before its payload; the protocol is the last line.
        const lastLine = trimmed.slice(trimmed.lastIndexOf('\n') + 1);
        try {
          settle(JSON.parse(lastLine) as BridgeEnvelope<T>);
        } catch {
          settle({
            ok: false,
            error: {
              code: RUNNER_BAD_OUTPUT,
              message: `resolve_bridge.${moduleName} returned output that is not JSON: ${lastLine.slice(0, 200)}`,
            },
          });
        }
      });

      if (payload !== undefined) {
        child.stdin.write(JSON.stringify(payload));
      }
      child.stdin.end();
    });
  }
}
