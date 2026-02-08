/**
 * kagaribi リモート通信デモ
 *
 * 4つのパッケージ（users, auth, articles, root）を別プロセス・別ポートで起動し、
 * HTTP経由でのパッケージ間通信が正しく動作することを検証する。
 * articles はネストルーティング（/users/:userId/articles）で動作する。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const basicDir = resolve(__dirname, '..');

const PORTS = { users: 3002, auth: 3003, articles: 3004, root: 3000 };
const processes: ChildProcess[] = [];

function startPackage(name: string, servePath: string, port: number): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(
      'npx',
      ['tsx', servePath],
      {
        cwd: basicDir,
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    processes.push(proc);

    proc.stdout?.on('data', (data: Buffer) => {
      process.stdout.write(data);
    });
    proc.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });

    // サーバーが起動するまでポーリング
    const startTime = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startTime > 10000) {
        clearInterval(interval);
        reject(new Error(`[${name}] Timed out waiting for server on port ${port}`));
        return;
      }
      try {
        const res = await fetch(`http://localhost:${port}/`);
        if (res.ok || res.status < 500) {
          clearInterval(interval);
          resolvePromise();
        }
      } catch {
        // まだ起動していない
      }
    }, 200);
  });
}

interface TestCase {
  label: string;
  url: string;
  expectContains?: string;
  expectStatus?: number;
}

async function runTests(tests: TestCase[]): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const res = await fetch(test.url);
      const body = await res.text();
      const statusOk = test.expectStatus ? res.status === test.expectStatus : res.ok;
      const containsOk = test.expectContains ? body.includes(test.expectContains) : true;

      if (statusOk && containsOk) {
        console.log(`  ✓ ${test.label}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.label} (status=${res.status}, contains=${containsOk})`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ ${test.label} (${err instanceof Error ? err.message : err})`);
      failed++;
    }
  }

  return { passed, failed };
}

function cleanup(): void {
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }
}

async function main(): Promise<void> {
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  console.log('=== kagaribi Remote Communication Demo ===\n');

  // Step 1: users, auth, articles を起動
  console.log('Starting packages...\n');
  try {
    await Promise.all([
      startPackage('users', 'packages/users/serve.ts', PORTS.users),
      startPackage('auth', 'packages/auth/serve.ts', PORTS.auth),
      startPackage('articles', 'packages/articles/serve.ts', PORTS.articles),
    ]);
  } catch (err) {
    console.error(err);
    cleanup();
    process.exit(1);
  }

  // Step 2: root を起動（他パッケージが起動済みであること前提）
  try {
    await startPackage('root', 'packages/root/serve.ts', PORTS.root);
  } catch (err) {
    console.error(err);
    cleanup();
    process.exit(1);
  }

  console.log('\nAll servers started. Running tests...\n');

  // Step 3: テスト実行
  const { passed, failed } = await runTests([
    {
      label: 'users direct:   GET http://localhost:3002/api/users',
      url: 'http://localhost:3002/api/users',
      expectContains: '"users"',
    },
    {
      label: 'auth direct:    GET http://localhost:3003/login',
      url: 'http://localhost:3003/login',
      expectContains: 'kagaribi-login',
    },
    {
      label: 'proxy users:    GET http://localhost:3000/users/api/users',
      url: 'http://localhost:3000/users/api/users',
      expectContains: '"users"',
    },
    {
      label: 'proxy auth:     GET http://localhost:3000/auth/login',
      url: 'http://localhost:3000/auth/login',
      expectContains: 'kagaribi-login',
    },
    {
      label: 'cross-package:  GET http://localhost:3000/dashboard (root -> users via HTTP)',
      url: 'http://localhost:3000/dashboard',
      expectContains: 'kagaribi-user-list',
    },
    {
      label: 'health:         GET http://localhost:3000/health',
      url: 'http://localhost:3000/health',
      expectContains: '"healthy"',
    },
    // articles: ネストルーティング
    {
      label: 'articles direct: GET http://localhost:3004/ (all articles)',
      url: 'http://localhost:3004/',
      expectContains: '"articles"',
    },
    {
      label: 'articles direct: GET http://localhost:3004/1 (article id=1)',
      url: 'http://localhost:3004/1',
      expectContains: 'Getting Started with Hono',
    },
    {
      label: 'nested proxy:   GET http://localhost:3000/users/1/articles (user1 articles)',
      url: 'http://localhost:3000/users/1/articles',
      expectContains: '"userId":"1"',
    },
    {
      label: 'nested proxy:   GET http://localhost:3000/users/1/articles/2 (article id=2)',
      url: 'http://localhost:3000/users/1/articles/2',
      expectContains: 'Microservices with kagaribi',
    },
  ]);

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

main();
