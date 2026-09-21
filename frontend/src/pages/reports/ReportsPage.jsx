import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Warehouse, Package, Boxes, Activity, RefreshCw, Loader2, Target, MapPin, HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";
import { getReportsAnalytics } from "../../api/report.api";
import PageHeader from "../../components/dashboard/PageHeader";
import SectionCard from "../../components/dashboard/SectionCard";
import { useAuth } from "../../context/AuthContext";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("branch");

  const {
    data: analytics = null,
    isLoading: loading,
    refetch: loadReportsData,
  } = useQuery({
    queryKey: ["reportsAnalytics"],
    queryFn: async () => {
      const res = await getReportsAnalytics();
      return res.data?.data || res.data;
    },
    staleTime: 120 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const reportTabs = [
    { id: "branch", label: "Branch Report", icon: Building2 },
    { id: "warehouses", label: "Warehouses", icon: Warehouse },
    { id: "product", label: "Product Report", icon: Package },
    { id: "stock", label: "Stock per Branches", icon: Boxes },
    { id: "fieldforce", label: "Field Force Report", icon: Activity },
  ];

  // Destructure 5 report datasets from API response
  const summary = analytics?.summary || {};
  const branchReport = analytics?.branchReport || [];
  const warehousesReport = analytics?.warehousesReport || [];
  const productReport = analytics?.productReport || [];
  const stockPerBranchesReport = analytics?.stockPerBranchesReport || [];
  const fieldForceReport = analytics?.fieldForceReport || { tasksSummary: {}, visitsSummary: {} };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 size={42} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Generating operational business reports & analytics...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Operational Reports & Analytics"
        subtitle="Real-time performance reports across branches, warehouses, stock, products, and field force"
      >
        {/* <button
          onClick={loadReportsData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={16} /> Refresh Reports
        </button> */}
      </PageHeader>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Branches</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.totalBranches || branchReport.length || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Warehouses</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.totalWarehouses || warehousesReport.length || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Products</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.totalProducts || productReport.length || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 block">Stock Entries</span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">{stockPerBranchesReport.length || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 shadow-xs">
          <span className="text-xs font-semibold text-purple-700 block">Tasks Completed</span>
          <span className="text-2xl font-black text-purple-900 mt-1 block">{fieldForceReport.tasksSummary?.completed || 0}</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <AnimatePresence mode="wait">
        {activeTab === "branch" && (
          <motion.div key="branch" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SectionCard title="Branch Operational Performance" subtitle="Orders count, fulfillment percentage, and team size per branch" icon={Building2} iconColor="text-blue-600">
              {branchReport.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchReport} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                          formatter={(value, name) => [
                            name.includes("Qty") || name.includes("Quantity") ? `${value} Units` : `${value}`,
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="totalOrders" name="Total Orders" fill="#f97316" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="completedTasks" name="Completed Tasks" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="requestedQuantity" name="Requested Qty" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Branch Performance KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchReport.map((b) => (
                      <div key={b.id || b.name} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-lg">{b.name}</h3>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">{b.code || "BR"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50">
                            <span className="text-slate-500 block">Total Orders</span>
                            <span className="font-bold text-slate-900 text-sm">{b.totalOrders ?? 0}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                            <span className="block text-emerald-600 font-medium">Completed Tasks</span>
                            <span className="font-bold text-sm">{b.completedTasks ?? 0} / {b.totalTasks ?? 0}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800">
                            <span className="block text-purple-600 font-medium">Fulfillment %</span>
                            <span className="font-bold text-sm">{b.fulfillmentPercentage ?? b.fulfillmentRate ?? 0}%</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800">
                            <span className="block text-blue-600 font-medium">Team Size</span>
                            <span className="font-bold text-sm">{b.teamSize ?? b.memberCount ?? 0} Workforce</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comprehensive Branch Performance Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="p-3">Branch Name</th>
                          <th className="p-3 text-center">Team Size</th>
                          <th className="p-3 text-center">Total Orders</th>
                          <th className="p-3 text-center cursor-help" title="Total number of product units ordered across all sales orders placed">
                            <span className="inline-flex items-center gap-1">Requested Qty <HelpCircle size={12} className="text-slate-400 inline" /></span>
                          </th>
                          <th className="p-3 text-center cursor-help" title="Total number of product units successfully delivered and approved">
                            <span className="inline-flex items-center gap-1">Fulfilled Qty <HelpCircle size={12} className="text-slate-400 inline" /></span>
                          </th>
                          <th className="p-3 text-center cursor-help" title="Percentage of ordered product units that have been successfully fulfilled">
                            <span className="inline-flex items-center gap-1">Fulfillment % <HelpCircle size={12} className="text-slate-400 inline" /></span>
                          </th>
                          <th className="p-3 text-center">Completed Tasks</th>
                          <th className="p-3 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {branchReport.map((b) => (
                          <tr key={b.id || b.name} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-900">
                              {b.name}
                              {b.code ? <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-semibold">{b.code}</span> : null}
                            </td>
                            <td className="p-3 text-center text-slate-600">{b.teamSize ?? b.memberCount ?? 0} Staff</td>
                            <td className="p-3 text-center font-bold text-slate-900">{b.totalOrders ?? 0}</td>
                            <td className="p-3 text-center font-bold text-purple-700">{b.requestedQuantity ?? 0} Units</td>
                            <td className="p-3 text-center font-bold text-emerald-700">{b.fulfilledQuantity ?? 0} Units</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                (b.fulfillmentPercentage ?? 0) >= 75 ? "bg-emerald-50 text-emerald-700" : (b.fulfillmentPercentage ?? 0) >= 40 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                              }`}>
                                {b.fulfillmentPercentage ?? b.fulfillmentRate ?? 0}%
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              {b.completedTasks ?? 0} / {b.totalTasks ?? 0}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700">₹{(b.totalRevenue || 0).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">No branch data available in database.</p>
              )}
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "warehouses" && (
          <motion.div key="warehouses" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SectionCard title="Warehouse Inventory & Stock Analytics" subtitle="Stock levels, product issue counts, and assigned branch networks" icon={Warehouse} iconColor="text-indigo-600">
              {warehousesReport.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={warehousesReport} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }} />
                        <Legend />
                        <Bar dataKey="totalStockQuantity" name="Total Stock Qty" fill="#f97316" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="availableStockQuantity" name="Available Qty" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="productIssueCount" name="Product Issues" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehousesReport.map((w) => (
                      <div key={w.id || w.name} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-lg">{w.name}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${w.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {w.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Manager: <span className="font-semibold text-slate-800">{w.managerName}</span></p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-slate-50">
                            <span className="text-slate-500 block">Total Qty</span>
                            <span className="font-bold text-slate-900">{w.totalStockQuantity}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                            <span className="block text-emerald-600">Available</span>
                            <span className="font-bold">{w.availableStockQuantity}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                            <span className="block text-amber-600">Issues</span>
                            <span className="font-bold">{w.productIssueCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">No warehouse records found in database.</p>
              )}
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "product" && (
          <motion.div key="product" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SectionCard title="Product Catalog & Sales Report" subtitle="Units sold, pricing, order frequency, and inventory stock" icon={Package} iconColor="text-emerald-600">
              {productReport.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productReport} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }} />
                        <Legend />
                        <Bar dataKey="totalUnitsSold" name="Units Sold" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="currentStockQuantity" name="Current Stock" fill="#f97316" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalOrdersCount" name="Total Orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="p-4">Product Name</th>
                          <th className="p-4">SKU</th>
                          <th className="p-4">Category</th>
                          <th className="p-4 text-right">Base Price</th>
                          <th className="p-4 text-center">Orders Count</th>
                          <th className="p-4 text-center">Units Sold</th>
                          <th className="p-4 text-center">Current Stock</th>
                          <th className="p-4 text-right">Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productReport.map((p) => (
                          <tr key={p.id || p.sku} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-900">{p.name}</td>
                            <td className="p-4 font-mono text-xs text-slate-600">{p.sku}</td>
                            <td className="p-4 text-slate-600">{p.category}</td>
                            <td className="p-4 text-right font-semibold text-slate-900">₹{(p.price || 0).toLocaleString("en-IN")}</td>
                            <td className="p-4 text-center font-bold text-blue-700">{p.totalOrdersCount ?? 0}</td>
                            <td className="p-4 text-center font-bold text-emerald-700">{p.totalUnitsSold ?? 0}</td>
                            <td className="p-4 text-center font-bold text-purple-700">{p.currentStockQuantity ?? 0}</td>
                            <td className="p-4 text-right font-bold text-emerald-700">₹{(p.totalRevenue || (p.price || 0) * (p.totalUnitsSold || 0)).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">No product records found in database.</p>
              )}
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "stock" && (
          <motion.div key="stock" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SectionCard title="Stock per Branches & Warehouses Report" subtitle="Inventory distribution and available quantities across branch networks" icon={Boxes} iconColor="text-amber-600">
              {stockPerBranchesReport.length > 0 ? (
                <div className="space-y-6">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="p-4">Product</th>
                          <th className="p-4">SKU</th>
                          <th className="p-4">Warehouse</th>
                          <th className="p-4">Assigned Branch(es)</th>
                          <th className="p-4 text-center">Net Available Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockPerBranchesReport.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-900">{s.productName}</td>
                            <td className="p-4 font-mono text-xs text-slate-600">{s.sku}</td>
                            <td className="p-4 font-semibold text-slate-700">{s.warehouseName}</td>
                            <td className="p-4 text-slate-600">{s.branchNames}</td>
                            <td className="p-4 text-center font-bold text-emerald-700">{s.availableQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">No branch stock entries found in database.</p>
              )}
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "fieldforce" && (
          <motion.div key="fieldforce" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SectionCard title="Current Field Force Workforce & Task Execution Report" subtitle="Current working field workforce size, completed tasks, in-progress tasks, and pending tasks" icon={Activity} iconColor="text-purple-600">
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-900">
                    <span className="text-xs font-semibold text-purple-700 block">Current Field Workforce</span>
                    <span className="text-2xl font-extrabold text-purple-950 mt-1 block">{fieldForceReport.workforceCount || fieldForceReport.workforceList?.length || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 block">Total Tasks</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{fieldForceReport.tasksSummary?.total || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                    <span className="text-xs font-semibold text-emerald-700 block">Completed Tasks</span>
                    <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{fieldForceReport.tasksSummary?.completed || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800">
                    <span className="text-xs font-semibold text-blue-700 block">In Progress</span>
                    <span className="text-2xl font-extrabold text-blue-900 mt-1 block">{fieldForceReport.tasksSummary?.inProgress || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                    <span className="text-xs font-semibold text-amber-700 block">Pending Tasks</span>
                    <span className="text-2xl font-extrabold text-amber-900 mt-1 block">{fieldForceReport.tasksSummary?.pending || 0}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Overall Field Task Completion Rate ({fieldForceReport.tasksSummary?.completionRate || 0}%)</span>
                    <span className="text-emerald-700">{fieldForceReport.tasksSummary?.completed || 0} / {fieldForceReport.tasksSummary?.total || 0} Tasks Completed</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${fieldForceReport.tasksSummary?.completionRate || 0}%` }} />
                  </div>
                </div>

                {/* Field Workforce Member Breakdown Table */}
                {(fieldForceReport.workforceList || []).length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="p-4">Field Worker Name</th>
                          <th className="p-4">Branch</th>
                          <th className="p-4 text-center">Assigned Tasks</th>
                          <th className="p-4 text-center">Completed Tasks</th>
                          <th className="p-4 text-center">In Progress</th>
                          <th className="p-4 text-center">Pending Tasks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fieldForceReport.workforceList.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-900">
                              <div>
                                <p>{w.name}</p>
                                <p className="text-xs text-slate-500 font-normal">{w.email}</p>
                              </div>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">{w.branchName}</td>
                            <td className="p-4 text-center font-bold text-slate-900">{w.totalTasks}</td>
                            <td className="p-4 text-center font-bold text-emerald-700">{w.completedTasks}</td>
                            <td className="p-4 text-center font-bold text-blue-700">{w.inProgressTasks}</td>
                            <td className="p-4 text-center font-bold text-amber-700">{w.pendingTasks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">No field workforce members found.</p>
                )}
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
