import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Target, Award, Users, ShoppingCart, IndianRupee,
  RefreshCw, Loader2, CheckCircle2, Activity, Zap, Building2,
  Calendar, Layers, Check, Clock, AlertCircle, ArrowUpRight, HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";

import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/dashboard/PageHeader";
import SectionCard from "../../components/dashboard/SectionCard";
import dashboardService from "../../services/dashboard.service";

import { getOrganizationOverview } from "../../api/targetPerformance.api";

export default function TargetPerformanceAnalytics() {
  const { user } = useAuth();
  const [trendPeriod, setTrendPeriod] = useState("monthly");

  const {
    data: analytics = null,
    isLoading: loading,
    refetch: loadData,
  } = useQuery({
    queryKey: ["targetPerformanceAnalytics"],
    queryFn: async () => {
      const res = await getOrganizationOverview();
      return res?.data?.data || res?.data;
    },
    staleTime: 120 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const overview = analytics?.companyOverview || analytics || {};
  const kpiSummary = overview?.kpiSummary || {};
  const revenueTrends = overview?.revenueTrends || { monthly: [], weekly: [], daily: [] };
  const executives = overview?.executivesPerformance || [];
  const managers = overview?.managersPerformance || [];
  const branchPerformance = overview?.branchPerformance || [];

  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const currentTrendData = useMemo(() => {
    if (trendPeriod === "daily") {
      const daily = revenueTrends.daily || [];
      return daily.map((d) => {
        let period = d.period;
        if (period && period.includes("-")) {
          const parsed = new Date(period);
          if (!isNaN(parsed.getTime())) {
            period = parsed.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
          }
        }
        return {
          ...d,
          period,
          revenue: Number(d.revenue || 0),
          orders: Number(d.orders || 0),
        };
      });
    }

    if (trendPeriod === "weekly") {
      const weekly = revenueTrends.weekly || [];
      return weekly.map((w) => ({
        ...w,
        revenue: Number(w.revenue || 0),
        orders: Number(w.orders || 0),
      }));
    }

    // Monthly: Ensure all 12 calendar months from Jan to Dec are always displayed dynamically
    const monthly = revenueTrends.monthly || [];
    const monthlyMap = new Map();
    monthly.forEach((m) => {
      if (m.period) monthlyMap.set(m.period, m);
    });

    return allMonths.map((month) => {
      if (monthlyMap.has(month)) {
        const item = monthlyMap.get(month);
        return {
          ...item,
          period: month,
          revenue: Number(item.revenue || 0),
          orders: Number(item.orders || 0),
        };
      }
      return {
        period: month,
        revenue: 0,
        orders: 0,
      };
    });
  }, [trendPeriod, revenueTrends]);

  const totalRevenue = overview?.totalRevenue || 0;
  const totalOrders = kpiSummary?.totalOrders || 0;
  const totalTasks = kpiSummary?.totalTasks || 0;
  const completedTasks = kpiSummary?.completedTasks || 0;

  // Filter active executives with tasks for clean visualization
  const activeExecutives = useMemo(() => {
    const list = executives.filter((e) => e.assignedTasks > 0 || e.ordersReceived > 0);
    return list.length > 0 ? list : executives.slice(0, 6);
  }, [executives]);

  // Filter active managers with orders for clean visualization
  const activeManagers = useMemo(() => {
    const list = managers.filter((m) => m.ordersReceived > 0 || m.totalOrderValue > 0);
    return list.length > 0 ? list : managers.slice(0, 6);
  }, [managers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 size={42} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Loading Real Target & Operational Performance Analytics...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Target & Operational Performance Analytics"
        subtitle="Live performance metrics for Sales Executives (Tasks Target) & Sales Managers (Sales Orders Target)"
      >
        {/* <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={16} /> Refresh Analytics
        </button> */}
      </PageHeader>

      {/* Top KPI Cards with Real DB Explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sales Orders Value</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><IndianRupee size={18} /></div>
          </div>
          <span className="text-2xl font-black text-slate-900 block">₹{totalRevenue.toLocaleString("en-IN")}</span>
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> Sum of live DB orders
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sales Orders Count</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><ShoppingCart size={18} /></div>
          </div>
          <span className="text-2xl font-black text-slate-900 block">{totalOrders} Orders</span>
          <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
            <Building2 size={14} /> Across branch
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Field Force Tasks Completed</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><CheckCircle2 size={18} /></div>
          </div>
          <span className="text-2xl font-black text-slate-900 block">{completedTasks} / {totalTasks} Tasks</span>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
            <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Company Staff Members</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Users size={18} /></div>
          </div>
          <span className="text-2xl font-black text-slate-900 block">{executives.length + managers.length} Workforce</span>
          <span className="text-xs font-medium text-slate-500">{executives.length} Executives | {managers.length} Managers</span>
        </div>
      </div>

      {/* GRAPH 1: Overall Organization Sales Revenue Trend */}
      <SectionCard title="Organization Sales Order Revenue & Orders Trajectory" subtitle="Sum of all sales orders across Daily, Weekly, and Monthly timelines" icon={TrendingUp} iconColor="text-emerald-600">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold text-slate-500">Timeline Filter:</span>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTrendPeriod("daily")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${trendPeriod === "daily" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Daily
              </button>
              <button
                onClick={() => setTrendPeriod("weekly")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${trendPeriod === "weekly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTrendPeriod("monthly")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${trendPeriod === "monthly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {currentTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="#10b981"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f97316"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name) => [
                      name.includes("Revenue") ? `₹${Number(value).toLocaleString("en-IN")}` : `${value} Orders`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Sales Order Revenue (₹)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders Count"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f97316" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 py-12 text-center">No sales order trend records found in database.</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* GRAPH 2 & 3: Sales Executives Task Target vs Sales Managers Order Target Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 2: Sales Executives Target Performance Graph */}
        <SectionCard title="Sales Executives Operational Target Graph" subtitle="Tasks Assigned vs Tasks Completed per Field Executive" icon={Target} iconColor="text-purple-600">
          <div className="space-y-4">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeExecutives} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="assignedTasks" name="Tasks Assigned" fill="#f97316" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completedTasks" name="Tasks Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Executive Performance List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Field Executive</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3 text-center">Assigned Tasks</th>
                    <th className="p-3 text-center">Completed Tasks</th>
                    <th className="p-3 text-center">Task Execution %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {executives.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{e.name}</td>
                      <td className="p-3 text-slate-600">{e.branchName}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{e.assignedTasks}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{e.completedTasks}</td>
                      <td className="p-3 text-center font-bold text-purple-700">{e.taskCompletionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* GRAPH 3: Sales Managers Target Performance Graph */}
        <SectionCard title="Sales Managers Operational Target Graph" subtitle={`Showing all ${managers.length} Sales Managers in organization`} icon={Building2} iconColor="text-blue-600">
          <div className="space-y-4">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeManagers} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="ordersReceived" name="Orders" fill="#f97316" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="totalOrderValue" name="Order Value (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Manager Performance List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Sales Manager ({managers.length})</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3 text-center">Orders</th>
                    <th className="p-3 text-right">Total Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {managers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3 text-slate-600">{m.branchName}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{m.ordersReceived}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">₹{m.totalOrderValue.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* GRAPH 4: Branch-level Target Comparison Chart & Detailed Table */}
      <SectionCard title="Branch-level Operational Performance Breakdown" subtitle="Sales Orders, Completed Tasks, and Requested Quantities by Branch" icon={Layers} iconColor="text-indigo-600">
        {branchPerformance.length > 0 ? (
          <div className="space-y-6">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchPerformance} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name) => [
                      name === "Requested Qty" ? `${value} Units` : `${value}`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalOrders" name="Total Orders" fill="#f97316" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completedTasks" name="Completed Tasks" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="requestedQty" name="Requested Qty" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Branch-level Performance Breakdown Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Branch Name</th>
                    <th className="p-3 text-center">Staff Members</th>
                    <th className="p-3 text-center">Total Orders</th>
                    <th className="p-3 text-center cursor-help" title="Total number of product units ordered by customers across all sales orders placed">
                      <span className="inline-flex items-center gap-1">Requested Qty <HelpCircle size={12} className="text-slate-400 inline" /></span>
                    </th>
                    <th className="p-3 text-center">Completed Tasks</th>
                    <th className="p-3 text-center">Task Execution %</th>
                    <th className="p-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {branchPerformance.map((b) => (
                    <tr key={b.id || b.name} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">
                        {b.name}
                        {b.code ? <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-semibold">{b.code}</span> : null}
                      </td>
                      <td className="p-3 text-center text-slate-600">{b.memberCount || 0} Workforce</td>
                      <td className="p-3 text-center font-bold text-slate-900">{b.totalOrders || 0}</td>
                      <td className="p-3 text-center font-bold text-purple-700">{b.requestedQty || 0} Units</td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {b.completedTasks || 0} / {b.totalTasks || 0}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          b.taskCompletionRate >= 75 ? "bg-emerald-50 text-emerald-700" : b.taskCompletionRate >= 40 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.taskCompletionRate || 0}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">₹{(b.totalRevenue || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-8 text-center">No branch performance entries found in database.</p>
        )}
      </SectionCard>
    </motion.div>
  );
}
