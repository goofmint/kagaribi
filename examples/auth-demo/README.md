# Kagaribi Auth Demo

A practical JWT authentication demo using Kagaribi's multi-package architecture.

## Architecture

Three packages demonstrate authentication flow:

- **`auth`** - JWT token issuing and verification
- **`api`** - Protected API endpoints requiring authentication
- **`root`** - Frontend UI with login/dashboard

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set required secrets:

```env
JWT_SECRET=your-secret-key-change-this-in-production
SHARED_SECRET=your-shared-secret-change-this-in-production
```

**Important**: These environment variables are required. The app will throw an error if they are not set.

### 3. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### Demo Credentials

- **Alice**: `alice@example.com` / `password123`
- **Bob**: `bob@example.com` / `password456`

## API Endpoints

### Authentication (auth package)

- `POST /auth/api/login` - Login and get access/refresh tokens
- `POST /auth/api/refresh` - Refresh access token
- `GET /auth/api/verify` - Verify token

### Protected API (api package)

- `GET /api/profile` - Get user profile (requires JWT)
- `GET /api/secret` - Get secret data (requires JWT)

All protected endpoints require `Authorization: Bearer <token>` header.

## Features Demonstrated

1. **JWT Authentication**
   - Token pair generation using `createTokenPair()` from `@kagaribi/core`
   - Access tokens (15 min) and refresh tokens (7 days)

2. **Package Communication**
   - Type-safe RPC calls with `getClient<T>()`
   - Transparent switching between local and distributed deployment

3. **Context Propagation**
   - Automatic JWT payload propagation using `X-Kagaribi-Context` headers
   - HMAC signature verification with `SHARED_SECRET`

4. **Kagaribi Core Utilities**
   - `JWT_DEFAULTS` - Default token configuration
   - `createTokenPair()` - Generate token pairs easily
   - `requireEnv()` - Environment variable validation
   - `createEnvMiddleware()` - Node.js to Hono env adapter

## Deployment

Build for production:

```bash
pnpm build
```

Deploy packages individually:

```bash
kagaribi deploy auth --cloudflare
kagaribi deploy api --cloudflare
```

## Security Notes

For production:

1. Use secure secret management (AWS Secrets Manager, Cloudflare Secrets, etc.)
2. Enable HTTPS
3. Set `secure: true` and `sameSite: 'strict'` on cookies
4. Implement rate limiting on login endpoints

See [docs/guides/authentication.md](../../docs/guides/authentication.md) for best practices.

## License

MIT
