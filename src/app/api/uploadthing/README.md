# UploadThing Setup

## Install

```bash
npm install uploadthing @uploadthing/react
```

## Environment variables

Add to `.env`:

```
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=your-app-id
```

Get both from https://uploadthing.com → Dashboard → your app → API Keys.

## API version note

This integration targets **uploadthing v7** (`file.ufsUrl` for the CDN URL).
If you are on v6, replace `file.ufsUrl` with `file.url` in `core.ts`.

Check your version: `npm list uploadthing`
