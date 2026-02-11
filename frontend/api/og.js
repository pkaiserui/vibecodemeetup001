export const config = { runtime: "edge" };

// Minimal valid 1x1 red PNG (68 bytes) to test if Edge functions can return binary
const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84,
  8, 215, 99, 248, 207, 192, 0, 0, 0, 3, 0, 1, 24, 216, 95, 168, 0, 0, 0, 0,
  73, 69, 78, 68, 174, 66, 96, 130,
]);

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug");

  if (debug === "tiny") {
    return new Response(TINY_PNG, {
      headers: { "Content-Type": "image/png" },
    });
  }

  // Try @vercel/og
  try {
    const { ImageResponse } = await import("@vercel/og");

    const title = searchParams.get("title") || "Vibe Coding Meetups";

    const response = new ImageResponse(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1a1a2e",
            color: "#00ffff",
            fontSize: 48,
          },
          children: String(title),
        },
      },
      { width: 1200, height: 630 }
    );

    return response;
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e), message: e.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
