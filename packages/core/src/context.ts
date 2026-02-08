import type { MiddlewareHandler } from 'hono';

const CONTEXT_HEADER = 'X-Kagaribi-Context';
const SIGNATURE_HEADER = 'X-Kagaribi-Signature';

/**
 * テキストデータをHMAC-SHA256で署名する。
 */
async function signData(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * HMAC-SHA256署名を検証する。
 */
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await signData(data, secret);
  return expected === signature;
}

/**
 * リモートパッケージから受信したコンテキストヘッダーを検証・復元するミドルウェア。
 * リモートパッケージ側で使用する。
 */
export function kagaribiContextMiddleware(
  sharedSecret: string
): MiddlewareHandler {
  return async (c, next) => {
    const contextHeader = c.req.header(CONTEXT_HEADER);
    const signatureHeader = c.req.header(SIGNATURE_HEADER);

    if (contextHeader && signatureHeader) {
      const isValid = await verifySignature(
        contextHeader,
        signatureHeader,
        sharedSecret
      );

      if (!isValid) {
        return c.json({ error: 'Invalid context signature' }, 403);
      }

      const parsed = JSON.parse(contextHeader);
      // コンテキストをHonoのc.setに復元
      for (const [key, value] of Object.entries(parsed)) {
        c.set(key as never, value as never);
      }
    }

    await next();
  };
}

/**
 * Honoコンテキストからリモート転送用のヘッダーを生成するユーティリティ。
 * プロキシミドルウェア内で使用する。
 */
export async function createContextHeaders(
  contextData: Record<string, unknown>,
  sharedSecret: string
): Promise<Record<string, string>> {
  const contextJson = JSON.stringify(contextData);
  const signature = await signData(contextJson, sharedSecret);

  return {
    [CONTEXT_HEADER]: contextJson,
    [SIGNATURE_HEADER]: signature,
  };
}
