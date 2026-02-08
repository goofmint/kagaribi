import type { DeployTarget } from '../types.js';

interface BundleOptions {
  /** エントリーポイントファイルパス */
  entryPoint: string;
  /** 出力ファイルパス */
  outfile: string;
  /** デプロイターゲット */
  target: DeployTarget;
  /** バンドルに含めない外部依存 */
  external?: string[];
}

/**
 * DeployTarget から esbuild の platform を決定する。
 */
function getPlatform(
  target: DeployTarget
): 'node' | 'browser' | 'neutral' {
  switch (target) {
    case 'node':
    case 'aws-lambda':
    case 'google-cloud-run':
      return 'node';
    case 'cloudflare-workers':
      return 'browser';
    case 'deno':
      return 'neutral';
  }
}

/**
 * esbuild でパッケージをバンドルする。
 */
export async function bundlePackage(options: BundleOptions): Promise<void> {
  const { build } = await import('esbuild');

  const platform = getPlatform(options.target);

  await build({
    entryPoints: [options.entryPoint],
    bundle: true,
    outfile: options.outfile,
    format: 'esm',
    platform,
    target: 'es2022',
    minify: false,
    treeShaking: true,
    external: options.external,
  });
}
