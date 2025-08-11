import { NextRequest } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET(_req: NextRequest) {
  const filePath = path.join(process.cwd(), "template.html");
  try {
    const html = await fs.readFile(filePath, "utf8");
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Avoid caching during development; adjust if needed
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("Failed to read template.html", err);
    return new Response("Template not found", { status: 500 });
  }
}

