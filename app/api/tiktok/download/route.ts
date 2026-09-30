const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);

const DOWNLOADER_API = 'https://api.fastsaver.io/v1/fetch';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'A valid JSON body is required.' }, { status: 400 });
  }

  const inputUrl = typeof body === 'object' && body !== null && 'url' in body
    ? (body as { url?: unknown }).url
    : undefined;

  if (typeof inputUrl !== 'string' || inputUrl.length > 2048) {
    return Response.json({ error: 'Provide a valid TikTok video URL.' }, { status: 400 });
  }

  let videoUrl: URL;
  try {
    videoUrl = new URL(inputUrl);
  } catch {
    return Response.json({ error: 'Provide a valid TikTok video URL.' }, { status: 400 });
  }

  if (videoUrl.protocol !== 'https:' || !TIKTOK_HOSTS.has(videoUrl.hostname.toLowerCase())) {
    return Response.json({ error: 'Only TikTok video links are supported.' }, { status: 400 });
  }

  const apiKey = process.env.FASTSAVER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'The video download service is not configured.' }, { status: 503 });
  }

  try {
    const apiUrl = new URL(DOWNLOADER_API);
    apiUrl.searchParams.set('url', videoUrl.toString());

    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 429) {
        return Response.json({ error: 'The video service is busy. Please try again shortly.' }, { status: 429 });
      }
      return Response.json({ error: 'The video service could not resolve this link.' }, { status: 502 });
    }

    const payload: unknown = await response.json();
    const result = typeof payload === 'object' && payload !== null
      ? payload as { ok?: unknown; download_url?: unknown }
      : undefined;
    const downloadUrl = result?.ok === true ? result.download_url : undefined;

    if (typeof downloadUrl !== 'string' || !downloadUrl.startsWith('https://')) {
      return Response.json({ error: 'No downloadable video was found for this link.' }, { status: 404 });
    }

    return Response.json({ downloadUrl });
  } catch {
    return Response.json({ error: 'The video service is temporarily unavailable.' }, { status: 502 });
  }
}
