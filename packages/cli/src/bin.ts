#!/usr/bin/env node
export {};

import type { DbDialect, DeployTarget } from '@kagaribi/core';

const args = process.argv.slice(2);
const command = args[0];

/**
 * --env フラグの値を取得する。
 * 形式: --env=production または --env production
 */
function getEnvFlag(): string | undefined {
  const eqIdx = args.findIndex((a) => a.startsWith('--env='));
  if (eqIdx !== -1) {
    return args[eqIdx].split('=')[1];
  }
  const flagIdx = args.indexOf('--env');
  if (flagIdx !== -1 && args[flagIdx + 1] && !args[flagIdx + 1].startsWith('-')) {
    return args[flagIdx + 1];
  }
  return undefined;
}

/**
 * --db フラグの値を取得する。
 * 形式: --db postgresql, --db=mysql
 */
function getDbFlag(): DbDialect | undefined {
  const validDialects: DbDialect[] = ['postgresql', 'mysql'];

  const eqIdx = args.findIndex((a) => a.startsWith('--db='));
  if (eqIdx !== -1) {
    const value = args[eqIdx].split('=')[1];
    if (validDialects.includes(value as DbDialect)) {
      return value as DbDialect;
    }
    console.error(`Invalid --db value: "${value}". Valid options: ${validDialects.join(', ')}`);
    process.exit(1);
  }

  const flagIdx = args.indexOf('--db');
  if (flagIdx !== -1 && args[flagIdx + 1] && !args[flagIdx + 1].startsWith('-')) {
    const value = args[flagIdx + 1];
    if (validDialects.includes(value as DbDialect)) {
      return value as DbDialect;
    }
    console.error(`Invalid --db value: "${value}". Valid options: ${validDialects.join(', ')}`);
    process.exit(1);
  }

  return undefined;
}

/**
 * ターゲットフラグを取得する。
 * --cloudflare, --lambda, --cloudrun, --node, --deno
 */
function getTargetFlag(): DeployTarget | undefined {
  const flagMap: Record<string, DeployTarget> = {
    '--cloudflare': 'cloudflare-workers',
    '--lambda': 'aws-lambda',
    '--cloudrun': 'google-cloud-run',
    '--node': 'node',
    '--deno': 'deno',
  };
  for (const arg of args) {
    if (arg in flagMap) {
      return flagMap[arg];
    }
  }
  return undefined;
}

switch (command) {
  case 'init': {
    const { initCommand } = await import('./commands/init.js');
    const name = args[1];
    if (!name || name.startsWith('--')) {
      console.error('Usage: kagaribi init <project-name> [--node|--cloudflare|--lambda|--cloudrun|--deno] [--db postgresql|mysql]');
      process.exit(1);
    }
    const target = getTargetFlag();
    const db = getDbFlag();
    await initCommand({ name, target, db });
    break;
  }
  case 'dev': {
    const { devServer } = await import('./commands/dev.js');
    const port = parseInt(args[1] ?? '3000', 10);
    await devServer({ port });
    break;
  }
  case 'build': {
    const { buildCommand } = await import('./commands/build.js');
    await buildCommand({ env: getEnvFlag() });
    break;
  }
  case 'new': {
    const { newCommand } = await import('./commands/new.js');
    const name = args[1];
    if (!name || name.startsWith('--')) {
      console.error('Usage: kagaribi new <name> [--cloudflare|--lambda|--cloudrun|--node|--deno]');
      process.exit(1);
    }
    const target = getTargetFlag();
    await newCommand({ name, target });
    break;
  }
  case 'deploy': {
    const { deployCommand } = await import('./commands/deploy.js');
    // kagaribi deploy [packageName] [--target] [--env name] [--dry-run]
    const packageName = args[1] && !args[1].startsWith('--') ? args[1] : undefined;
    const target = getTargetFlag();
    const dryRun = args.includes('--dry-run');
    await deployCommand({ packageName, env: getEnvFlag(), target, dryRun });
    break;
  }
  default:
    console.log(`kagaribi - Hono-based microservices framework

Usage:
  kagaribi init <name> [target flag] [--db dialect]  Initialize a new project
  kagaribi dev [port]                                Start development server (default: 3000)
  kagaribi build [--env name]                        Build for deployment
  kagaribi new <name> [target flag]                   Create a new package
  kagaribi deploy [pkg] [target flag] [--env]        Deploy packages

Target flags:
  --cloudflare    Cloudflare Workers
  --lambda        AWS Lambda
  --cloudrun      Google Cloud Run
  --node          Node.js
  --deno          Deno Deploy

Options:
  --db <dialect>  Add database support (postgresql, mysql)
  --env <name>    Specify environment
  --dry-run       Show deploy instructions without executing
  --help          Show help
`);
    break;
}
