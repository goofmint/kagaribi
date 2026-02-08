#!/usr/bin/env node
export {};

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
  if (flagIdx !== -1 && args[flagIdx + 1]) {
    return args[flagIdx + 1];
  }
  return undefined;
}

switch (command) {
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
  case 'deploy': {
    const { deployCommand } = await import('./commands/deploy.js');
    // kagaribi deploy [packageName] [--env name]
    const packageName = args[1] && !args[1].startsWith('--') ? args[1] : undefined;
    await deployCommand({ packageName, env: getEnvFlag() });
    break;
  }
  default:
    console.log(`kagaribi - Hono-based microservices framework

Usage:
  kagaribi dev [port]          Start development server (default: 3000)
  kagaribi build [--env name]  Build for deployment
  kagaribi deploy [pkg] [--env name]  Show deploy instructions

Options:
  --help                       Show help
`);
    break;
}
