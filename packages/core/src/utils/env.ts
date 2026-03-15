/**
 * 環境変数を取得し、存在しない場合はエラーを投げる。
 *
 * @param key - 取得する環境変数のキー
 * @param defaultValue - 環境変数が存在しない場合のデフォルト値（オプショナル）
 * @returns 環境変数の値
 * @throws {Error} 環境変数が存在せず、デフォルト値も指定されていない場合
 *
 * @example
 * ```typescript
 * // 環境変数が必須の場合
 * const jwtSecret = requireEnv('JWT_SECRET');
 *
 * // デフォルト値を指定する場合
 * const port = requireEnv('PORT', '3000');
 * ```
 */
export function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}
