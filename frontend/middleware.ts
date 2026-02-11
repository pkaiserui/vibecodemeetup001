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
    const img = `https://placehold.co/1200x630/1a1a2e/00ffff?text=${encodeURIComponent(event.title)}`;

    const meta = [
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${desc}">`,
      `<meta property="og:image" content="${img}">`,
      `<meta property="og:url" content="${canonicalUrl}">`,
      `<meta property="og:type" content="website">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${desc}">`,
      `<meta name="twitter:image" content="${img}">`,
      `<title>${title} | Vibe Coding Meetups</title>`,
      `<meta name="description" content="${desc}">`,
    ].join("\n    ");

    html = html.replace(
      /<meta name="description"/,
      `${meta}\n    <meta name="description"`
    );
    html = html.replace(/<title>[^<]+<\/title>/, `<title>${title} | Vibe Coding Meetups</title>`);
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
