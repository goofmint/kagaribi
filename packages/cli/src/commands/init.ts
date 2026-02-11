import { createInterface } from 'node:readline/promises';
import { initProject, exec } from '@kagaribi/core';
import type { DbDialect, DeployTarget } from '@kagaribi/core';

interface InitCommandOptions {
  name: string;
  target?: DeployTarget;
  db?: DbDialect;
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
  const { name, target, db } = options;
  const parentDir = process.cwd();

  const projectDir = await initProject({ parentDir, name, target, db });

  console.log(`\n✓ Project "${name}" created at ${projectDir}\n`);

  // 依存インストールの確認
  const shouldInstall = await askYesNo('Install dependencies now? (pnpm install) [Y/n] ');

  let installSucceeded = false;
  if (shouldInstall) {
    console.log('\nInstalling dependencies...\n');
    try {
      const result = await exec('pnpm', ['install'], { cwd: projectDir });
      if (result.stdout) {
        console.log(result.stdout);
      }
      console.log('✓ Dependencies installed!\n');
      installSucceeded = true;
    } catch (e) {
      console.error('Failed to install dependencies. Run "pnpm install" manually.\n');
    }
  }

  const dbSteps = db
    ? `
Set up database:
  cp .env.example .env       # Edit DATABASE_URL
  npx drizzle-kit generate   # Generate migrations
  npx drizzle-kit migrate    # Run migrations
`
    : '';

  console.log(`Next steps:
  cd ${name}${installSucceeded ? '' : '\n  pnpm install'}
  kagaribi dev
${dbSteps}
Add a new package:
  kagaribi new <name>
`);
}
