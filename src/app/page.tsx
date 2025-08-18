"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
// Modal kept for future use if needed, but form is inline now
// import ConsultationModal from "@/components/ConsultationModal";
import ConsultationInlineForm from "@/components/ConsultationInlineForm";
import HubspotMeetingEmbed from "@/components/HubspotMeetingEmbed";
import OptionButtonGroup from "@/components/OptionButtonGroup";
import ToastHost, { type ToastItem } from "@/components/Toast";

type ClientDetails = {
  prepType: "individual" | "business" | "both";
  filingStatus: "single" | "marriedJoint" | "marriedSeparate" | "headOfHousehold";
  homeOwner: "yes" | "no" | null;
  k1Forms: "0" | "1" | "2" | "3" | "4+";
  states: "1" | "2" | "3" | "4" | "5+";
  businessType: "scorp" | "ccorp" | "multiMemberLLC" | "soleProprietor" | "other" | "";
  revenue: "under1m" | "1m-5m" | "5m-15m" | "15m-50m" | "over50m" | "";
  shareholders: "1" | "2-5" | "6-9" | "10-24" | "25+";
  primaryGoal: "compliance" | "savings" | "growth" | "comprehensive" | "";
  budgetRange: "under2k" | "2k-5k" | "5k-10k" | "10k-25k" | "over25k" | "";
  timeline: "immediate" | "month" | "quarter" | "exploring" | "";
  individualIncome: "under250k" | "250k-500k" | "500k-1m" | "1m-5m" | "over5m" | "";
};

const initialDetails: ClientDetails = {
  prepType: "individual",
  filingStatus: "single",
  homeOwner: null,
  k1Forms: "0",
  states: "1",
  businessType: "",
  revenue: "",
  shareholders: "1",
  primaryGoal: "",
  budgetRange: "",
  timeline: "",
  individualIncome: "",
};

const basePricing = {
  individual: {
    single: { base: 750, max: 1200 },
    marriedJoint: { base: 950, max: 1500 },
    marriedSeparate: { base: 850, max: 1350 },
    headOfHousehold: { base: 850, max: 1350 },
  },
  business: {
    scorp: { base: 1500, max: 2500 },
    ccorp: { base: 2000, max: 3500 },
    multiMemberLLC: { base: 1800, max: 2800 },
    soleProprietor: { base: 1200, max: 2000 },
    other: { base: 1400, max: 2200 },
  },
};

function calculateIcpScore(details: ClientDetails) {
  let score = 0;
  if (details.individualIncome) {
    const incomeScores: Record<string, number> = {
      under250k: 0,
      "250k-500k": 2,
      "500k-1m": 5,
      "1m-5m": 8,
      over5m: 10,
    };
    score += (incomeScores[details.individualIncome] || 0) * 5;
  }
  if (details.revenue) {
    const revenueScores: Record<string, number> = {
      under1m: 1,
      "1m-5m": 4,
      "5m-15m": 7,
      "15m-50m": 9,
      over50m: 10,
    };
    score += (revenueScores[details.revenue] || 0) * 3;
  }
  const k1Count = parseInt(details.k1Forms) || 0;
  const stateCount = parseInt(details.states) || 1;
  score += Math.min(k1Count * 3, 15);
  score += Math.min((stateCount - 1) * 4, 16);
  if (k1Count >= 3) score += 5;
  if (stateCount >= 3) score += 5;
  if (details.primaryGoal) {
    const goalScores: Record<string, number> = {
      compliance: 1,
      savings: 4,
      growth: 7,
      comprehensive: 10,
    };
    score += (goalScores[details.primaryGoal] || 0) * 2;
  }
  if (details.budgetRange) {
    const budgetScores: Record<string, number> = {
      under2k: 0,
      "2k-5k": 3,
      "5k-10k": 6,
      "10k-25k": 9,
      over25k: 10,
    };
    score += (budgetScores[details.budgetRange] || 0) * 2;
  }
  return Math.min(score, 100);
}

function determineLeadCategory(score: number, estimateMax: number) {
  if (score >= 75 && estimateMax >= 3000) return "premium";
  if (score >= 60 && estimateMax >= 2000) return "qualified";
  if (score >= 40 && estimateMax >= 1500) return "standard";
  return "referral";
}

function useEstimate(details: ClientDetails, priceDisplay: "year" | "month") {
  return useMemo(() => {
    let baseMin = 0;
    let baseMax = 0;
    if (details.prepType === "individual" || details.prepType === "both") {
      const pricing = basePricing.individual[details.filingStatus];
      baseMin += pricing.base;
      baseMax += pricing.max;
      if (details.individualIncome) {
        const multipliers: Record<string, number> = {
          under250k: 0.5,
          "250k-500k": 1,
          "500k-1m": 1.5,
          "1m-5m": 2.2,
          over5m: 3,
        };
        const m = multipliers[details.individualIncome] || 1;
        baseMin *= m;
        baseMax *= m;
      }
      if (details.homeOwner === "yes") {
        baseMin += 150;
        baseMax += 250;
      }
      const k1Count = parseInt(details.k1Forms) || 0;
      if (k1Count > 0) {
        baseMin += k1Count * 200;
        baseMax += k1Count * 350;
      }
      const stateCount = parseInt(details.states) || 1;
      if (stateCount > 1) {
        baseMin += (stateCount - 1) * 250;
        baseMax += (stateCount - 1) * 400;
      }
    }
    if ((details.prepType === "business" || details.prepType === "both") && details.businessType) {
      const pricing = basePricing.business[details.businessType] || basePricing.business.other;
      baseMin += pricing.base;
      baseMax += pricing.max;
      if (details.revenue) {
        const multipliers: Record<string, number> = {
          under1m: 1,
          "1m-5m": 1.3,
          "5m-15m": 1.8,
          "15m-50m": 2.3,
          over50m: 3,
        };
        const m = multipliers[details.revenue] || 1;
        baseMin *= m;
        baseMax *= m;
      }
      const shareholdersMap: Record<string, number> = {
        "1": 1,
        "2-5": 1.4,
        "6-9": 1.8,
        "10-24": 2.3,
        "25+": 3,
      };
      baseMin *= shareholdersMap[details.shareholders] || 1;
      baseMax *= shareholdersMap[details.shareholders] || 1;
    }

    const est = { min: Math.round(baseMin), max: Math.round(baseMax) };
    const icp = calculateIcpScore(details);
    const category = determineLeadCategory(icp, est.max);
    const display = priceDisplay === "year"
      ? { text: `${est.min.toLocaleString()} - ${est.max.toLocaleString()}`, desc: "Annual cost estimate" }
      : {
          text: `${Math.round(est.min / 12).toLocaleString()} - ${Math.round(est.max / 12).toLocaleString()}`,
          desc: "Monthly estimate (annual cost ÷ 12)",
        };
    return { est, icp, category, display };
  }, [details, priceDisplay]);
}

function leadCategoryInfo(category: string) {
  switch (category) {
    case "premium":
      return {
        title: "Ultra High Net Worth Client",
        description: "Perfect fit for our premier wealth management services",
        titleStyle: { color: "#16a34a" },
        containerStyle: {
          backgroundColor: "#ecfdf5",
          borderColor: "#a7f3d0",
        },
      } as const;
    case "qualified":
      return {
        title: "High Net Worth Prospect",
        description: "Excellent fit for our comprehensive tax services",
        titleStyle: { color: "#133B6C" },
        containerStyle: {
          backgroundColor: "rgba(19, 59, 108, 0.1)",
          borderColor: "rgba(19, 59, 108, 0.3)",
        },
      } as const;
    case "standard":
      return {
        title: "Potential HNW Client",
        description: "May be a fit for select services",
        titleStyle: { color: "#E2AD44" },
        containerStyle: {
          backgroundColor: "rgba(226, 173, 68, 0.1)",
          borderColor: "rgba(226, 173, 68, 0.3)",
        },
      } as const;
    default:
      return {
        title: "Better Fit Elsewhere",
        description: "We recommend partners who specialize in your needs",
        titleStyle: { color: "#4b5563" },
        containerStyle: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
      } as const;
  }
}

function ctaText(category: string) {
  switch (category) {
    case "premium":
      return "Schedule Private Consultation";
    case "qualified":
      return "Schedule Strategy Session";
    case "standard":
      return "Schedule Consultation";
    default:
      return "View Recommended Partners";
  }
}

function categoryMessage(category: string) {
  switch (category) {
    case "premium":
      return "VIP Service — Direct partner access within 4 hours.";
    case "qualified":
      return "High-value client — Priority scheduling and dedicated team assigned.";
    case "standard":
      return "We'll evaluate if our HNW services align with your needs.";
    default:
      return "Our partner firms may be a better value fit.";
  }
}

function categoryVisual(category: string) {
  switch (category) {
    case "premium":
      return {
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        ctaClass: "bg-green-600 hover:bg-green-700",
        message: "🌟 VIP Service - Direct partner access within 4 hours",
        messageColor: "text-green-600 font-medium",
      } as const;
    case "qualified":
      return {
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        ctaClass: "bg-blue-900 hover:bg-blue-800",
        message: "High-value client - Priority scheduling and dedicated team assigned.",
        messageColor: "text-blue-600",
      } as const;
    case "standard":
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        ctaClass: "bg-orange-500 hover:bg-orange-600",
        message: "We'll evaluate if our HNW services align with your needs.",
        messageColor: "text-gray-500",
      } as const;
    default:
      return {
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        ctaClass: "bg-gray-600 hover:bg-gray-700",
        message:
          "Our partner firms offer excellent service for your income level and may be a better value fit.",
        messageColor: "text-gray-600",
      } as const;
  }
}

export default function Page() {
  const [details, setDetails] = useState<ClientDetails>(initialDetails);
  const [priceDisplay, setPriceDisplay] = useState<"year" | "month">("year");
  // Step state for horizontal transition between Step 1 and Step 2
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const stepContainerRef = useRef<HTMLDivElement | null>(null);
  const step2FocusRef = useRef<HTMLDivElement | null>(null);
  const step3FocusRef = useRef<HTMLDivElement | null>(null);
  const { icp, category, display } = useEstimate(details, priceDisplay);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function notify(type: "success" | "error" | "info", message: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }

  // Build selections payload with human-readable labels
  const selectionsPayload = useMemo(() => {
    const label = {
      prepType: {
        individual: "Individual",
        business: "Business",
        both: "Both",
      },
      filingStatus: {
        single: "Single",
        marriedJoint: "Married - Joint",
        marriedSeparate: "Married - Separate",
        headOfHousehold: "Head of Household",
      },
      homeOwner: { yes: "Yes", no: "No" },
      individualIncome: {
        under250k: "< $250k",
        "250k-500k": "$250k - $500k",
        "500k-1m": "$500k - $1m",
        "1m-5m": "$1m - $5m",
        over5m: ">$5m+",
      },
      k1Forms: { "0": "0", "1": "1", "2": "2", "3": "3", "4+": "4+" },
      states: { "1": "1", "2": "2", "3": "3", "4": "4", "5+": "5+" },
      businessType: {
        scorp: "S Corporation",
        ccorp: "C Corporation",
        multiMemberLLC: "Multi-Member LLC",
        soleProprietor: "SMLLC/Sole Proprietor",
        other: "Other",
      },
      revenue: {
        under1m: "< $1M",
        "1m-5m": "$1M - $5M",
        "5m-15m": "$5M - $15M",
        "15m-50m": "$15M - $50M",
        over50m: "$50M+",
      },
      shareholders: {
        "1": "1",
        "2-5": "2-5",
        "6-9": "6-9",
        "10-24": "10-24",
        "25+": "25+",
      },
      primaryGoal: {
        compliance: "Basic Compliance",
        savings: "Tax Optimization",
        growth: "Business Growth",
        comprehensive: "Comprehensive Advisory",
      },
      budgetRange: {
        under2k: "Under $2K",
        "2k-5k": "$2K - $5K",
        "5k-10k": "$5K - $10K",
        "10k-25k": "$10K - $25K",
        over25k: "$25K+",
      },
      timeline: {
        immediate: "Immediately",
        month: "Within a month",
        quarter: "This quarter",
        exploring: "Just exploring",
      },
    } as const;

    const withLabel = <K extends keyof ClientDetails>(key: K) => {
      const value = details[key] as any;
      const map: any = (label as any)[key];
      const resolved = map && value ? map[value] : value ?? "";
      return { value, label: resolved };
    };

    return {
      prepType: withLabel("prepType"),
      filingStatus: withLabel("filingStatus"),
      homeOwner: withLabel("homeOwner"),
      individualIncome: withLabel("individualIncome"),
      k1Forms: withLabel("k1Forms"),
      states: withLabel("states"),
      businessType: withLabel("businessType"),
      revenue: withLabel("revenue"),
      shareholders: withLabel("shareholders"),
      primaryGoal: withLabel("primaryGoal"),
      budgetRange: withLabel("budgetRange"),
      timeline: withLabel("timeline"),
    };
  }, [details]);

  const btnLabel = ctaText(category);
  function handlePrimaryCta() {
    if (category === "referral") {
      window.open("https://www.btcpa.net/resources", "_blank");
      return;
    }
    // Move to Step 2 with a horizontal transition and scroll top of section into view
    setStep(2);
    if (stepContainerRef.current) stepContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function backToStep1() {
    setStep(1);
    if (stepContainerRef.current) stepContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // When Step 2 is active, move focus to the form container for accessibility
  useEffect(() => {
    if (step === 2 && step2FocusRef.current) step2FocusRef.current.focus();
    if (step === 3 && step3FocusRef.current) step3FocusRef.current.focus();
  }, [step]);

  const catVis = categoryVisual(category);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-end py-2 text-sm border-b border-blue-800">
            <div className="flex gap-6">
              <a href="#" className="text-blue-200 hover:text-white">Online Payments & Client Resources</a>
              <a href="#" className="text-blue-200 hover:text-white">Careers</a>
            </div>
          </div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Image
                src="/BThrasher_logo.svg"
                alt="Bennett Thrasher"
                width={220}
                height={48}
                
               
              />
            </div>
            <nav className="flex items-center gap-8">
              <a href="#" className="text-white hover:text-orange-400 font-medium">Services</a>
              <a href="#" className="text-white hover:text-orange-400 font-medium">Industries</a>
              <a href="#" className="text-white hover:text-orange-400 font-medium">People</a>
              <a href="#" className="text-white hover:text-orange-400 font-medium">Resources</a>
              <button className="border border-white rounded-full px-4 py-2 text-white hover:bg-white hover:text-blue-900 transition-colors">
                770.396.2200
              </button>
              <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tax Preparation Estimate</h1>
          <p className="text-gray-600 text-lg mb-6">45+ years of tax, audit & advisory solutions.</p>
          <div className="flex items-center gap-6">
            <div className="flex cursor-pointer items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step === 1 ? "bg-orange-400 text-white" : "bg-gray-300 text-gray-600"}`}>1</div>
              <span className={`${step === 1 ? "font-semibold text-orange-500" : "text-gray-500"}`}>Get Estimate</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step === 2 ? "bg-orange-400 text-white" : "bg-gray-300 text-gray-600"}`}>2</div>
              <span className={`${step === 2 ? "font-semibold text-orange-500" : "text-gray-500"}`}>Submit Details</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step === 3 ? "bg-orange-400 text-white" : "bg-gray-300 text-gray-600"}`}>3</div>
              <span className={`${step === 3 ? "font-semibold text-orange-500" : "text-gray-500"}`}>Book Consultation</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2" ref={stepContainerRef}>
            {/* Horizontal step slider */}
            <div className="relative overflow-hidden">
              <div
                className="flex transform-gpu"
                style={{
                  width: "300%",
                  transform:
                    step === 1
                      ? "translateX(-66.6667%)"
                      : step === 2
                      ? "translateX(-33.3333%)"
                      : "translateX(0%)",
                  transition: "transform 500ms ease-in-out",
                }}
              >
                {/* Step 3 panel (placed first for rightward progression) */}
                <section
                  id="book-consultation"
                  aria-hidden={step !== 3}
                  className={`pl-2 ${step === 3 ? "pointer-events-auto" : "pointer-events-none"}`}
                  style={{ width: "33.3333%" }}
                  ref={step3FocusRef as any}
                  tabIndex={-1}
                >
                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-900">Book Consultation</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-sm font-medium text-blue-900 hover:text-blue-700"
                      >
                        Back to Step 2
                      </button>
                    </div>
                    <p className="text-gray-600 mb-6">Pick a time that works best for you.</p>
                    <HubspotMeetingEmbed />
                  </div>
                </section>

                {/* Step 2 panel (middle) */}
                <section
                  id="submit-details"
                  aria-hidden={step !== 2}
                  className={`px-2 ${step === 2 ? "pointer-events-auto" : "pointer-events-none"}`}
                  style={{ width: "33.3333%" }}
                  ref={step2FocusRef as any}
                  tabIndex={-1}
                >
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={backToStep1}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 hover:text-blue-700"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back to Step 1
                    </button>
                  </div>
                  <ConsultationInlineForm
                    leadCategory={category}
                    icpScore={icp}
                    clientDetails={details}
                    selectionsPayload={selectionsPayload}
                    onNotify={notify}
                    onSuccess={() => {
                      setStep(3);
                      if (stepContainerRef.current) stepContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                </section>
                {/* Step 1 panel (rightmost, initially visible) */}
                <section
                  id="step1-panel"
                  aria-hidden={step !== 1}
                  className={`pr-2 ${step === 1 ? "pointer-events-auto" : "pointer-events-none"}`}
                  style={{ width: "33.3333%" }}
                >
                  <div id="step1-card" className="bg-white rounded-lg shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <h2 className="text-xl font-semibold text-gray-800">Tax Preparation Details</h2>
                    </div>
                    <p className="text-gray-600 mb-6">Help us understand your needs to provide the most accurate estimate and ensure we're the right fit for your situation.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">What's your primary goal for tax services?</label>
                  <OptionButtonGroup
                    idPrefix="goal"
                    columns={2}
                    options={[
                      { value: "compliance", label: "Basic Compliance", sublabel: "File returns accurately" },
                      { value: "savings", label: "Tax Optimization", sublabel: "Minimize tax liability" },
                      { value: "growth", label: "Business Growth", sublabel: "Strategic tax planning" },
                      { value: "comprehensive", label: "Comprehensive Advisory", sublabel: "Full-service partnership" },
                    ]}
                    value={details.primaryGoal}
                    onChange={(v) => setDetails((d) => ({ ...d, primaryGoal: v as any }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">What's your comfortable budget range for tax services?</label>
                  <OptionButtonGroup
                    idPrefix="budget"
                    columns={5}
                    options={[
                      { value: "under2k", label: "Under $2K" },
                      { value: "2k-5k", label: "$2K - $5K" },
                      { value: "5k-10k", label: "$5K - $10K" },
                      { value: "10k-25k", label: "$10K - $25K" },
                      { value: "over25k", label: "$25K+" },
                    ]}
                    value={details.budgetRange}
                    onChange={(v) => setDetails((d) => ({ ...d, budgetRange: v as any }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">When do you need to start?</label>
                  <OptionButtonGroup
                    idPrefix="timeline"
                    columns={4}
                    options={[
                      { value: "immediate", label: "Immediately" },
                      { value: "month", label: "Within a month" },
                      { value: "quarter", label: "This quarter" },
                      { value: "exploring", label: "Just exploring" },
                    ]}
                    value={details.timeline}
                    onChange={(v) => setDetails((d) => ({ ...d, timeline: v as any }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Prep Type</label>
                  <OptionButtonGroup
                    idPrefix="prep"
                    columns={3}
                    options={[
                      { value: "individual", label: "Individual" },
                      { value: "business", label: "Business" },
                      { value: "both", label: "Both" },
                    ]}
                    value={details.prepType}
                    onChange={(v) => setDetails((d) => ({ ...d, prepType: v as any }))}
                  />
                </div>

                {(details.prepType === "individual" || details.prepType === "both") && (
                  <div id="individual-section" className="border-l-4 pl-6 space-y-6" style={{ borderColor: "#08213E" }}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Filing Status</label>
                      <OptionButtonGroup
                        idPrefix="filing"
                        columns={4}
                        options={[
                          { value: "single", label: "Single" },
                          { value: "marriedJoint", label: "Married - Joint" },
                          { value: "marriedSeparate", label: "Married - Separate" },
                          { value: "headOfHousehold", label: "Head of Household" },
                        ]}
                        value={details.filingStatus}
                        onChange={(v) => setDetails((d) => ({ ...d, filingStatus: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Do you own a home?</label>
                      <OptionButtonGroup
                        idPrefix="home"
                        columns={2}
                        options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                        value={details.homeOwner || undefined}
                        onChange={(v) => setDetails((d) => ({ ...d, homeOwner: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Estimated personal income</label>
                      <OptionButtonGroup
                        idPrefix="income"
                        columns={5}
                        options={[
                          { value: "under250k", label: "< $250k" },
                          { value: "250k-500k", label: "$250k - $500k" },
                          { value: "500k-1m", label: "$500k - $1m" },
                          { value: "1m-5m", label: "$1m - $5m" },
                          { value: "over5m", label: ">$5m+" },
                        ]}
                        value={details.individualIncome}
                        onChange={(v) => setDetails((d) => ({ ...d, individualIncome: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">How many Forms K-1 this year?</label>
                      <OptionButtonGroup
                        idPrefix="k1"
                        columns={5}
                        options={["0", "1", "2", "3", "4+"].map((v) => ({ value: v, label: v }))}
                        value={details.k1Forms}
                        onChange={(v) => setDetails((d) => ({ ...d, k1Forms: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">How many states will you file in?</label>
                      <OptionButtonGroup
                        idPrefix="states"
                        columns={5}
                        options={["1", "2", "3", "4", "5+"].map((v) => ({ value: v, label: v }))}
                        value={details.states}
                        onChange={(v) => setDetails((d) => ({ ...d, states: v as any }))}
                      />
                    </div>
                  </div>
                )}

                {(details.prepType === "business" || details.prepType === "both") && (
                  <div id="business-section" className="border-l-4 pl-6 space-y-6" style={{ borderColor: "#08213E" }}>
                    <h3 className="text-lg font-semibold text-gray-800">Business Tax Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Entity tax structure</label>
                      <OptionButtonGroup
                        idPrefix="business"
                        columns={5}
                        options={[
                          { value: "scorp", label: "S Corporation" },
                          { value: "ccorp", label: "C Corporation" },
                          { value: "multiMemberLLC", label: "Multi-Member LLC" },
                          { value: "soleProprietor", label: "SMLLC/Sole Proprietor" },
                          { value: "other", label: "Other" },
                        ]}
                        value={details.businessType}
                        onChange={(v) => setDetails((d) => ({ ...d, businessType: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Gross revenue last year</label>
                      <OptionButtonGroup
                        idPrefix="revenue"
                        columns={5}
                        options={[
                          { value: "under1m", label: "< $1M" },
                          { value: "1m-5m", label: "$1M - $5M" },
                          { value: "5m-15m", label: "$5M - $15M" },
                          { value: "15m-50m", label: "$15M - $50M" },
                          { value: "over50m", label: "$50M+" },
                        ]}
                        value={details.revenue}
                        onChange={(v) => setDetails((d) => ({ ...d, revenue: v as any }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Shareholders/members/partners (including you)</label>
                      <OptionButtonGroup
                        idPrefix="shareholders"
                        columns={5}
                        options={["1", "2-5", "6-9", "10-24", "25+"].map((v) => ({ value: v, label: v }))}
                        value={details.shareholders}
                        onChange={(v) => setDetails((d) => ({ ...d, shareholders: v as any }))}
                      />
                    </div>
                  </div>
                )}
              </div>
                  {/* end of step1-card */}
                </div>
                {/* end of step1-panel */}
                </section>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            {step !== 3 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6 border-t-4 border-orange-400">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Your Estimate</h3>
                </div>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold mb-2" style={{ color: "#08213E" }}>
                    {display.text || "$0"}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <button
                      onClick={() => setPriceDisplay("year")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        priceDisplay === "year" ? "text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                      style={priceDisplay === "year" ? { backgroundColor: "#08213E" } : undefined}
                    >
                      per year
                    </button>
                    <button
                      onClick={() => setPriceDisplay("month")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        priceDisplay === "month" ? "text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                      style={priceDisplay === "month" ? { backgroundColor: "#08213E" } : undefined}
                    >
                      per month
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{display.desc}</p>
                </div>

                {icp > 0 && (
                  <div className={`mb-6 p-4 rounded-lg border-2 ${catVis.bgColor} ${catVis.borderColor}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className={`w-5 h-5 ${catVis.color}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <h4 className={`font-semibold ${catVis.color}`}>
                        {category === "premium" && "Ultra High Net Worth Client"}
                        {category === "qualified" && "High Net Worth Prospect"}
                        {category === "standard" && "Potential HNW Client"}
                        {category === "referral" && "Better Fit Elsewhere"}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {category === "premium" && "Perfect fit for our premier wealth management services"}
                      {category === "qualified" && "Excellent fit for our comprehensive tax services"}
                      {category === "standard" && "May be a fit for select services"}
                      {category === "referral" && "We recommend partners who specialize in your needs"}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-blue-900 transition-all duration-500" style={{ width: `${icp}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{icp}/100</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax Preparation</span>
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Includes:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Federal & State Returns</li>
                      <li>• Document Review</li>
                      <li>• Tax Consultation</li>
                      <li>• E-filing Services</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handlePrimaryCta}
                  className={`w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${catVis.ctaClass}`}
                >
                  {btnLabel}
                </button>
                <div className="mt-4 text-center">
                  <p className={`text-xs ${catVis.messageColor}`}>{catVis.message}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-2">Contact Bennett Thrasher</div>
                  <div className="text-sm font-semibold" style={{ color: "#08213E" }}>(770) 396-2200</div>
                  <div className="text-xs text-gray-500">Atlanta • Alpharetta • Gainesville</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6 border-t-4 border-orange-400">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Consultation Details</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="text-xs text-gray-500 mb-2">Summary</div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {Object.entries(selectionsPayload)
                      .filter(([_, v]: any) => v && (v as any).label)
                      .slice(0, 8)
                      .map(([k, v]: any) => (
                        <li key={k} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600 capitalize">{k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
                          <span className="ml-auto font-medium text-gray-900">{(v as any).label}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 2h10v6H5V7z" />
                    </svg>
                    30-minute consultation via Zoom or phone
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 2l7.997 3.884v6.232L10 16l-7.997-3.884V5.884z" />
                    </svg>
                    Calendar invite and reminders included
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7V5h2v6H9zm0 4v-2h2v2H9z" />
                    </svg>
                    You can reschedule anytime from the confirmation email
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-2">Need help now?</div>
                  <div className="text-sm font-semibold" style={{ color: "#08213E" }}>(770) 396-2200</div>
                  <div className="text-xs text-gray-500">Atlanta • Alpharetta • Gainesville</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal removed in favor of inline form */}
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
