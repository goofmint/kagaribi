import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DbDialect } from './types.js';

/** サポートされるフィールドタイプ */
export const SUPPORTED_FIELD_TYPES = [
  'string',
  'text',
  'integer',
  'bigint',
  'boolean',
  'timestamp',
  'date',
  'json',
  'uuid',
] as const;

export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

/** パースされたフィールド定義 */
export interface FieldDefinition {
  name: string;
  type: SupportedFieldType;
}

/** テーブル定義生成の結果 */
export interface TableDefinition {
  tableCode: string;
  requiredImports: string[];
}

/**
 * フィールド名とタイプから、Drizzle カラム定義を生成する。
 *
 * @param fieldName - フィールド名
 * @param fieldType - フィールドタイプ
 * @param dialect - データベース方言
 * @returns Drizzle カラムビルダー呼び出しの文字列
 *
 * @example
 * ```typescript
 * getColumnDefinition('title', 'string', 'postgresql')
 * // => "text('title').notNull()"
 *
 * getColumnDefinition('age', 'integer', 'mysql')
 * // => "int('age').notNull()"
 * ```
 */
export function getColumnDefinition(
  fieldName: string,
  fieldType: SupportedFieldType,
  dialect: DbDialect
): string {
  const columnName = `'${fieldName}'`;

  switch (dialect) {
    case 'postgresql':
      switch (fieldType) {
        case 'string':
          return `text(${columnName}).notNull()`;
        case 'text':
          return `text(${columnName}).notNull()`;
        case 'integer':
          return `integer(${columnName}).notNull()`;
        case 'bigint':
          return `bigint(${columnName}, { mode: 'number' }).notNull()`;
        case 'boolean':
          return `boolean(${columnName}).notNull()`;
        case 'timestamp':
          return `timestamp(${columnName}).notNull()`;
        case 'date':
          return `date(${columnName}).notNull()`;
        case 'json':
          return `jsonb(${columnName}).notNull()`;
        case 'uuid':
          return `uuid(${columnName}).notNull()`;
      }
      break;

    case 'mysql':
      switch (fieldType) {
        case 'string':
          return `varchar(${columnName}, { length: 255 }).notNull()`;
        case 'text':
          return `text(${columnName}).notNull()`;
        case 'integer':
          return `int(${columnName}).notNull()`;
        case 'bigint':
          return `bigint(${columnName}, { mode: 'number' }).notNull()`;
        case 'boolean':
          return `boolean(${columnName}).notNull()`;
        case 'timestamp':
          return `timestamp(${columnName}).notNull()`;
        case 'date':
          return `date(${columnName}).notNull()`;
        case 'json':
          return `json(${columnName}).notNull()`;
        case 'uuid':
          return `varchar(${columnName}, { length: 36 }).notNull()`;
      }
      break;
  }
}

/**
 * Drizzle インポート行から現在のインポートを抽出する。
 *
 * @param importLine - インポート行の文字列
 * @returns インポートされている識別子の配列
 */
function parseImportLine(importLine: string): string[] {
  const match = importLine.match(/import\s*{\s*([^}]+)\s*}/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * インポートリストを重複なしでマージして、新しいインポート行を生成する。
 *
 * @param existingImports - 既存のインポート
 * @param newImports - 新しく追加するインポート
 * @param packageName - インポート元のパッケージ名
 * @returns 新しいインポート行
 */
function mergeImports(
  existingImports: string[],
  newImports: string[],
  packageName: string
): string {
  const merged = Array.from(new Set([...existingImports, ...newImports])).sort();
  return `import { ${merged.join(', ')} } from '${packageName}';`;
}

/**
 * フィールドタイプに基づいて必要な Drizzle インポートを取得する。
 *
 * @param fieldType - フィールドタイプ
 * @param dialect - データベース方言
 * @returns 必要なインポート名の配列
 */
function getImportsForFieldType(
  fieldType: SupportedFieldType,
  dialect: DbDialect
): string[] {
  switch (dialect) {
    case 'postgresql':
      switch (fieldType) {
        case 'string':
        case 'text':
          return ['text'];
        case 'integer':
          return ['integer'];
        case 'bigint':
          return ['bigint'];
        case 'boolean':
          return ['boolean'];
        case 'timestamp':
          return ['timestamp'];
        case 'date':
          return ['date'];
        case 'json':
          return ['jsonb'];
        case 'uuid':
          return ['uuid'];
      }
      break;

    case 'mysql':
      switch (fieldType) {
        case 'string':
        case 'uuid':
          return ['varchar'];
        case 'text':
          return ['text'];
        case 'integer':
          return ['int'];
        case 'bigint':
          return ['bigint'];
        case 'boolean':
          return ['boolean'];
        case 'timestamp':
          return ['timestamp'];
        case 'date':
          return ['date'];
        case 'json':
          return ['json'];
      }
      break;
  }
}

/**
 * テーブル定義コードを生成する。
 *
 * @param tableName - テーブル名
 * @param fields - フィールド定義の配列
 * @param dialect - データベース方言
 * @returns テーブルコードと必要なインポートを含むオブジェクト
 *
 * @example
 * ```typescript
 * const result = generateTableDefinition('users', [
 *   { name: 'email', type: 'string' },
 *   { name: 'age', type: 'integer' },
 * ], 'postgresql');
 *
 * console.log(result.tableCode);
 * // export const users = pgTable('users', {
 * //   id: serial('id').primaryKey(),
 * //   email: text('email').notNull(),
 * //   age: integer('age').notNull(),
 * //   createdAt: timestamp('created_at').defaultNow().notNull(),
 * // });
 *
 * console.log(result.requiredImports);
 * // ['pgTable', 'serial', 'text', 'integer', 'timestamp']
 * ```
 */
export function generateTableDefinition(
  tableName: string,
  fields: FieldDefinition[],
  dialect: DbDialect
): TableDefinition {
  const tableFunction = dialect === 'postgresql' ? 'pgTable' : 'mysqlTable';
  const requiredImports = new Set<string>([tableFunction, 'serial', 'timestamp']);

  // フィールドタイプに基づいてインポートを収集
  for (const field of fields) {
    const imports = getImportsForFieldType(field.type, dialect);
    for (const imp of imports) {
      requiredImports.add(imp);
    }
  }

  // カラム定義を生成
  const columnDefinitions = [
    `  id: serial('id').primaryKey(),`,
    ...fields.map((field) => {
      const columnDef = getColumnDefinition(field.name, field.type, dialect);
      return `  ${field.name}: ${columnDef},`;
    }),
    `  createdAt: timestamp('created_at').defaultNow().notNull(),`,
  ];

  const tableCode = `export const ${tableName} = ${tableFunction}('${tableName}', {
${columnDefinitions.join('\n')}
});
`;

  return {
    tableCode,
    requiredImports: Array.from(requiredImports).sort(),
  };
}

/**
 * 既存の db/schema.ts にモデル定義を追加する。
 *
 * @param projectRoot - プロジェクトルートディレクトリ
 * @param tableName - テーブル名
 * @param fields - フィールド定義の配列
 * @param dialect - データベース方言
 *
 * @throws {Error} db ディレクトリが存在しない場合
 *
 * @example
 * ```typescript
 * await appendModelToSchema(
 *   '/path/to/project',
 *   'users',
 *   [
 *     { name: 'email', type: 'string' },
 *     { name: 'age', type: 'integer' },
 *   ],
 *   'postgresql'
 * );
 * ```
 */
export async function appendModelToSchema(
  projectRoot: string,
  tableName: string,
  fields: FieldDefinition[],
  dialect: DbDialect
): Promise<void> {
  const schemaPath = join(projectRoot, 'db', 'schema.ts');

  // db ディレクトリの存在確認
  try {
    await stat(join(projectRoot, 'db'));
  } catch {
    throw new Error(
      'db directory does not exist. Please run "kagaribi init --db <dialect>" first.'
    );
  }

  // 既存の schema.ts を読み込む
  let existingContent: string;
  try {
    existingContent = await readFile(schemaPath, 'utf-8');
  } catch {
    throw new Error(
      `Failed to read db/schema.ts. Please ensure the file exists.`
    );
  }

  // テーブル定義を生成
  const { tableCode, requiredImports } = generateTableDefinition(
    tableName,
    fields,
    dialect
  );

  // 既存のインポート行を検出
  const packageName =
    dialect === 'postgresql' ? 'drizzle-orm/pg-core' : 'drizzle-orm/mysql-core';
  const importLineRegex = new RegExp(
    `import\\s*{[^}]+}\\s*from\\s*['"]${packageName.replace('/', '\\/')}['"];?`
  );
  const importMatch = existingContent.match(importLineRegex);

  let updatedContent: string;

  if (importMatch) {
    // 既存のインポートをマージ
    const existingImports = parseImportLine(importMatch[0]);
    const mergedImportLine = mergeImports(
      existingImports,
      requiredImports,
      packageName
    );

    // インポート行を置き換え
    updatedContent = existingContent.replace(importLineRegex, mergedImportLine);
  } else {
    // インポート行が見つからない場合（通常は発生しないはず）
    const newImportLine = `import { ${requiredImports.join(', ')} } from '${packageName}';\n`;
    updatedContent = newImportLine + existingContent;
  }

  // テーブル定義を末尾に追加
  updatedContent = updatedContent.trimEnd() + '\n\n' + tableCode;

  // ファイルに書き込む
  await writeFile(schemaPath, updatedContent, 'utf-8');
}

/**
 * フィールド定義文字列の配列をパースする。
 *
 * @param fieldArgs - `['name:string', 'email:string', 'age:integer']` 形式の配列
 * @returns パースされたフィールド定義の配列
 *
 * @throws {Error} 不正なフィールド名または型の場合
 *
 * @example
 * ```typescript
 * const fields = parseFieldDefinitions(['name:string', 'age:integer']);
 * // => [
 * //   { name: 'name', type: 'string' },
 * //   { name: 'age', type: 'integer' },
 * // ]
 * ```
 */
export function parseFieldDefinitions(fieldArgs: string[]): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  const fieldNameRegex = /^[a-z][a-z0-9_]*$/;

  for (const arg of fieldArgs) {
    const [name, type] = arg.split(':');

    if (!name || !type) {
      throw new Error(
        `Invalid field definition: "${arg}". Expected format: "fieldName:fieldType"`
      );
    }

    // フィールド名の検証
    if (!fieldNameRegex.test(name)) {
      throw new Error(
        `Invalid field name: "${name}". Field names must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.`
      );
    }

    // フィールドタイプの検証
    if (!SUPPORTED_FIELD_TYPES.includes(type as SupportedFieldType)) {
      throw new Error(
        `Invalid field type: "${type}". Supported types are: ${SUPPORTED_FIELD_TYPES.join(', ')}`
      );
    }

    fields.push({
      name,
      type: type as SupportedFieldType,
    });
  }

  return fields;
}

/**
 * プロジェクトの kagaribi.config.ts からデータベース方言を検出する。
 *
 * @param projectRoot - プロジェクトルートディレクトリ
 * @returns データベース方言
 *
 * @throws {Error} データベースが設定されていない場合、または設定ファイルの読み込みに失敗した場合
 *
 * @example
 * ```typescript
 * const dialect = await detectDbDialect('/path/to/project');
 * // => 'postgresql' or 'mysql'
 * ```
 */
export async function detectDbDialect(projectRoot: string): Promise<DbDialect> {
  const configPath = join(projectRoot, 'kagaribi.config.ts');

  try {
    const configContent = await readFile(configPath, 'utf-8');

    // db.dialect の値を抽出（簡易的な正規表現パース）
    const dialectMatch = configContent.match(
      /db\s*:\s*{\s*dialect\s*:\s*['"]([^'"]+)['"]/
    );

    if (!dialectMatch) {
      throw new Error(
        'Database is not configured. Please run "kagaribi init --db <dialect>" first.'
      );
    }

    const dialect = dialectMatch[1];
    if (dialect !== 'postgresql' && dialect !== 'mysql') {
      throw new Error(`Unsupported database dialect: "${dialect}"`);
    }

    return dialect as DbDialect;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database is not configured')) {
      throw error;
    }
    throw new Error(
      `Failed to read kagaribi.config.ts. Please ensure the file exists at ${configPath}`
    );
  }
}

/**
 * モデルヘルパーコードを生成する。
 * createDbHelper パターンに従った関数型ヘルパーを生成。
 *
 * @param tableName - テーブル名
 * @param fields - フィールド定義の配列
 * @param dialect - データベース方言
 * @returns 生成されたTypeScriptコード
 *
 * @example
 * ```typescript
 * const code = generateModelHelper('users', [
 *   { name: 'name', type: 'string' },
 *   { name: 'email', type: 'string' },
 * ], 'postgresql');
 * ```
 */
export function generateModelHelper(
  tableName: string,
  fields: FieldDefinition[],
  dialect: DbDialect
): string {
  const capitalizedName = tableName.charAt(0).toUpperCase() + tableName.slice(1);

  // Insert用の型（id, createdAtを除外）
  const insertFields = fields.map(f => f.name).join(', ');

  // Update用の型（Partial）
  const updateFields = fields.map(f => f.name).join(', ');

  return `import { eq } from 'drizzle-orm';
import { getDb } from '../index.js';
import { ${tableName} } from '../schema.js';

/**
 * ${capitalizedName} model helper.
 * Provides type-safe CRUD operations for the ${tableName} table.
 */

/**
 * Find all ${tableName} records.
 */
export async function findAll() {
  const db = getDb();
  return await db.select().from(${tableName});
}

/**
 * Find a ${tableName} record by ID.
 */
export async function findById(id: number) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(${tableName})
    .where(eq(${tableName}.id, id));
  return record ?? null;
}

/**
 * Create a new ${tableName} record.
 */
export async function create(
  data: Pick<typeof ${tableName}.$inferInsert, ${fields.map(f => `'${f.name}'`).join(' | ')}>
) {
  const db = getDb();
  const [created] = await db
    .insert(${tableName})
    .values(data)
    .returning();
  return created;
}

/**
 * Update a ${tableName} record by ID.
 */
export async function update(
  id: number,
  data: Partial<Pick<typeof ${tableName}.$inferInsert, ${fields.map(f => `'${f.name}'`).join(' | ')}>>
) {
  const db = getDb();
  const [updated] = await db
    .update(${tableName})
    .set(data)
    .where(eq(${tableName}.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Remove a ${tableName} record by ID.
 */
export async function remove(id: number) {
  const db = getDb();
  const [deleted] = await db
    .delete(${tableName})
    .where(eq(${tableName}.id, id))
    .returning();
  return deleted ?? null;
}
`;
}

/**
 * モデルヘルパーファイルを書き込む。
 *
 * @param projectRoot - プロジェクトルートディレクトリ
 * @param tableName - テーブル名
 * @param fields - フィールド定義の配列
 * @param dialect - データベース方言
 *
 * @throws {Error} 同名ファイルが既に存在する場合
 *
 * @example
 * ```typescript
 * await writeModelHelper(
 *   '/path/to/project',
 *   'users',
 *   [{ name: 'email', type: 'string' }],
 *   'postgresql'
 * );
 * ```
 */
export async function writeModelHelper(
  projectRoot: string,
  tableName: string,
  fields: FieldDefinition[],
  dialect: DbDialect
): Promise<void> {
  const modelsDir = join(projectRoot, 'db', 'models');
  const helperPath = join(modelsDir, `${tableName}.ts`);

  // db/models ディレクトリを作成
  await mkdir(modelsDir, { recursive: true });

  // 既存ファイルの確認
  try {
    await stat(helperPath);
    throw new Error(
      `Model helper file already exists: db/models/${tableName}.ts\n` +
      `Please remove the existing file or use a different table name.`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    // ファイルが存在しない場合は続行
  }

  // ヘルパーコードを生成
  const helperCode = generateModelHelper(tableName, fields, dialect);

  // ファイルに書き込む
  await writeFile(helperPath, helperCode, 'utf-8');
}

/**
 * db/models/index.ts を更新して新しいモデルをエクスポートする。
 *
 * @param projectRoot - プロジェクトルートディレクトリ
 * @param tableName - テーブル名
 *
 * @example
 * ```typescript
 * await updateModelIndex('/path/to/project', 'users');
 * // db/models/index.ts に "export * from './users.js';" を追加
 * ```
 */
export async function updateModelIndex(
  projectRoot: string,
  tableName: string
): Promise<void> {
  const indexPath = join(projectRoot, 'db', 'models', 'index.ts');
  const exportStatement = `export * from './${tableName}.js';`;

  let existingContent = '';

  // 既存ファイルを読み込む（存在しない場合は空文字列）
  try {
    existingContent = await readFile(indexPath, 'utf-8');
  } catch {
    // ファイルが存在しない場合は空から始める
  }

  // 既に同じエクスポートが存在するかチェック
  if (existingContent.includes(exportStatement)) {
    // 既に存在する場合はスキップ
    return;
  }

  // 新しいエクスポート文を追加
  const updatedContent = existingContent.trim()
    ? existingContent.trimEnd() + '\n' + exportStatement + '\n'
    : exportStatement + '\n';

  // ファイルに書き込む
  await writeFile(indexPath, updatedContent, 'utf-8');
}
