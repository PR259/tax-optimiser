import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  Calculator, 
  Users, 
  TrendingUp, 
  Settings, 
  Info, 
  ChevronRight,
  Maximize2,
  DollarSign
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
 * Note: Rebate u/s 87A effectively makes income up to 12L tax-free in new regime (revised).
 */
const calculateIndividualTax = (grossSalary) => {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, grossSalary - standardDeduction);

  // Effective rebate: In the latest proposed budget logic, if income <= 12L (after SD), tax is Nil.
  // However, we calculate based on slabs for the simulator to be precise for higher brackets.
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
  const [revenue, setRevenue] = useState(5000000); // 50 Lakhs
  const [fixedExpenses, setFixedExpenses] = useState(1000000); // 10 Lakhs
  const [flexibleExpenses, setFlexibleExpenses] = useState(500000); // 5 Lakhs (Creative)
  const [numFamilyMembers, setNumFamilyMembers] = useState(2);
  const [salaryPerMember, setSalaryPerMember] = useState(1200000); // 12 Lakhs

  // Derived Calculation for Current Scenario
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
      expenseRatio: (totalExpenses / rev) * 100
    };
  };

  const currentResults = useMemo(() => 
    calculateScenario(revenue, fixedExpenses, flexibleExpenses, numFamilyMembers, salaryPerMember),
    [revenue, fixedExpenses, flexibleExpenses, numFamilyMembers, salaryPerMember]
  );

  // Grid Search Analysis
  // Variation 1: Salary Heatmap (Members vs Salary)
  const heatmapData = useMemo(() => {
    const membersRange = [1, 2, 3, 4, 5, 6];
    const salarySteps = [0, 600000, 900000, 1200000, 1500000, 1800000, 2400000, 3000000];
    
    return membersRange.map(m => {
      const row = { members: m };
      salarySteps.forEach(s => {
        const res = calculateScenario(revenue, fixedExpenses, flexibleExpenses, m, s);
        row[`sal_${s}`] = res.totalRetained;
      });
      return row;
    });
  }, [revenue, fixedExpenses, flexibleExpenses]);

  const salarySteps = [0, 600000, 900000, 1200000, 1500000, 1800000, 2400000, 3000000];

  // Find max in heatmap for scaling colors
  const maxRetained = Math.max(...heatmapData.flatMap(row => 
    salarySteps.map(s => row[`sal_${s}`])
  ));
  const minRetained = Math.min(...heatmapData.flatMap(row => 
    salarySteps.map(s => row[`sal_${s}`])
  ));

  const getHeatmapColor = (val) => {
    const ratio = (val - minRetained) / (maxRetained - minRetained);
    // Gradient from Red (low) to Yellow (mid) to Green (high)
    if (ratio < 0.5) {
      const r = 255;
      const g = Math.floor(255 * (ratio * 2));
      return `rgba(${r}, ${g}, 0, 0.7)`;
    } else {
      const r = Math.floor(255 * (1 - (ratio - 0.5) * 2));
      const g = 255;
      return `rgba(${r}, ${g}, 0, 0.7)`;
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
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Tax Optimization Simulator</h1>
            <p className="text-slate-500">Pvt Ltd vs. Personal Income Strategy (FY 2025-26)</p>
          </div>
          <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <Maximize2 size={24} />
            <div>
              <div className="text-xs opacity-80 uppercase font-bold tracking-wider">Current Retained Earnings</div>
              <div className="text-xl font-bold">{formatCurrency(currentResults.totalRetained)}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Panel */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-blue-600">
                <Settings size={20} />
                <h2 className="font-bold text-lg">Input Parameters</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                    Gross Annual Revenue <span>{formatCurrency(revenue)}</span>
                  </label>
                  <input 
                    type="range" min="1000000" max="50000000" step="500000"
                    value={revenue} onChange={(e) => setRevenue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Flexible Expenses (Creative)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">₹</span>
                    <input 
                      type="number" value={flexibleExpenses} onChange={(e) => setFlexibleExpenses(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Subscriptions, Car, Office Upgrades, etc.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      <Users size={14}/> Members
                    </label>
                    <select 
                      value={numFamilyMembers} onChange={(e) => setNumFamilyMembers(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                    >
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Salary / Head</label>
                    <input 
                      type="number" value={salaryPerMember} onChange={(e) => setSalaryPerMember(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                    <Info size={18} className="text-blue-500 mt-0.5" />
                    <div className="text-xs text-blue-800 leading-relaxed">
                      <strong>Tax Logic:</strong> Corporate Tax is 25.168%. Individual Salary follows New Regime (Standard Deduction ₹75k included). Effective 0% tax up to ₹12.75L CTC.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
               <div className="flex justify-between items-center text-sm opacity-70">
                 <span>Efficiency Metric</span>
                 <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-[10px]">HEALTHY</span>
               </div>
               <div className="text-3xl font-bold">
                 {((currentResults.totalRetained / revenue) * 100).toFixed(1)}%
                 <span className="text-sm font-normal opacity-60 ml-2">Retained</span>
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-white/10 p-2 rounded-lg text-center">
                    <div className="opacity-60 mb-1">Company Tax</div>
                    <div className="font-bold">{formatCurrency(currentResults.companyTax)}</div>
                 </div>
                 <div className="bg-white/10 p-2 rounded-lg text-center">
                    <div className="opacity-60 mb-1">Family Ind. Tax</div>
                    <div className="font-bold">{formatCurrency(currentResults.indTax * numFamilyMembers)}</div>
                 </div>
               </div>
            </div>
          </aside>

          {/* Main Analysis Section */}
          <main className="lg:col-span-8 space-y-8">
            
            {/* Breakout Charts */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-80">
                <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Cashflow Distribution</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Fixed Exp', value: fixedExpenses },
                        { name: 'Flex Exp', value: flexibleExpenses },
                        { name: 'Company Tax', value: currentResults.companyTax },
                        { name: 'Retained Earnings', value: currentResults.totalRetained },
                      ]}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                    >
                      {[0,1,2,3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#cbd5e1', '#94a3b8', '#f43f5e', '#10b981'][index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-80">
                <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Family Income Source</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={[
                      { name: 'Direct Net Salary', val: currentResults.totalFamilyNetSalary },
                      { name: 'Company PAT', val: currentResults.pat }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} hide />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="val" radius={[10, 10, 0, 0]}>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Heatmap Section */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Optimization Heatmap</h3>
                  <p className="text-xs text-slate-500">Finding the sweet spot between Number of Members and Salary</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="w-3 h-3 bg-red-400 rounded"></div> Low Retained
                  <div className="w-3 h-3 bg-green-400 rounded ml-2"></div> High Retained
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-3 bg-slate-50 rounded-tl-xl text-slate-400 font-medium border-b border-slate-100">Members</th>
                      {salarySteps.map(s => (
                        <th key={s} className="p-3 bg-slate-50 text-slate-400 font-medium border-b border-slate-100">
                          {s/100000}L
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-bold text-slate-600 bg-slate-50/50 border-r border-slate-100 text-center">
                          {row.members}
                        </td>
                        {salarySteps.map(s => {
                          const val = row[`sal_${s}`];
                          const isCurrent = row.members === numFamilyMembers && s === salaryPerMember;
                          return (
                            <td 
                              key={s} 
                              className={`p-3 text-[10px] text-center transition-all cursor-help relative group`}
                              style={{ backgroundColor: getHeatmapColor(val) }}
                              title={`${row.members} members @ ${s/100000}L each = ${formatCurrency(val)}`}
                            >
                              <span className="font-semibold text-slate-800">
                                {(val/100000).toFixed(1)}L
                              </span>
                              {isCurrent && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm z-10 animate-pulse"></div>
                              )}
                              
                              {/* Hover Tooltip */}
                              <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-900 text-white p-2 rounded-lg text-[9px] z-20 pointer-events-none">
                                Total: {formatCurrency(val)}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 italic">
                <ChevronRight size={14} className="text-blue-500" />
                The values in the grid represent the Total Family Retained Earnings (Company PAT + Total Net Salaries) in Lakhs.
              </div>
            </section>

            {/* Strategic Advice */}
            <section className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                     <TrendingUp size={24} /> Optimal Strategy Recommendation
                   </h3>
                   <p className="text-blue-100 max-w-md">
                     Based on your revenue of {formatCurrency(revenue)}, taking {numFamilyMembers} members to a salary of {formatCurrency(salaryPerMember)} is currently yielding {formatCurrency(currentResults.totalRetained)}.
                   </p>
                 </div>
                 <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl">
                    <p className="text-xs uppercase font-bold opacity-80 mb-1">Expert Tip</p>
                    <p className="text-sm font-medium">
                      {salaryPerMember > 1275000 
                        ? "You've crossed the zero-tax threshold for members. Consider increasing 'Creative Flexible Expenses' to reduce Company PBT before paying 30% individual tax."
                        : "Staying below ₹12.75L (CTC) per person is highly tax efficient as individual tax remains near zero in the new regime."}
                    </p>
                 </div>
               </div>
               <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
