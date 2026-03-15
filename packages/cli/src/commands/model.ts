import { join } from 'node:path';
import {
  detectDbDialect,
  parseFieldDefinitions,
  appendModelToSchema,
  writeModelHelper,
  updateModelIndex,
} from '@kagaribi/core';
import type { DbDialect } from '@kagaribi/core';

interface ModelNewOptions {
  /** テーブル名 */
  name: string;
  /** フィールド定義（'name:string' 形式） */
  fields: string[];
  /** データベース方言オーバーライド */
  db?: DbDialect;
  /** パッケージスコープ（相対パス） */
  scope?: string;
}

/**
 * kagaribi model new コマンド。
 * 新しいモデル（テーブル定義）を db/schema.ts に追加する。
 */
export async function modelNewCommand(options: ModelNewOptions): Promise<void> {
  const projectRoot = process.cwd();
  const { name, fields, db, scope } = options;

  // scope が指定されている場合、dbDir を計算
  const dbDir = scope ? join(projectRoot, scope, 'db') : undefined;

  try {
    // 1. データベース方言を検出（オーバーライドがある場合はそれを使用）
    let dialect: DbDialect;
    if (db) {
      dialect = db;
      console.log(`Using specified dialect: ${dialect}`);
    } else {
      console.log('Detecting database dialect from kagaribi.config.ts...');
      dialect = await detectDbDialect(projectRoot);
      console.log(`Detected dialect: ${dialect}`);
    }

    if (scope) {
      console.log(`Using scoped database directory: ${dbDir}`);
    }

    // 2. フィールド定義をパース
    console.log(`Parsing field definitions...`);
    const parsedFields = parseFieldDefinitions(fields);

    // 3. schema.ts にモデルを追加
    console.log(`Adding model "${name}" to db/schema.ts...`);
    await appendModelToSchema(projectRoot, name, parsedFields, dialect, dbDir);

    // 4. モデルヘルパーファイルを生成
    console.log(`Generating model helper for "${name}"...`);
    await writeModelHelper(projectRoot, name, parsedFields, dialect, dbDir);

    // 5. models/index.ts を更新
    console.log(`Updating db/models/index.ts...`);
    await updateModelIndex(projectRoot, name, dbDir);

    // 6. 成功メッセージ
    console.log(`\n✓ Model "${name}" created successfully!`);
    console.log(`  - Table: ${name}`);
    console.log(`  - Fields: id, ${parsedFields.map((f: { name: string }) => f.name).join(', ')}, createdAt`);
    console.log(`\n📁 Generated files:`);
    console.log(`  ✓ db/schema.ts にテーブル定義を追加`);
    console.log(`  ✓ db/models/${name}.ts にモデルヘルパーを生成`);
    console.log(`  ✓ db/models/index.ts を更新`);
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Run "npx drizzle-kit generate" to create migration files`);
    console.log(`  2. Run "npx drizzle-kit push" to apply changes to your database`);
  } catch (error) {
    if (error instanceof Error) {
      // データベース未設定のエラー
      if (error.message.includes('Database is not configured')) {
        console.error('\n❌ Error: Database is not configured.');
        console.error('   Please run "kagaribi init --db <dialect>" first to set up database support.');
        console.error('   Supported dialects: postgresql, mysql, sqlite');
        process.exit(1);
      }

      // db/ ディレクトリが存在しないエラー
      if (error.message.includes('db directory does not exist')) {
        console.error('\n❌ Error: Database directory does not exist.');
        console.error('   Please run "kagaribi init --db <dialect>" first to set up database support.');
        process.exit(1);
      }

      // フィールド定義が不正なエラー
      if (
        error.message.includes('Invalid field') ||
        error.message.includes('Supported types are')
      ) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error('\nExample usage:');
        console.error('  kagaribi model new users name:string email:string age:integer');
        process.exit(1);
      }

      // モデルヘルパーファイルが既に存在するエラー
      if (error.message.includes('already exists')) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
      }

      // その他のエラー
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }

    // 予期しないエラー
    console.error('\n❌ Unexpected error occurred.');
    console.error(error);
    process.exit(1);
  }
}
