import { createInterface } from 'node:readline/promises';
import { basename } from 'node:path';
import { initProject, exec } from '@kagaribi/core';
import type { DbDialect, DeployTarget, SqliteDriver } from '@kagaribi/core';

interface InitCommandOptions {
  name: string;
  target?: DeployTarget;
  db?: DbDialect;
  driver?: SqliteDriver;
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
  const { name, target, db, driver } = options;
  const parentDir = process.cwd();

  const projectDir = await initProject({ parentDir, name, target, db, driver });
  const projectName = basename(projectDir);

  console.log(`\n✓ Project "${projectName}" created at ${projectDir}\n`);

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

  let dbSteps = '';
  if (db === 'sqlite') {
    const driverName = driver || 'better-sqlite3';

    if (driverName === 'd1') {
      dbSteps = `
Set up Cloudflare D1 database:
  npx wrangler d1 create <database-name>  # Create D1 database
  # Update wrangler.json with database_id
  npx drizzle-kit generate                # Generate migrations
  npx wrangler d1 migrations apply <database-name> --local  # Apply locally
  npx wrangler d1 migrations apply <database-name>          # Apply to production
`;
    } else {
      dbSteps = `
Set up database:
  cp .env.example .env       # Edit DATABASE_URL${driverName === 'libsql' ? ' and DATABASE_AUTH_TOKEN (for Turso)' : ''}
  npx drizzle-kit generate   # Generate migrations
  npx drizzle-kit migrate    # Run migrations
`;
    }
  } else if (db) {
    dbSteps = `
Set up database:
  cp .env.example .env       # Edit DATABASE_URL
  npx drizzle-kit generate   # Generate migrations
  npx drizzle-kit migrate    # Run migrations
`;
  }

  const cdStep = name === '.' ? '' : `  cd ${projectName}\n`;

  console.log(`Next steps:
${cdStep}${installSucceeded ? '' : '  pnpm install\n'}  kagaribi dev
${dbSteps}
Add a new package:
  kagaribi new <name>
`);
}
