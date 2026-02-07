import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Settings, 
  Info, 
  ChevronRight,
  Maximize2
} from 'lucide-react';

/**
 * NEW TAX REGIME SLABS (FY 2025-26 / AY 2026-27)
 * Standard Deduction: 75,000
 * 0 - 4L: Nil
 * 4 - 8L: 5%
 * 8 - 12L: 10%
 * 12 - 16L: 15%
 * 16 - 20L: 20%
 * 20 - 24L: 25%
 * Above 24L: 30%
 * Note: Rebate effectively makes income up to 12.75L CTC (12L + 75k SD) tax-free.
 */
const calculateIndividualTax = (grossSalary) => {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, grossSalary - standardDeduction);

  // In the latest regime, if taxable income <= 12L, tax is zero due to rebate
  if (taxableIncome <= 1200000) return 0;

  let tax = 0;
  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: 1200000, rate: 0.10 },
    { limit: 1600000, rate: 0.15 },
    { limit: 2000000, rate: 0.20 },
    { limit: 2400000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 }
  ];

  let prevLimit = 0;
  for (const slab of slabs) {
    if (taxableIncome > prevLimit) {
      const taxableInSlab = Math.min(taxableIncome - prevLimit, slab.limit - prevLimit);
      tax += taxableInSlab * slab.rate;
      prevLimit = slab.limit;
    } else {
      break;
    }
  }

  // Health & Education Cess @ 4%
  return tax * 1.04;
};

const COMPANY_TAX_RATE = 0.25168; // 25.168% inclusive of surcharge/cess

const App = () => {
  // Inputs
  const [revenue, setRevenue] = useState(5000000); // 50 Lakhs default
  const [fixedExpenses, setFixedExpenses] = useState(1000000); // 10 Lakhs default
  const [flexibleExpenses, setFlexibleExpenses] = useState(500000); // 5 Lakhs (Creative)
  const [numFamilyMembers, setNumFamilyMembers] = useState(2);
  const [salaryPerMember, setSalaryPerMember] = useState(1200000); // 12 Lakhs default

  // Core Calculator Logic
  const calculateScenario = (rev, fixedExp, flexExp, nMembers, salPerMember) => {
    const totalSalaryOutflow = nMembers * salPerMember;
    const totalExpenses = fixedExp + flexExp + totalSalaryOutflow;
    const pbt = Math.max(0, rev - totalExpenses);
    const companyTax = pbt * COMPANY_TAX_RATE;
    const pat = pbt - companyTax;

    const indTax = calculateIndividualTax(salPerMember);
    const indNetSalary = salPerMember - indTax;
    const totalFamilyNetSalary = nMembers * indNetSalary;

    const totalRetained = pat + totalFamilyNetSalary;

    return {
      pbt,
      companyTax,
      pat,
      indTax,
      totalFamilyNetSalary,
      totalRetained,
      efficiency: (totalRetained / rev) * 100
    };
  };

  const currentResults = useMemo(() => 
    calculateScenario(revenue, fixedExpenses, flexibleExpenses, numFamilyMembers, salaryPerMember),
    [revenue, fixedExpenses, flexibleExpenses, numFamilyMembers, salaryPerMember]
  );

  // Grid Search for Heatmap
  const salarySteps = [0, 600000, 900000, 1200000, 1500000, 1800000, 2400000, 3000000];
  const membersRange = [1, 2, 3, 4, 5, 6];

  const heatmapData = useMemo(() => {
    return membersRange.map(m => {
      const row = { members: m };
      salarySteps.forEach(s => {
        const res = calculateScenario(revenue, fixedExpenses, flexibleExpenses, m, s);
        row[`sal_${s}`] = res.totalRetained;
      });
      return row;
    });
  }, [revenue, fixedExpenses, flexibleExpenses]);

  // Scaling logic for colors
  const allValues = heatmapData.flatMap(row => salarySteps.map(s => row[`sal_${s}`]));
  const maxRetained = Math.max(...allValues);
  const minRetained = Math.min(...allValues);

  const getHeatmapColor = (val) => {
    const ratio = (val - minRetained) / (maxRetained - minRetained);
    if (ratio < 0.5) {
      const g = Math.floor(255 * (ratio * 2));
      return `rgba(239, 68, 68, ${0.1 + (1 - ratio) * 0.4})`; // Reddish
    } else {
      const r = Math.floor(255 * (1 - (ratio - 0.5) * 2));
      return `rgba(34, 197, 94, ${0.1 + ratio * 0.5})`; // Greenish
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navigation / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Tax Strategy Optimizer</h1>
            <p className="text-slate-500">Pvt Ltd vs Personal Income Simulator (New Regime 2025)</p>
          </div>
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-3xl shadow-xl flex items-center gap-4 transition-transform hover:scale-105">
            <div className="p-2 bg-white/20 rounded-full">
              <Maximize2 size={24} />
            </div>
            <div>
              <div className="text-xs opacity-90 uppercase font-bold tracking-wider">Total Family Retention</div>
              <div className="text-2xl font-black">{formatCurrency(currentResults.totalRetained)}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Settings Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-8 text-indigo-600">
                <Settings size={20} />
                <h2 className="font-bold text-lg uppercase tracking-tight">Simulator Config</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">Annual Revenue</label>
                    <span className="text-indigo-600 font-bold">{formatCurrency(revenue)}</span>
                  </div>
                  <input 
                    type="range" min="1000000" max="50000000" step="500000"
                    value={revenue} onChange={(e) => setRevenue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Fixed Exp</label>
                    <input 
                      type="number" value={fixedExpenses} onChange={(e) => setFixedExpenses(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Flexible Exp</label>
                    <input 
                      type="number" value={flexibleExpenses} onChange={(e) => setFlexibleExpenses(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users size={12}/> Family Size</label>
                    <select 
                      value={numFamilyMembers} onChange={(e) => setNumFamilyMembers(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none"
                    >
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Members</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Sal / Member</label>
                    <input 
                      type="number" value={salaryPerMember} onChange={(e) => setSalaryPerMember(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                 <div className="text-xs font-bold text-indigo-300 uppercase">Efficiency Score</div>
                 <div className="text-5xl font-black">{currentResults.efficiency.toFixed(1)}%</div>
                 <p className="text-xs text-indigo-200 leading-relaxed">
                   This percentage represents how much of your gross revenue stays in your control after all taxes.
                 </p>
                 <div className="flex gap-2 pt-2">
                    <div className="flex-1 bg-white/10 p-3 rounded-2xl">
                      <div className="text-[10px] opacity-60">Corp Tax</div>
                      <div className="font-bold text-sm">{formatCurrency(currentResults.companyTax)}</div>
                    </div>
                    <div className="flex-1 bg-white/10 p-3 rounded-2xl">
                      <div className="text-[10px] opacity-60">Indiv. Tax</div>
                      <div className="font-bold text-sm">{formatCurrency(currentResults.indTax * numFamilyMembers)}</div>
                    </div>
                 </div>
               </div>
               <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
            </div>
          </aside>

          {/* Visualization Area */}
          <main className="lg:col-span-8 space-y-8">
            
            {/* Charts Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">Revenue Leakage</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Expenses', value: fixedExpenses + flexibleExpenses },
                          { name: 'Tax Leakage', value: currentResults.companyTax + (currentResults.indTax * numFamilyMembers) },
                          { name: 'Family Wealth', value: currentResults.totalRetained },
                        ]}
                        innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value"
                      >
                        {[0,1,2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#e2e8f0', '#f43f5e', '#10b981'][index]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">Income Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Family Salaries', val: currentResults.totalFamilyNetSalary },
                        { name: 'Company PAT', val: currentResults.pat }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis hide />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="val" radius={[12, 12, 0, 0]}>
                        <Cell fill="#6366f1" />
                        <Cell fill="#a855f7" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Heatmap Section */}
            <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-xl text-slate-800">Optimization Heatmap</h3>
                  <p className="text-sm text-slate-400">Total Family Retained Earnings in Lakhs (L)</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 bg-slate-50 text-slate-400 font-bold text-[10px] border-b border-slate-100">Members</th>
                      {salarySteps.map(s => (
                        <th key={s} className="p-4 bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-100">
                          {s === 0 ? '0' : (s/100000) + 'L'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-4 font-black text-slate-500 bg-slate-50/50 border-r border-slate-100 text-center text-sm">
                          {row.members}
                        </td>
                        {salarySteps.map(s => {
                          const val = row[`sal_${s}`];
                          const isCurrent = row.members === numFamilyMembers && s === salaryPerMember;
                          return (
                            <td 
                              key={s} 
                              className="p-4 text-center transition-all cursor-default relative group border border-slate-50"
                              style={{ backgroundColor: getHeatmapColor(val) }}
                            >
                              <span className="font-bold text-slate-800 text-xs">
                                {(val/100000).toFixed(1)}L
                              </span>
                              {isCurrent && (
                                <div className="absolute inset-0 border-4 border-indigo-600 z-10 pointer-events-none"></div>
                              )}
                              
                              <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-slate-900 text-white p-3 rounded-xl text-[10px] z-20 shadow-2xl">
                                <div className="font-bold border-b border-white/20 pb-1 mb-1">Scenario Details</div>
                                <div>Members: {row.members}</div>
                                <div>Sal: {formatCurrency(s)}</div>
                                <div className="text-emerald-400 mt-1">Net Retained: {formatCurrency(val)}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-4 rounded-2xl">
                <Info size={16} className="text-indigo-500" />
                <span>The grid highlights the total family wealth (Company Profits + Individual Net Salaries) for different configurations.</span>
              </div>
            </section>

            {/* Final Strategy Card */}
            <section className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                 <div className="space-y-3">
                   <h3 className="text-2xl font-black flex items-center gap-3">
                     <TrendingUp size={28} /> Strategy Insights
                   </h3>
                   <div className="max-w-md space-y-2">
                     <p className="text-indigo-100 text-sm leading-relaxed">
                       Your current setup retains <strong>{formatCurrency(currentResults.totalRetained)}</strong> annually.
                     </p>
                     <p className="text-indigo-200 text-xs italic">
                       {salaryPerMember > 1275000 
                         ? "Tip: You've exceeded the 0% tax bracket per member. Adding more family members at lower salaries might increase overall retention."
                         : "Insight: You are currently utilizing the tax-free individual threshold effectively."}
                     </p>
                   </div>
                 </div>
                 <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20">
                    <div className="text-[10px] uppercase font-bold text-indigo-200 mb-2">Optimal Threshold</div>
                    <div className="text-3xl font-black">₹12.75L</div>
                    <div className="text-[10px] opacity-70">Max CTC for 0% Tax / Member</div>
                 </div>
               </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
