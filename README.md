## TikTok downloader

The mobile downloader uses this web app as a secure proxy. Set `FASTSAVER_API_KEY` in the web app's local environment and Vercel project settings. Keep this key server-side; do not add it to an `EXPO_PUBLIC_` variable. `.env.example` lists the server variable.

Set `EXPO_PUBLIC_TIKTOK_DOWNLOADER_ENDPOINT` in the mobile app to the deployed endpoint, for example `https://your-app.vercel.app/api/tiktok/download`. FastSaverAPI currently offers 1,000 free credits without a payment card; a successful TikTok lookup costs 1.5 credits. Provider quotas and pricing can change.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# TikTok downloader

The mobile downloader uses the web app as a secure proxy. Set `FASTSAVER_API_KEY` in the web app's local environment and Vercel project settings. Keep this key server-side; do not add it to an `EXPO_PUBLIC_` variable.

Set `EXPO_PUBLIC_TIKTOK_DOWNLOADER_ENDPOINT` in the mobile app to the deployed endpoint, for example `https://your-app.vercel.app/api/tiktok/download`. FastSaverAPI's free tier currently includes 1,000 credits without a payment card; a successful TikTok lookup costs 1.5 credits. Provider quotas and pricing can change.
