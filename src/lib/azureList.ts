type ListItem = {
  name: string;
  url: string;
  size?: number;
  lastModified?: string;
};

function resolveContainerSasUrl(): string {
  let containerSasUrl = process.env.AZURE_BLOB_CONTAINER_SAS_URL;
  if (!containerSasUrl) {
    const account = process.env.AZURE_STORAGE_ACCOUNT;
    const container = process.env.AZURE_STORAGE_CONTAINER;
    let token = process.env.AZURE_CONTAINER_SAS_TOKEN;
    if (account && container && token) {
      token = token.replace(/^\?+/, "");
      containerSasUrl = `https://${account}.blob.core.windows.net/${container}?${token}`;
    }
  }
  if (!containerSasUrl) {
    throw new Error(
      "Missing container SAS URL. Set AZURE_BLOB_CONTAINER_SAS_URL or provide AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_CONTAINER, and AZURE_CONTAINER_SAS_TOKEN."
    );
  }
  return containerSasUrl;
}

function splitSasUrl(containerSasUrl: string): { baseUrl: string; sas: string } {
  const [baseUrl, query = ""] = containerSasUrl.split("?");
  if (!query) throw new Error("Invalid SAS URL: missing query.");
  return { baseUrl: baseUrl.replace(/\/?$/, ""), sas: query };
}

export async function listBlobsByPrefix(prefix: string): Promise<ListItem[]> {
  const containerSasUrl = resolveContainerSasUrl();
  const { baseUrl, sas } = splitSasUrl(containerSasUrl);

  const results: ListItem[] = [];
  let marker = "";
  // Ensure trailing slash behavior for folder-like keys
  const effectivePrefix = prefix.replace(/^\/+|\/+$/g, "");

  while (true) {
    const listUrl = `${baseUrl}?restype=container&comp=list&prefix=${encodeURIComponent(effectivePrefix)}` +
      (marker ? `&marker=${encodeURIComponent(marker)}` : "") +
      `&maxresults=5000&include=metadata&${sas}`;

    const res = await fetch(listUrl, {
      method: "GET",
      headers: {
        // Optional but good to include; Azure accepts older versions too
        "x-ms-version": "2021-10-04",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Azure list failed (${res.status}): ${text}`);
    }
    const xml = await res.text();
    const { items, nextMarker } = parseListXml(xml, baseUrl);
    results.push(
      ...items.filter((i) => i.name.startsWith(effectivePrefix))
    );
    if (!nextMarker) break;
    marker = nextMarker;
  }

  return results;
}

function parseListXml(xml: string, baseUrl: string): { items: ListItem[]; nextMarker?: string } {
  const items: ListItem[] = [];
  // Get NextMarker if present
  const nextMarkerMatch = xml.match(/<NextMarker>([\s\S]*?)<\/NextMarker>/i);
  const nextMarker = nextMarkerMatch ? decodeXml(nextMarkerMatch[1].trim()) : undefined;

  const blobRegex = /<Blob>([\s\S]*?)<\/Blob>/gi;
  let m: RegExpExecArray | null;
  while ((m = blobRegex.exec(xml))) {
    const blobXml = m[1];
    const name = getTag(blobXml, "Name");
    if (!name) continue;
    const lastModified = getTag(blobXml, "Last-Modified");
    const sizeStr = getTag(blobXml, "Content-Length");
    const size = sizeStr ? Number(sizeStr) : undefined;
    const url = `${baseUrl}/${encodeURIComponent(name)}`;
    items.push({ name, url, size, lastModified });
  }
  return { items, nextMarker };
}

function getTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeXml(m[1].trim()) : undefined;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

export function getPublicBlobUrl(name: string): string {
  const containerSasUrl = resolveContainerSasUrl();
  const { baseUrl } = splitSasUrl(containerSasUrl);
  return `${baseUrl}/${encodeURIComponent(name)}`;
}

