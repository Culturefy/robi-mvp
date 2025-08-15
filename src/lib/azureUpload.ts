/**
 * Upload Files to Azure Blob Storage (public container) using a Container SAS URL.
 *
 * Requirements:
 * - The container must be public (blob-level public read) OR you handle access via SAS when consuming.
 * - Provide a SAS URL for the container via opts.containerSasUrl or env AZURE_BLOB_CONTAINER_SAS_URL.
 * - Works with Web File objects returned by Next.js `req.formData()`.
 */

export type AzureUploadOptions = {
  /** Full container SAS URL: https://{account}.blob.core.windows.net/{container}?{sas} */
  containerSasUrl?: string;
  /** Optional prefix to add to blob names, e.g., "leads/2025/" */
  prefix?: string;
};

export async function uploadFilesToAzureContainer(
  files: File[],
  options: AzureUploadOptions = {}
): Promise<{ urls: string[]; names: string[] }> {
  if (!files || files.length === 0) return { urls: [], names: [] };

  // Resolve container SAS URL from option, env, or assembled pieces
  let containerSasUrl = options.containerSasUrl || process.env.AZURE_BLOB_CONTAINER_SAS_URL;
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

  const { baseUrl, sas } = splitSasUrl(containerSasUrl);
  const prefix = (options.prefix || "").replace(/^\/+|\/+$/g, "");

  const results = [] as { url: string; name: string }[];

  for (const file of files) {
    const safeName = makeSafeBlobName(file.name);
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const blobName = prefix ? `${prefix}/${ts}-${rand}-${safeName}` : `${ts}-${rand}-${safeName}`;
    const putUrl = `${baseUrl}/${encodeURIComponent(blobName)}?${sas}`;

    const res = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Azure upload failed (${res.status}): ${text}`);
    }

    // Public URL (without SAS) if container is public
    const publicUrl = `${baseUrl}/${encodeURIComponent(blobName)}`;
    results.push({ url: publicUrl, name: blobName });
  }

  return { urls: results.map((r) => r.url), names: results.map((r) => r.name) };
}

function splitSasUrl(containerSasUrl: string): { baseUrl: string; sas: string } {
  const [baseUrl, query = ""] = containerSasUrl.split("?");
  if (!query) throw new Error("Invalid SAS URL: missing query.");
  return { baseUrl: baseUrl.replace(/\/?$/, ""), sas: query };
}

function makeSafeBlobName(name: string): string {
  const cleaned = name
    .replace(/[\\\n\r]/g, "_")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-]/g, "-");
  return cleaned || "file";
}
