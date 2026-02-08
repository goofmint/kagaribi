import type { DeployTarget } from '../../types.js';
import type { BuildAdapter } from './types.js';
import { nodeAdapter } from './node.js';
import { cloudflareAdapter } from './cloudflare.js';
import { lambdaAdapter } from './lambda.js';
import { cloudRunAdapter } from './cloud-run.js';
import { denoAdapter } from './deno.js';

const adapters: Record<DeployTarget, BuildAdapter> = {
  'node': nodeAdapter,
  'cloudflare-workers': cloudflareAdapter,
  'aws-lambda': lambdaAdapter,
  'google-cloud-run': cloudRunAdapter,
  'deno': denoAdapter,
};

/**
 * デプロイターゲットに対応するビルドアダプタを取得する。
 */
export function getAdapter(target: DeployTarget): BuildAdapter {
  const adapter = adapters[target];
  if (!adapter) {
    throw new Error(`Unknown deploy target: "${target}"`);
  }
  return adapter;
}
