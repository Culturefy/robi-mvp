"use client";

import React, { useMemo, useState } from "react";
import ConsultationModal from "@/components/ConsultationModal";
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

export default function Page() {
  const [details, setDetails] = useState<ClientDetails>(initialDetails);
  const [priceDisplay, setPriceDisplay] = useState<"year" | "month">("year");
  const [modalOpen, setModalOpen] = useState(false);
  const { est, icp, category, display } = useEstimate(details, priceDisplay);
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <div className="gradient-bg text-white p-8 mb-6" style={{ background: "linear-gradient(to right, #08213E, #133B6C, #08213E)" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex items-center">
                  <div className="text-4xl font-bold text-white">BT</div>
                  <div className="ml-1">
                    <svg width="20" height="60" viewBox="0 0 20 60" style={{ color: "#E2AD44" }}>
                      <path d="M 2 5 Q 15 30 2 55" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-2">
                  <div className="text-2xl font-bold tracking-wide">BENNETT</div>
                  <div className="text-2xl font-bold tracking-wide">THRASHER<span className="text-sm font-normal ml-1">LLP</span></div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm" style={{ color: "#E2AD44" }}>Get Started Today</div>
              <div className="text-white font-semibold text-lg">(770) 396-2200</div>
            </div>
          </div>
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Tax Preparation</h1>
            <h2 className="text-4xl font-bold mb-4">Estimate</h2>
            <p className="text-lg" style={{ color: "#E2AD44" }}>45+ years of tax, audit & advisory solutions.</p>
          </div>
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E2AD44" }}>
                <span className="text-white font-semibold text-xs">1</span>
              </div>
              <span className="font-medium" style={{ color: "#E2AD44" }}>Get Estimate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#133B6C" }}>
                <span className="font-semibold text-xs" style={{ color: "#E2AD44" }}>2</span>
              </div>
              <span style={{ color: "#E2AD44" }}>Submit Details</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#133B6C" }}>
                <span className="font-semibold text-xs" style={{ color: "#E2AD44" }}>3</span>
              </div>
              <span style={{ color: "#E2AD44" }}>Book Consultation</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6 border-t-4" style={{ borderColor: "#E2AD44" }}>
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

              {/* ICP Score Display (restored original styling) */}
              {icp > 0 && (() => {
                const info = leadCategoryInfo(category);
                return (
                  <div className="mb-6 p-4 rounded-lg border-2" style={info.containerStyle as any}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={info.titleStyle as any}>
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <h4 className="font-semibold" style={info.titleStyle as any}>{info.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${icp}%`, background: "linear-gradient(to right, #E2AD44, #08213E)" }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{icp}/100</span>
                    </div>
                  </div>
                );
              })()}

              {/* Category messaging */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                style={{ backgroundColor: "#E2AD44" }}
              >
                Schedule Consultation
              </button>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  {category === "premium" && "Ideal HNW fit. Priority engagement recommended."}
                  {category === "qualified" && "Strong HNW fit. Great candidate for advisory."}
                  {category === "standard" && "We'll evaluate if our HNW services align with your needs."}
                  {category === "referral" && "We can connect you with a better-fit partner."}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-500 mb-2">Contact Bennett Thrasher</div>
                <div className="text-sm font-semibold" style={{ color: "#08213E" }}>(770) 396-2200</div>
                <div className="text-xs text-gray-500">Atlanta • Alpharetta • Gainesville</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConsultationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        icpScore={icp}
        leadCategory={category}
        clientDetails={details}
        selectionsPayload={selectionsPayload}
        onNotify={notify}
      />
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
