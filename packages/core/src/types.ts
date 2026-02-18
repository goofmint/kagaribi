import type { Hono } from 'hono';

/** 対応するデプロイターゲット */
export type DeployTarget =
  | 'cloudflare-workers'
  | 'aws-lambda'
  | 'google-cloud-run'
  | 'node'
  | 'deno';

/** 対応するデータベース方言 */
export type DbDialect = 'postgresql' | 'mysql' | 'sqlite';

/** SQLite ドライバーの種類 */
export type SqliteDriver = 'better-sqlite3' | 'libsql' | 'd1' | 'sqlite-cloud';

/** パッケージマニフェスト定義 */
export interface PackageDefinition {
  /** パッケージの一意な名前 */
  name: string;
  /** 依存する他のkagaribiパッケージ名 */
  dependencies?: string[];
  /** 互換性のあるランタイム */
  runtime?: DeployTarget[];
  /**
   * ネストルーティング: このパッケージがマウントされるパスパターン。
   * 未指定の場合はデフォルトで `/{name}` にマウントされる。
   * パスパラメータ（`:userId` 等）を含めることで、
   * プレフィクスから値を抽出してパッケージに転送できる。
   *
   * @example
   * routes: ['/users/:userId/articles']
   * // → /users/1/articles/* のリクエストがこのパッケージにルーティングされ、
   * //   userId=1 がパラメータとして渡される
   */
  routes?: string[];
}

/** 個別パッケージのデプロイ設定 */
export interface PackageDeployConfig {
  /** デプロイターゲット */
  target?: DeployTarget;
  /** 他のパッケージと同じサーバーに同居させる場合、そのパッケージ名 */
  colocateWith?: string;
  /** リモートデプロイ時のURL（環境変数参照は '$ENV_VAR' 形式） */
  url?: string;
}

/** 環境別のパッケージ設定オーバーライド */
export interface EnvironmentConfig {
  packages?: Record<string, PackageDeployConfig>;
}

/** kagaribi.config.ts のルート設定 */
export interface KagaribiConfig {
  /** 各パッケージのデプロイ設定 */
  packages: Record<string, PackageDeployConfig>;
  /** 環境別のオーバーライド設定 */
  environments?: Record<string, EnvironmentConfig>;
  /** データベース設定 */
  db?: {
    dialect: DbDialect;
    /** SQLite 使用時のドライバー指定（オプショナル） */
    driver?: SqliteDriver;
  };
}

/** 解決済みパッケージ情報（ビルド時に使用） */
export interface ResolvedPackage {
  /** パッケージ名 */
  name: string;
  /** パッケージのディレクトリパス */
  path: string;
  /** パッケージマニフェスト */
  definition: PackageDefinition;
  /** 解決済みデプロイ設定 */
  deploy: PackageDeployConfig;
  /** ローカル（同居）かリモートか */
  mode: 'local' | 'remote';
}

/** Honoアプリとして登録されたパッケージ */
export interface RegisteredPackage {
  name: string;
  basePath: string;
  app: Hono;
}
