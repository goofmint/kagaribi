#!/usr/bin/env node
export {};

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'dev': {
    const { devServer } = await import('./commands/dev.js');
    const port = parseInt(args[1] ?? '3000', 10);
    await devServer({ port });
    break;
  }
  default:
    console.log(`kagaribi - Hono-based microservices framework

Usage:
  kagaribi dev [port]   Start development server (default: 3000)

Options:
  --help                Show help
`);
    break;
}
