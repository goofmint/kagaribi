import type { DeployTarget, ResolvedPackage, KagaribiConfig } from '../types.js';
import type { BuildGroup, BuildPlan } from './adapters/types.js';

/**
 * 解決済みパッケージ一覧からビルドプランを生成する。
 *
 * co-location（colocateWith）を解決し、ホストパッケージごとに
 * BuildGroupを構築する。
 */
export function createBuildPlan(
  projectRoot: string,
  resolved: ResolvedPackage[],
  environment: string,
  config: KagaribiConfig
): BuildPlan {
  // url が指定されているパッケージはリモート扱い（colocateWithより優先）
  const isIndependent = (p: ResolvedPackage): boolean =>
    !p.deploy.colocateWith || Boolean(p.deploy.url);

  // ホストパッケージ: 独立して動作するパッケージ
  const hosts = resolved.filter(isIndependent);

  // co-locateされたパッケージをホストにグルーピング
  const colocatedMap = new Map<string, ResolvedPackage[]>();
  for (const pkg of resolved) {
    if (pkg.deploy.colocateWith && !pkg.deploy.url) {
      const list = colocatedMap.get(pkg.deploy.colocateWith) ?? [];
      list.push(pkg);
      colocatedMap.set(pkg.deploy.colocateWith, list);
    }
  }

  // リモートパッケージ（url指定あり）
  const remotePackages = resolved.filter((p) => Boolean(p.deploy.url));

  const groups: BuildGroup[] = hosts.map((host) => {
    const colocated = colocatedMap.get(host.name) ?? [];
    const target: DeployTarget = host.deploy.target ?? 'node';

    // このグループに含まれるパッケージ名のセット
    const groupNames = new Set([host.name, ...colocated.map((c) => c.name)]);

    // グループ外のリモートパッケージを参照先として記録
    const remotes = remotePackages.filter((r) => !groupNames.has(r.name));

    return { host, colocated, remotes, target };
  });

  return { groups, projectRoot, environment, config };
}
