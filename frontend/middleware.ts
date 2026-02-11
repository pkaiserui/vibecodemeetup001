const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slurp|Discordbot|applebot|googlebot|bingbot|iMessage/i;

export const config = {
  matcher: ["/events/:eventId"],
};

export default async function middleware(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const url = new URL(req.url);
  const eventId = url.pathname.split("/events/")[1]?.split("/")[0];

  if (!BOT_UA.test(ua) || !eventId) {
    const pass = await fetch(url.origin + "/");
    return new Response(await pass.text(), {
      headers: pass.headers,
      status: pass.status,
    });
  }

  // Set VITE_API_BASE_URL in Vercel to your production API for link previews
  const apiBase = process.env.VITE_API_BASE_URL || "http://localhost:8000";
  let event: { title: string; description: string } | null = null;

  try {
    const res = await fetch(`${apiBase}/events/${eventId}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      event = await res.json();
    }
  } catch {
    /* ignore */
  }

  const origin = url.origin;
  const htmlRes = await fetch(`${origin}/`);
  let html = await htmlRes.text();

  if (event) {
    const title = escapeHtml(event.title);
    const desc = escapeHtml(
      event.description.length > 160
        ? event.description.slice(0, 157) + "..."
        : event.description
    );
    const canonicalUrl = `${origin}/events/${eventId}`;
    const img = `${origin}/api/og?title=${encodeURIComponent(event.title)}`;

    const meta = [
      `<title>${title} | Vibe Coding Meetups</title>`,
      `<meta name="description" content="${desc}">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${desc}">`,
      `<meta property="og:image" content="${img}">`,
      `<meta property="og:url" content="${canonicalUrl}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${desc}">`,
      `<meta name="twitter:image" content="${img}">`,
    ].join("\n    ");

    html = html.replace(
      /<title>[\s\S]*?<\/title>|<meta\s+(name|property)="(description|og:[^"]*|twitter:[^"]*)"[^>]*\/?>/gi,
      ""
    );
    html = html.replace(
      /<meta charset="UTF-8" \/>\s*<meta name="viewport"/,
      `<meta charset="UTF-8" />\n    ${meta}\n    <meta name="viewport"`
    );
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
