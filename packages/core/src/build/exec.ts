import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface ExecResult {
  stdout: string;
  stderr: string;
}

const CLI_INSTALL_HINTS: Record<string, string> = {
  wrangler: 'npm install -g wrangler',
  gcloud: 'https://cloud.google.com/sdk/docs/install',
  aws: 'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
  deployctl: 'deno install -A jsr:@deno/deployctl',
};

/**
 * シェルコマンドを実行する。
 * execFile を使用して shell injection を防止する。
 */
export async function exec(
  command: string,
  commandArgs: string[],
  options: { cwd: string }
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd: options.cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return { stdout, stderr };
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };

    if (err.code === 'ENOENT') {
      const hint = CLI_INSTALL_HINTS[command];
      const installMsg = hint ? ` Install it with: ${hint}` : '';
      throw new Error(
        `Command "${command}" not found.${installMsg}`
      );
    }

    // コマンドが非ゼロで終了した場合
    if (err.stderr) {
      throw new Error(
        `Command "${command} ${commandArgs.join(' ')}" failed:\n${err.stderr}`
      );
    }

    throw error;
  }
}
