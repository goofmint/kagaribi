import { describe, it, expect } from 'vitest';
import type { ResolvedPackage, KagaribiConfig } from '../types.js';
import { createBuildPlan } from '../build/planner.js';
import { getAdapter } from '../build/adapters/index.js';

// テスト用のResolvedPackageヘルパー
function makePkg(overrides: Partial<ResolvedPackage> & { name: string }): ResolvedPackage {
  return {
    path: `/project/packages/${overrides.name}`,
    definition: { name: overrides.name, ...overrides.definition },
    deploy: overrides.deploy ?? {},
    mode: overrides.mode ?? 'local',
    ...overrides,
  };
}

// テスト用のモックConfig
const mockConfig: KagaribiConfig = {
  packages: {},
};

describe('createBuildPlan', () => {
  it('全パッケージcolocate → 1グループ', () => {
    const resolved: ResolvedPackage[] = [
      makePkg({ name: 'root', deploy: { target: 'node' } }),
      makePkg({ name: 'auth', deploy: { colocateWith: 'root' } }),
      makePkg({ name: 'users', deploy: { colocateWith: 'root' } }),
    ];

    const plan = createBuildPlan('/project', resolved, 'development', mockConfig);

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].host.name).toBe('root');
    expect(plan.groups[0].colocated.map((p) => p.name)).toEqual(['auth', 'users']);
    expect(plan.groups[0].target).toBe('node');
    expect(plan.groups[0].remotes).toHaveLength(0);
  });

  it('独立パッケージあり → 複数グループ', () => {
    const resolved: ResolvedPackage[] = [
      makePkg({ name: 'root', deploy: { target: 'cloudflare-workers' } }),
      makePkg({ name: 'auth', deploy: { colocateWith: 'root' } }),
      makePkg({
        name: 'users',
        deploy: { target: 'aws-lambda', url: '$USERS_URL' },
        mode: 'remote',
      }),
    ];

    const plan = createBuildPlan('/project', resolved, 'production', mockConfig);

    expect(plan.groups).toHaveLength(2);

    const rootGroup = plan.groups.find((g) => g.host.name === 'root');
    const usersGroup = plan.groups.find((g) => g.host.name === 'users');

    expect(rootGroup).toBeDefined();
    expect(rootGroup!.target).toBe('cloudflare-workers');
    expect(rootGroup!.colocated.map((p) => p.name)).toEqual(['auth']);
    expect(rootGroup!.remotes.map((p) => p.name)).toEqual(['users']);

    expect(usersGroup).toBeDefined();
    expect(usersGroup!.target).toBe('aws-lambda');
    expect(usersGroup!.colocated).toHaveLength(0);
    expect(usersGroup!.remotes).toHaveLength(0);
  });

  it('ターゲット未指定 → nodeデフォルト', () => {
    const resolved: ResolvedPackage[] = [
      makePkg({ name: 'root', deploy: {} }),
    ];

    const plan = createBuildPlan('/project', resolved, 'default', mockConfig);

    expect(plan.groups[0].target).toBe('node');
  });

  it('環境名とプロジェクトルートが保持される', () => {
    const resolved: ResolvedPackage[] = [
      makePkg({ name: 'root', deploy: { target: 'node' } }),
    ];

    const plan = createBuildPlan('/my/project', resolved, 'staging', mockConfig);

    expect(plan.projectRoot).toBe('/my/project');
    expect(plan.environment).toBe('staging');
  });
});

describe('getAdapter', () => {
  it('全ターゲットのアダプタが取得できる', () => {
    const targets = [
      'node',
      'cloudflare-workers',
      'aws-lambda',
      'google-cloud-run',
      'deno',
    ] as const;

    for (const target of targets) {
      const adapter = getAdapter(target);
      expect(adapter.target).toBe(target);
    }
  });

  it('Node.jsアダプタ: serve()を含むエントリを生成', () => {
    const adapter = getAdapter('node');
    const entry = adapter.generateEntry(
      { host: makePkg({ name: 'root' }), colocated: [], remotes: [], target: 'node' },
      './app.js'
    );
    expect(entry).toContain("import { serve } from '@hono/node-server'");
    expect(entry).toContain("import app from './app.js'");
    expect(entry).toContain('serve(');
  });

  it('Workersアダプタ: export defaultを含むエントリを生成', () => {
    const adapter = getAdapter('cloudflare-workers');
    const entry = adapter.generateEntry(
      { host: makePkg({ name: 'root' }), colocated: [], remotes: [], target: 'cloudflare-workers' },
      './app.js'
    );
    expect(entry).toContain('export default app');
    expect(entry).not.toContain('serve');
  });

  it('Workersアダプタ: wrangler.tomlを生成', () => {
    const adapter = getAdapter('cloudflare-workers');
    const configs = adapter.generateConfigs({
      host: makePkg({ name: 'api' }),
      colocated: [],
      remotes: [],
      target: 'cloudflare-workers',
    });
    expect(configs).toHaveLength(1);
    expect(configs[0].filename).toBe('wrangler.toml');
    expect(configs[0].content).toContain('name = "api"');
    expect(configs[0].content).toContain('main = "index.js"');
  });

  it('Lambdaアダプタ: handle()を含むエントリを生成', () => {
    const adapter = getAdapter('aws-lambda');
    const entry = adapter.generateEntry(
      { host: makePkg({ name: 'users' }), colocated: [], remotes: [], target: 'aws-lambda' },
      './app.js'
    );
    expect(entry).toContain("import { handle } from 'hono/aws-lambda'");
    expect(entry).toContain('export const handler = handle(app)');
  });

  it('Cloud Runアダプタ: Dockerfileを生成', () => {
    const adapter = getAdapter('google-cloud-run');
    const configs = adapter.generateConfigs({
      host: makePkg({ name: 'analytics' }),
      colocated: [],
      remotes: [],
      target: 'google-cloud-run',
    });
    expect(configs).toHaveLength(1);
    expect(configs[0].filename).toBe('Dockerfile');
    expect(configs[0].content).toContain('FROM node:20-slim');
    expect(configs[0].content).toContain('EXPOSE 8080');
  });

  it('Denoアダプタ: Deno.serve()を含むエントリを生成', () => {
    const adapter = getAdapter('deno');
    const entry = adapter.generateEntry(
      { host: makePkg({ name: 'root' }), colocated: [], remotes: [], target: 'deno' },
      './app.js'
    );
    expect(entry).toContain('Deno.serve(');
    expect(entry).toContain('Deno.env.get');
  });
});
