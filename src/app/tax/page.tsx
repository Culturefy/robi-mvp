"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const TaxPrepCalculator = () => {
  const [clientDetails, setClientDetails] = useState({
    prepType: 'individual',
    filingStatus: 'single',
    homeOwner: null,
    k1Forms: '0',
    states: '1',
    businessType: '',
    revenue: '',
    shareholders: '1',
    primaryGoal: '',
    budgetRange: '',
    timeline: '',
    individualIncome: ''
  });

  const [estimate, setEstimate] = useState({ min: 0, max: 0 });
  const [priceDisplay, setPriceDisplay] = useState('year');
  const [icpScore, setIcpScore] = useState(0);
  const [leadCategory, setLeadCategory] = useState('standard');

  const basePricing: Record<string, Record<string, { base: number; max: number }>> = {
    individual: {
      single: { base: 750, max: 1200 },
      marriedJoint: { base: 950, max: 1500 },
      marriedSeparate: { base: 850, max: 1350 },
      headOfHousehold: { base: 850, max: 1350 }
    },
    business: {
      scorp: { base: 1500, max: 2500 },
      ccorp: { base: 2000, max: 3500 },
      multiMemberLLC: { base: 1800, max: 2800 },
      soleProprietor: { base: 1200, max: 2000 },
      other: { base: 1400, max: 2200 }
    }
  };

  const calculateIcpScore = () => {
    let score = 0;

    if (clientDetails.individualIncome) {
      const incomeScores: Record<string, number> = {
        'under250k': 0,
        '250k-500k': 2,
        '500k-1m': 5,
        '1m-5m': 8,
        'over5m': 10
      };
      score += (incomeScores[clientDetails.individualIncome] || 0) * 5;
    }

    if (clientDetails.revenue) {
      const revenueScores: Record<string, number> = {
        'under1m': 1,
        '1m-5m': 4,
        '5m-15m': 7,
        '15m-50m': 9,
        'over50m': 10
      };
      score += (revenueScores[clientDetails.revenue] || 0) * 3;
    }

    const k1Count = parseInt(clientDetails.k1Forms) || 0;
    const stateCount = parseInt(clientDetails.states) || 1;
    
    score += Math.min(k1Count * 3, 15);
    score += Math.min((stateCount - 1) * 4, 16);
    
    if (k1Count >= 3) score += 5;
    if (stateCount >= 3) score += 5;

    if (clientDetails.primaryGoal) {
      const goalScores: Record<string, number> = {
        'compliance': 1,
        'savings': 4,
        'growth': 7,
        'comprehensive': 10
      };
      score += (goalScores[clientDetails.primaryGoal] || 0) * 2;
    }

    if (clientDetails.budgetRange) {
      const budgetScores: Record<string, number> = {
        'under2k': 0,
        '2k-5k': 3,
        '5k-10k': 6,
        '10k-25k': 9,
        'over25k': 10
      };
      score += (budgetScores[clientDetails.budgetRange] || 0) * 2;
    }

    return Math.min(score, 100);
  };

  const determineLeadCategory = (score: number, estimateMax: number) => {
    if (score >= 75 && estimateMax >= 3000) return 'premium';
    if (score >= 60 && estimateMax >= 2000) return 'qualified';
    if (score >= 40 && estimateMax >= 1500) return 'standard';
    return 'referral';
  };

  const calculateEstimate = () => {
    let baseMin = 0;
    let baseMax = 0;

    if (clientDetails.prepType === 'individual' || clientDetails.prepType === 'both') {
      const pricing = basePricing.individual[clientDetails.filingStatus];
      baseMin += pricing.base;
      baseMax += pricing.max;

      if (clientDetails.individualIncome) {
        const incomeMultipliers: Record<string, number> = {
          'under250k': 0.5,
          '250k-500k': 1,
          '500k-1m': 1.5,
          '1m-5m': 2.2,
          'over5m': 3
        };
        const multiplier = incomeMultipliers[clientDetails.individualIncome] || 1;
        baseMin *= multiplier;
        baseMax *= multiplier;
      }

      if (clientDetails.homeOwner === 'yes') {
        baseMin += 150;
        baseMax += 250;
      }

      const k1Count = parseInt(clientDetails.k1Forms) || 0;
      if (k1Count > 0) {
        baseMin += k1Count * 200;
        baseMax += k1Count * 350;
      }

      const stateCount = parseInt(clientDetails.states) || 1;
      if (stateCount > 1) {
        baseMin += (stateCount - 1) * 250;
        baseMax += (stateCount - 1) * 400;
      }
    }

    if ((clientDetails.prepType === 'business' || clientDetails.prepType === 'both') && clientDetails.businessType) {
      const pricing = basePricing.business[clientDetails.businessType] || basePricing.business.other;
      baseMin += pricing.base;
      baseMax += pricing.max;

      if (clientDetails.revenue) {
        const revenueMultipliers: Record<string, number> = {
          'under1m': 1,
          '1m-5m': 1.3,
          '5m-15m': 1.8,
          '15m-50m': 2.3,
          'over50m': 3
        };
        const multiplier = revenueMultipliers[clientDetails.revenue] || 1;
        baseMin *= multiplier;
        baseMax *= multiplier;
      }

      const shareholderCount = parseInt(clientDetails.shareholders) || 1;
      if (shareholderCount > 1) {
        const complexityMultiplier = 1 + (Math.min(shareholderCount - 1, 10) * 0.1);
        baseMin *= complexityMultiplier;
        baseMax *= complexityMultiplier;
      }
    }

    const finalEstimate = { min: Math.round(baseMin), max: Math.round(baseMax) };
    setEstimate(finalEstimate);

    const score = calculateIcpScore();
    setIcpScore(score);
    setLeadCategory(determineLeadCategory(score, finalEstimate.max));
  };

  useEffect(() => {
    calculateEstimate();
  }, [clientDetails]);

  const getLeadCategoryInfo = () => {
    switch(leadCategory) {
      case 'premium':
        return {
          title: 'Ultra High Net Worth Client',
          description: 'Perfect fit for our premier wealth management services',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          ctaText: 'Schedule Private Consultation',
          ctaStyle: 'bg-green-600 hover:bg-green-700',
          message: '🌟 VIP Service - Direct partner access within 4 hours',
          messageColor: 'text-green-600 font-medium'
        };
      case 'qualified':
        return {
          title: 'High Net Worth Prospect',
          description: 'Excellent fit for our comprehensive tax services',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          ctaText: 'Schedule Strategy Session',
          ctaStyle: 'bg-blue-900 hover:bg-blue-800',
          message: 'High-value client - Priority scheduling and dedicated team assigned.',
          messageColor: 'text-blue-600'
        };
      case 'standard':
        return {
          title: 'Potential HNW Client',
          description: 'May be a fit for select services',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          ctaText: 'Schedule Consultation',
          ctaStyle: 'bg-orange-500 hover:bg-orange-600',
          message: 'We\'ll evaluate if our HNW services align with your needs.',
          messageColor: 'text-gray-500'
        };
      default:
        return {
          title: 'Better Fit Elsewhere',
          description: 'We recommend partners who specialize in your needs',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          ctaText: 'View Recommended Partners',
          ctaStyle: 'bg-gray-600 hover:bg-gray-700',
          message: 'Our partner firms offer excellent service for your income level and may be a better value fit.',
          messageColor: 'text-gray-600'
        };
    }
  };

  const categoryInfo = getLeadCategoryInfo();

  const updateClientDetails = (field: string, value: string | number) => {
    setClientDetails(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Website Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex justify-end py-2 text-sm border-b border-blue-800">
            <div className="flex gap-6">
              <a href="#" className="text-blue-200 hover:text-white">Online Payments & Client Resources</a>
              <a href="#" className="text-blue-200 hover:text-white">Careers</a>
            </div>
          </div>
          
          {/* Main navigation */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Image
                src="/BThrasher_logo.svg"
                alt="Bennett Thrasher"
                width={220}
                height={48}
                priority
                className="h-8 md:h-10 w-auto"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tax Preparation Estimate</h1>
          <p className="text-gray-600 text-lg mb-6">45+ years of tax, audit & advisory solutions.</p>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-400 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</div>
              <span className="font-semibold text-orange-500">Get Estimate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold text-sm">2</div>
              <span className="text-gray-500">Submit Details</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold text-sm">3</div>
              <span className="text-gray-500">Book Consultation</span>
            </div>
          </div>
        </div>

        {/* Main Calculator Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">Tax Preparation Details</h2>
              </div>
              <p className="text-gray-600 mb-8">Help us understand your needs to provide the most accurate estimate and ensure we're the right fit for your situation.</p>

              <div className="space-y-8">
                {/* Primary Goals */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-4">What's your primary goal for tax services?</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'compliance', label: 'Basic Compliance', desc: 'File returns accurately' },
                      { value: 'savings', label: 'Tax Optimization', desc: 'Minimize tax liability' },
                      { value: 'growth', label: 'Business Growth', desc: 'Strategic tax planning' },
                      { value: 'comprehensive', label: 'Comprehensive Advisory', desc: 'Full-service partnership' }
                    ].map((goal) => (
                      <button
                        key={goal.value}
                        onClick={() => updateClientDetails('primaryGoal', goal.value)}
                        className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${
                          clientDetails.primaryGoal === goal.value
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="font-semibold text-sm">{goal.label}</div>
                        <div className="text-xs opacity-75 mt-1">{goal.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-4">What's your comfortable budget range for tax services?</label>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { value: 'under2k', label: 'Under $2K' },
                      { value: '2k-5k', label: '$2K - $5K' },
                      { value: '5k-10k', label: '$5K - $10K' },
                      { value: '10k-25k', label: '$10K - $25K' },
                      { value: 'over25k', label: '$25K+' }
                    ].map((budget) => (
                      <button
                        key={budget.value}
                        onClick={() => updateClientDetails('budgetRange', budget.value)}
                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          clientDetails.budgetRange === budget.value
                            ? 'bg-blue-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {budget.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-4">When do you need to start?</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { value: 'immediate', label: 'Immediately' },
                      { value: 'month', label: 'Within a month' },
                      { value: 'quarter', label: 'This quarter' },
                      { value: 'exploring', label: 'Just exploring' }
                    ].map((time) => (
                      <button
                        key={time.value}
                        onClick={() => updateClientDetails('timeline', time.value)}
                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          clientDetails.timeline === time.value
                            ? 'bg-blue-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prep Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-4">What Type of Tax Preparation Are You Looking For?</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'individual', label: 'Individual', icon: '👤' },
                      { value: 'business', label: 'Business', icon: '🏢' },
                      { value: 'both', label: 'Both', icon: '📊' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateClientDetails('prepType', type.value)}
                        className={`px-4 py-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-3 ${
                          clientDetails.prepType === type.value
                            ? 'bg-blue-900 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        <span className="text-lg">{type.icon}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Section */}
                {(clientDetails.prepType === 'individual' || clientDetails.prepType === 'both') && (
                  <div className="border-l-4 border-orange-400 pl-6 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Individual Tax Details</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">What's your approximate annual income?</label>
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { value: 'under250k', label: 'Under $250K' },
                          { value: '250k-500k', label: '$250K - $500K' },
                          { value: '500k-1m', label: '$500K - $1M' },
                          { value: '1m-5m', label: '$1M - $5M' },
                          { value: 'over5m', label: '$5M+' }
                        ].map((income) => (
                          <button
                            key={income.value}
                            onClick={() => updateClientDetails('individualIncome', income.value)}
                            className={`px-3 py-3 rounded-lg text-xs font-medium transition-colors ${
                              clientDetails.individualIncome === income.value
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {income.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">What is your filing status?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'single', label: 'Single' },
                          { value: 'marriedJoint', label: 'Married Filing Jointly' },
                          { value: 'marriedSeparate', label: 'Married Filing Separately' },
                          { value: 'headOfHousehold', label: 'Head of Household' }
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => updateClientDetails('filingStatus', status.value)}
                            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                              clientDetails.filingStatus === status.value
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">Do you own your home?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['yes', 'no'].map((option) => (
                          <button
                            key={option}
                            onClick={() => updateClientDetails('homeOwner', option)}
                            className={`px-4 py-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                              clientDetails.homeOwner === option
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">How many Forms K-1 do you expect to receive this year?</label>
                      <div className="grid grid-cols-5 gap-3">
                        {['0', '1', '2', '3', '4+'].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateClientDetails('k1Forms', count)}
                            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                              clientDetails.k1Forms === count
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">How many states do you anticipate filing in?</label>
                      <div className="grid grid-cols-5 gap-3">
                        {['1', '2', '3', '4', '5+'].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateClientDetails('states', count)}
                            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                              clientDetails.states === count
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Section */}
                {(clientDetails.prepType === 'business' || clientDetails.prepType === 'both') && (
                  <div className="border-l-4 border-blue-900 pl-6 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Business Tax Details</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">What is the tax structure of your entity?</label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { value: 'scorp', label: 'S Corporation' },
                          { value: 'ccorp', label: 'C Corporation' },
                          { value: 'multiMemberLLC', label: 'Multi-Member LLC' },
                          { value: 'soleProprietor', label: 'SMLLC/Sole Proprietor' },
                          { value: 'other', label: 'Other' }
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => updateClientDetails('businessType', type.value)}
                            className={`px-3 py-3 rounded-lg text-xs font-medium transition-colors text-center ${
                              clientDetails.businessType === type.value
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">What was your gross revenue last year?</label>
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { value: 'under1m', label: '<$1M' },
                          { value: '1m-5m', label: '$1M - $5M' },
                          { value: '5m-15m', label: '$5M - $15M' },
                          { value: '15m-50m', label: '$15M - $50M' },
                          { value: 'over50m', label: '$50M+' }
                        ].map((range) => (
                          <button
                            key={range.value}
                            onClick={() => updateClientDetails('revenue', range.value)}
                            className={`px-3 py-3 rounded-lg text-xs font-medium transition-colors ${
                              clientDetails.revenue === range.value
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">How many shareholders/members/partners are there (including you)?</label>
                      <div className="grid grid-cols-5 gap-3">
                        {['1', '2-5', '6-9', '10-24', '25+'].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateClientDetails('shareholders', count)}
                            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                              clientDetails.shareholders === count
                                ? 'bg-blue-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6 border-t-4 border-orange-400">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Your Estimate</h3>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-900 mb-2">
                  {estimate.min === 0 ? '$0' : 
                    priceDisplay === 'year' 
                      ? `${estimate.min.toLocaleString()} - ${estimate.max.toLocaleString()}`
                      : `${Math.round(estimate.min / 12).toLocaleString()} - ${Math.round(estimate.max / 12).toLocaleString()}`
                  }
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <button
                    onClick={() => setPriceDisplay('year')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      priceDisplay === 'year' 
                        ? 'bg-blue-900 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    per year
                  </button>
                  <button
                    onClick={() => setPriceDisplay('month')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      priceDisplay === 'month' 
                        ? 'bg-blue-900 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    per month
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {estimate.min === 0 ? 'Select options to see estimate' : 
                    priceDisplay === 'month' ? 'Monthly estimate (annual cost ÷ 12)' : 'Annual cost estimate'
                  }
                </p>
              </div>

              {/* ICP Score Display */}
              {icpScore > 0 && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${categoryInfo.bgColor} ${categoryInfo.borderColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className={`w-5 h-5 ${categoryInfo.color}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <h4 className={`font-semibold ${categoryInfo.color}`}>{categoryInfo.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{categoryInfo.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-blue-900 transition-all duration-500"
                        style={{ width: `${icpScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{icpScore}/100</span>
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

              {/* Dynamic CTA based on lead category */}
              <button className={`w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${categoryInfo.ctaStyle}`}>
                {categoryInfo.ctaText}
              </button>

              {/* Category-specific messaging */}
              <div className="mt-4 text-center">
                <p className={`text-xs ${categoryInfo.messageColor}`}>
                  {categoryInfo.message}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-500 mb-2">Contact Bennett Thrasher</div>
                <div className="text-sm font-semibold text-blue-900">(770) 396-2200</div>
                <div className="text-xs text-gray-500">Atlanta • Alpharetta • Gainesville</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxPrepCalculator;
