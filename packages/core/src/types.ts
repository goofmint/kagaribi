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
export type SqliteDriver = 'libsql' | 'd1' | 'sqlite-cloud';

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

// ===== JWT 認証関連の型定義 =====

// Hono JWT ペイロード型の再エクスポート
export type { JWTPayload } from 'hono/utils/jwt/types';

/**
 * アプリケーションで拡張可能なユーザー情報の基本型。
 *
 * この型は、JWT ペイロードに格納するユーザー情報のベース型として使用します。
 * アプリケーション固有のフィールドを追加する場合は、この型を拡張してください。
 *
 * @example
 * ```typescript
 * // アプリケーション固有のユーザー型を定義
 * interface MyAuthUser extends AuthUser {
 *   permissions: string[];
 *   organizationId: string;
 * }
 *
 * // JWT ペイロードに含める
 * const token = await sign({
 *   sub: 'user123',
 *   user: {
 *     id: 'user123',
 *     email: 'user@example.com',
 *     permissions: ['read', 'write'],
 *     organizationId: 'org456',
 *   } satisfies MyAuthUser
 * }, secret);
 * ```
 */
export interface AuthUser {
  /** ユーザーID */
  id: string;
  /** メールアドレス */
  email?: string;
  /** ユーザー名 */
  name?: string;
}

/**
 * Kagaribi で使用する JWT ペイロードの拡張型。
 *
 * Hono の標準 JWTPayload に加えて、ユーザー情報を含むペイロードを定義します。
 * アプリケーション固有のフィールドを追加する場合は、AuthUser を拡張してください。
 *
 * @example
 * ```typescript
 * import { getAuthPayloadFromContext } from '@kagaribi/core';
 *
 * app.get('/profile', (c) => {
 *   const payload = getAuthPayloadFromContext(c);
 *   if (!payload?.user) {
 *     return c.json({ error: 'Unauthorized' }, 401);
 *   }
 *   return c.json({ user: payload.user });
 * });
 * ```
 */
export interface KagaribiJwtPayload {
  /** JWT 標準クレーム（sub, iat, exp など） */
  [key: string]: unknown;
  /** Kagaribi で伝播するユーザー情報 */
  user?: AuthUser;
}

/**
 * 認証コンテキスト情報。
 *
 * JWT ペイロードとユーザー情報を含む、認証状態の統合型。
 * Hono コンテキストに `c.set('authContext', ...)` で格納して使用することを想定。
 *
 * @example
 * ```typescript
 * import type { AuthContext } from '@kagaribi/core';
 * import { getAuthPayloadFromContext } from '@kagaribi/core';
 *
 * app.use('/api/*', async (c, next) => {
 *   const jwtPayload = getAuthPayloadFromContext(c);
 *   if (jwtPayload) {
 *     const authContext: AuthContext = {
 *       user: jwtPayload.user,
 *       jwtPayload,
 *       tokenType: 'access',
 *       issuedAt: jwtPayload.iat as number,
 *       expiresAt: jwtPayload.exp as number,
 *     };
 *     c.set('authContext', authContext);
 *   }
 *   await next();
 * });
 *
 * app.get('/profile', (c) => {
 *   const authContext = c.get('authContext') as AuthContext;
 *   return c.json({ user: authContext.user });
 * });
 * ```
 */
export interface AuthContext {
  /** 認証済みユーザー情報 */
  user?: AuthUser;
  /** JWT ペイロード */
  jwtPayload?: KagaribiJwtPayload;
  /** トークンタイプ（access または refresh） */
  tokenType?: 'access' | 'refresh';
  /** トークン発行時刻（Unix timestamp、秒単位） */
  issuedAt?: number;
  /** トークン有効期限（Unix timestamp、秒単位） */
  expiresAt?: number;
}
