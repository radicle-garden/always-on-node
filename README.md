# Radicle Garden

A web app for managing your radicle garden.

## Development

Requires a radicle-gardener instance running.

```bash
cp .env.example .env.local
```

Edit `.env.local` to set the `PUBLIC_API_URL` to the URL of your radicle-gardener instance.

```bash
pnpm i
pnpm dev
```

## Docker

```bash
podman build -t radicle-garden .
podman run -p 3000:80 radicle-garden
```

Then visit `http://localhost:3000` in your browser.
