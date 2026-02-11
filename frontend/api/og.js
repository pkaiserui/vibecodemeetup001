import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Vibe Coding Meetups";

  const html = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f3460 100%)",
        padding: "60px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "6px solid #00ffff",
              paddingLeft: "40px",
              maxWidth: "900px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 52,
                    fontWeight: 700,
                    color: "#00ffff",
                    textAlign: "left",
                    lineHeight: 1.2,
                    marginBottom: "16px",
                  },
                  children: title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 24,
                    color: "#6c7b95",
                    textAlign: "left",
                    width: "100%",
                  },
                  children: "⚡ Vibe Coding Meetups",
                },
              },
            ],
          },
        },
      ],
    },
  };

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
}
