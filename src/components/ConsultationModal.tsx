"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  leadCategory: string;
  icpScore: number;
  clientDetails: unknown;
  selectionsPayload?: unknown;
  onNotify?: (type: "success" | "error" | "info", message: string) => void;
};

export default function ConsultationModal({ open, onClose, leadCategory, icpScore, clientDetails, selectionsPayload, onNotify }: Props) {
  const US_STATES: { value: string; label: string }[] = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "DC", label: "District of Columbia" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ];
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const [phone, setPhone] = useState("");
  const [meetingLocal, setMeetingLocal] = useState("");

  function formatUSPhone(input: string) {
    const digits = (input || "").replace(/\D/g, "");
    const d = digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length <= 3) return a ? `(${a}` : "";
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = formatUSPhone(e.target.value);
    setPhone(next);
  }

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  function isValidThirtyMinuteSlot(d: Date) {
    const m = d.getMinutes();
    return m === 0 || m === 30;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errorEl = errorRef.current;
    const successEl = successRef.current;
    if (errorEl) errorEl.classList.add("hidden");
    if (successEl) successEl.classList.add("hidden");
    if (submitRef.current) {
      submitRef.current.disabled = true;
      submitRef.current.textContent = "Submitting...";
    }
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      // Normalize phone to digits-only for backend/CRM compatibility
      const phoneVal = (fd.get("phone") || "").toString();
      fd.set("phone", phoneVal.replace(/\D/g, ""));

      // Meeting time normalization and validation
      const preferred = (fd.get("preferredMeetingLocal") || "").toString();
      if (preferred) {
        const localDate = new Date(preferred);
        if (isNaN(localDate.getTime())) {
          throw new Error("Please provide a valid preferred meeting time.");
        }
        const now = new Date();
        if (localDate.getTime() <= now.getTime()) {
          throw new Error("Preferred meeting time must be in the future.");
        }
        if (!isValidThirtyMinuteSlot(localDate)) {
          throw new Error("Please pick a time on the half-hour (e.g., 10:00 or 10:30).");
        }
        const end = new Date(localDate.getTime() + 30 * 60 * 1000);
        fd.append("preferredMeetingStartISO", localDate.toISOString());
        fd.append("preferredMeetingEndISO", end.toISOString());
        fd.append("preferredMeetingDurationMin", "30");
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          fd.append("preferredMeetingTimezone", tz);
        } catch {}
      }
      // Attach context
      fd.append("leadCategory", String(leadCategory));
      fd.append("icpScore", String(icpScore));
      fd.append("selections", JSON.stringify(selectionsPayload ?? clientDetails));

      const res = await fetch("/api/create-contact", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const msg = data.message || "Thanks! We'll be in touch shortly.";
      if (successEl) {
        successEl.textContent = msg;
        successEl.classList.remove("hidden");
      }
      onNotify?.("success", msg);
      form.reset();
      setPhone("");
      setMeetingLocal("");
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      const em = err?.message || "Could not submit. Please try again.";
      if (errorEl) {
        errorEl.textContent = em;
        errorEl.classList.remove("hidden");
      }
      onNotify?.("error", em);
    } finally {
      if (submitRef.current) {
        submitRef.current.disabled = false;
        submitRef.current.textContent = "Submit";
      }
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" aria-label="Close">
          ✕
        </button>
        <h3 className="text-xl font-semibold mb-1" style={{ color: "#08213E" }}>Schedule Consultation</h3>
        <p className="text-sm text-gray-500 mb-4">Share your details and we’ll follow up shortly.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First Name</label>
              <input type="text" name="firstName" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last Name</label>
              <input type="text" name="lastName" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input type="email" name="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={handlePhoneChange}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-1234"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]"
            />
          </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Company</label>
          <input type="text" name="company" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Job Title</label>
          <input type="text" name="jobTitle" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" placeholder="e.g., CFO" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">City</label>
            <input type="text" name="city" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" placeholder="City" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">State</label>
            <select name="state" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]">
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Preferred meeting time (30 mins)</label>
          <input
            type="datetime-local"
            name="preferredMeetingLocal"
            value={meetingLocal}
            onChange={(e) => setMeetingLocal(e.target.value)}
            step={1800}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]"
          />
          <div className="text-xs text-gray-500 mt-1">We’ll try to book your preferred 30-minute slot.</div>
        </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" placeholder="Anything specific you want us to know" />
          </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">We will be needing your tax documents</label>
          <input name="attachments" type="file" multiple className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt" />
          <div className="text-xs text-gray-500 mt-1">Up to 10 files, max 25MB total.</div>
        </div>
          <div ref={errorRef} className="hidden text-sm text-red-600" />
          <div ref={successRef} className="hidden text-sm text-green-700" />
          <button ref={submitRef} type="submit" className="w-full text-white font-semibold py-2.5 rounded-lg transition-colors" style={{ backgroundColor: "#08213E" }}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
