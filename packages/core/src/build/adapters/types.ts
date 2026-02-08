import type { DeployTarget, ResolvedPackage } from '../../types.js';

/** ビルドグループ: ホストパッケージ + co-locateされたパッケージ群 */
export interface BuildGroup {
  /** ホストパッケージ（ビルド成果物の名前に使用） */
  host: ResolvedPackage;
  /** ホストにco-locateされたパッケージ（host自身を含まない） */
  colocated: ResolvedPackage[];
  /** このグループからリモートアクセスされるパッケージ */
  remotes: ResolvedPackage[];
  /** デプロイターゲット */
  target: DeployTarget;
}

/** ビルド計画全体 */
export interface BuildPlan {
  /** ビルドグループ一覧 */
  groups: BuildGroup[];
  /** プロジェクトルートパス */
  projectRoot: string;
  /** 環境名 */
  environment: string;
}

/** アダプタが生成するファイル */
export interface GeneratedFile {
  /** dist/{name}/ からの相対パス */
  filename: string;
  /** ファイル内容 */
  content: string;
}

/** ターゲット別ビルドアダプタ */
export interface BuildAdapter {
  /** デプロイターゲット名 */
  target: DeployTarget;
  /** エントリーポイントコードを生成 */
  generateEntry(group: BuildGroup, appImportPath: string): string;
  /** 追加の設定ファイル（wrangler.toml, Dockerfile等）を生成 */
  generateConfigs(group: BuildGroup): GeneratedFile[];
  /** デプロイ手順の説明テキスト */
  deployInstructions(group: BuildGroup): string;
}
