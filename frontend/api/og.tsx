import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Vibe Coding Meetups";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
          borderLeft: "6px solid #00ffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#00ffff",
            textAlign: "center",
            padding: "0 60px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(184, 197, 214, 0.8)",
            marginTop: 16,
          }}
        >
          Vibe Coding Meetups
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
