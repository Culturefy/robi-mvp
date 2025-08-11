import { NextRequest } from "next/server";
import { uploadFilesToAzureContainer } from "@/lib/azureUpload";

type ContactPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  leadCategory?: string;
  icpScore?: number;
  selections?: unknown;
  attachments?: { name: string; size: number; type: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: ContactPayload;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const attachments = form.getAll("attachments").filter(Boolean) as File[];
      body = {
        firstName: (form.get("firstName") as string) || undefined,
        lastName: (form.get("lastName") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        company: (form.get("company") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        leadCategory: (form.get("leadCategory") as string) || undefined,
        icpScore: form.get("icpScore") ? Number(form.get("icpScore")) : undefined,
        selections: parseMaybeJSON(form.get("selections")),
        attachments: attachments.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      };
    } else {
      body = (await req.json()) as ContactPayload;
    }

    if (!body || !body.email) {
      return Response.json({ error: "Missing required email" }, { status: 400 });
    }

    const provider = process.env.CRM_PROVIDER?.toLowerCase();
    let result: { id?: string; url?: string } | undefined;
    let uploadedUrls: string[] | undefined;

    // Optional: upload attachments to Azure if configured
    const hasAzure = !!process.env.AZURE_BLOB_CONTAINER_SAS_URL;
    if (hasAzure && (body as any).attachments && Array.isArray((body as any).attachments)) {
      // When using multipart, we didn't keep the File objects in `body.attachments`.
      // Re-parse the multipart to extract File objects if needed.
    }
    const contentType = req.headers.get("content-type") || "";
    if (process.env.AZURE_BLOB_CONTAINER_SAS_URL && contentType.includes("multipart/form-data")) {
      try {
        const form = await req.formData();
        const files = form.getAll("attachments").filter(Boolean) as File[];
        if (files.length > 0) {
          const { urls } = await uploadFilesToAzureContainer(files, {
            prefix: `leads/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`,
          });
          uploadedUrls = urls;
        }
      } catch (e) {
        console.error("Azure upload error", e);
      }
    }

    if ((process.env.HUBSPOT_ACCESS_TOKEN && (!provider || provider === "hubspot"))) {
      result = await createContactHubSpot(body);
    } else if ((process.env.PIPEDRIVE_API_TOKEN && (!provider || provider === "pipedrive"))) {
      result = await createContactPipedrive(body);
    } else {
      // Fallback: accept the lead without external call
      result = { id: `local-${Date.now()}` };
    }

    return Response.json({
      ok: true,
      message: "Contact captured successfully",
      provider: provider || inferProviderFromEnv(),
      contactId: result?.id,
      url: result?.url,
      attachments: body.attachments?.map((a) => ({ name: a.name, size: a.size })) || [],
      uploadedUrls: uploadedUrls || [],
    });
  } catch (err) {
    console.error("create-contact error", err);
    return Response.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

function inferProviderFromEnv(): string | undefined {
  if (process.env.HUBSPOT_ACCESS_TOKEN) return "hubspot";
  if (process.env.PIPEDRIVE_API_TOKEN) return "pipedrive";
  return undefined;
}

async function createContactHubSpot(payload: ContactPayload) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN!;
  const url = "https://api.hubapi.com/crm/v3/objects/contacts";
  const properties: Record<string, string | number | undefined> = {
    firstname: payload.firstName,
    lastname: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    company: payload.company,
    lifecyclestage: "lead",
  };

  // Attach custom context to a note-like property if available
  const context = {
    leadCategory: payload.leadCategory,
    icpScore: payload.icpScore,
    selections: payload.selections,
    notes: payload.notes,
    attachments: payload.attachments,
  };

  // Some portals have a generic property like "notes" or "message"; we try message
  (properties as any).message = JSON.stringify(context);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id?: string; links?: { self?: string } };
  return { id: data.id, url: data?.links?.self };
}

async function createContactPipedrive(payload: ContactPayload) {
  const token = process.env.PIPEDRIVE_API_TOKEN!;
  const base = process.env.PIPEDRIVE_BASE_URL || "https://api.pipedrive.com/v1";
  const url = `${base}/persons?api_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || payload.email,
      email: payload.email,
      phone: payload.phone,
      org_id: undefined,
      visible_to: 3,
      add_time: new Date().toISOString(),
      note: JSON.stringify({
        company: payload.company,
        notes: payload.notes,
        leadCategory: payload.leadCategory,
        icpScore: payload.icpScore,
        selections: payload.selections,
        attachments: payload.attachments,
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipedrive error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  return { id: String(data?.data?.id || ""), url: data?.additional_data?.pagination?.more_items_in_collection ? undefined : undefined };
}
