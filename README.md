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

## Containers

Building a container image (used for production deployment):

```bash
podman build -t radicle-garden .
```
