import { resolve } from 'node:path';
import { buildProject } from '@kagaribi/core';

interface BuildOptions {
  env?: string;
  outDir?: string;
}

/**
 * kagaribi build コマンド。
 * kagaribi.config.ts に基づき、各パッケージをターゲット別にビルドする。
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const projectRoot = process.cwd();

  await buildProject({
    projectRoot,
    environment: options.env,
    outDir: options.outDir,
  });
}
