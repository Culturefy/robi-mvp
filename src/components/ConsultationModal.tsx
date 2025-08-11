"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  leadCategory: string;
  icpScore: number;
  clientDetails: unknown;
  onNotify?: (type: "success" | "error" | "info", message: string) => void;
};

export default function ConsultationModal({ open, onClose, leadCategory, icpScore, clientDetails, onNotify }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const [phone, setPhone] = useState("");

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
      // Attach context
      fd.append("leadCategory", String(leadCategory));
      fd.append("icpScore", String(icpScore));
      fd.append("selections", JSON.stringify(clientDetails));

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
            <label className="block text-sm text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]" placeholder="Anything specific you want us to know" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Attachments</label>
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
