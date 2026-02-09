import { createInterface } from 'node:readline/promises';
import { initProject, exec } from '@kagaribi/core';
import type { DeployTarget } from '@kagaribi/core';

interface InitCommandOptions {
  name: string;
  target?: DeployTarget;
}

/**
 * ユーザーにYes/No質問をする。デフォルトはYes。
 */
async function askYesNo(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(question);
    const trimmed = answer.trim().toLowerCase();
    // デフォルトYes: 空入力、y、yes
    return trimmed === '' || trimmed === 'y' || trimmed === 'yes';
  } finally {
    rl.close();
  }
}

export async function initCommand(options: InitCommandOptions): Promise<void> {
  const { name, target } = options;
  const parentDir = process.cwd();

  const projectDir = await initProject({ parentDir, name, target });

  console.log(`\n✓ Project "${name}" created at ${projectDir}\n`);

  // 依存インストールの確認
  const shouldInstall = await askYesNo('Install dependencies now? (pnpm install) [Y/n] ');

  if (shouldInstall) {
    console.log('\nInstalling dependencies...\n');
    try {
      const result = await exec('pnpm', ['install'], { cwd: projectDir });
      if (result.stdout) {
        console.log(result.stdout);
      }
      console.log('✓ Dependencies installed!\n');
    } catch (e) {
      console.error('Failed to install dependencies. Run "pnpm install" manually.\n');
    }
  }

  console.log(`Next steps:
  cd ${name}${shouldInstall ? '' : '\n  pnpm install'}
  kagaribi dev

Add a new package:
  kagaribi new <name>
`);
}
