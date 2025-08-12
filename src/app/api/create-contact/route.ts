import { NextRequest } from "next/server";
import { uploadFilesToAzureContainer } from "@/lib/azureUpload";

type ContactPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  city?: string;
  state?: string;
  notes?: string;
  leadCategory?: string;
  icpScore?: number;
  selections?: unknown;
  preferredMeetingLocal?: string;
  preferredMeetingStartISO?: string;
  preferredMeetingEndISO?: string;
  preferredMeetingDurationMin?: string;
  preferredMeetingTimezone?: string;
  attachments?: { name: string; size: number; type: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");
    let body: ContactPayload = {};
    let form: FormData | undefined;
    let files: File[] = [];

    if (isMultipart) {
      form = await req.formData();
      files = form.getAll("attachments").filter(Boolean) as File[];
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
        attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
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

    if (process.env.AZURE_BLOB_CONTAINER_SAS_URL && files.length > 0) {
      try {
        const { urls } = await uploadFilesToAzureContainer(files, {
          prefix: `leads/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`,
        });
        uploadedUrls = urls;
      } catch (e) {
        console.error("Azure upload error", e);
      }
    }

    if (process.env.HUBSPOT_ACCESS_TOKEN && (!provider || provider === "hubspot")) {
      result = await createContactHubSpot(body);
    } else if (process.env.PIPEDRIVE_API_TOKEN && (!provider || provider === "pipedrive")) {
      result = await createContactPipedrive(body);
    } else {
      result = { id: `local-${Date.now()}` };
    }

    // Forward to external webhook with all details
    const webhookUrl = "https://webhook.latenode.com/41426/dev/a84ac0f8-6356-4aea-a2e1-212ffdf5ab6d";
    const context = {
      provider: provider || inferProviderFromEnv(),
      contactId: result?.id,
      crmUrl: result?.url,
      uploadedUrls: uploadedUrls || [],
      receivedAt: new Date().toISOString(),
    };

    try {
      if (isMultipart && form) {
        const outbound = new FormData();
        // Pass through all fields except attachments (added below)
        for (const [key, val] of form.entries()) {
          if (key === "attachments") continue;
          outbound.append(key, val as any);
        }
        files.forEach((file) => outbound.append("attachments", file, file.name));
        outbound.append("context", JSON.stringify(context));
        const r = await fetch(webhookUrl, { method: "POST", body: outbound });
        if (!r.ok) {
          console.error("Webhook error", r.status, await safeText(r));
        }
      } else {
        const r = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, ...context }),
        });
        if (!r.ok) {
          console.error("Webhook error", r.status, await safeText(r));
        }
      }
    } catch (e) {
      console.error("Webhook forward failed", e);
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

function parseMaybeJSON(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
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
