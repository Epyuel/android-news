export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = process.env.IOS_APPLE_TEAM_ID?.trim();
  const bundleId = process.env.IOS_BUNDLE_IDENTIFIER?.trim() || "com.haileyesus.danahd";
  return Response.json({
    applinks: {
      apps: [],
      details: teamId ? [{ appID: `${teamId}.${bundleId}`, paths: ["/post/*"] }] : [],
    },
  });
}
