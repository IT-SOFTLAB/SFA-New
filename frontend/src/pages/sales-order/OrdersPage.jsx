import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { 
  ShoppingCart, RefreshCw, Eye, X, Building2, User, MapPin, 
  FileText, Calendar, Tag, CreditCard, CheckCircle2, AlertCircle, 
  Clock, ShieldCheck, Mail, Phone, Hash, Layers, ChevronLeft, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

import salesApi from "../../api/sales.api";
import PageHeader from "../../components/dashboard/PageHeader";
import SectionCard from "../../components/dashboard/SectionCard";
import EmptyDashboard from "../../components/dashboard/EmptyDashboard";
import ErrorState from "../../components/dashboard/ErrorState";
import { TableSkeleton } from "../../components/dashboard/LoadingSkeleton";
import { useAuth } from "../../context/AuthContext";
import { isSuperAdminUser } from "../../utils/roleUtils";

import ImportOrdersModal from "./ImportOrdersModal";
import { FileSpreadsheet } from "lucide-react";

export default function OrdersPage() {
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Selected order details state for modal
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const {
    data: orderResult = { orders: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, stats: null },
    isLoading: loading,
    error,
    refetch: loadOrders,
  } = useQuery({
    queryKey: ["orders", page, pageSize, filter],
    queryFn: async () => {
      const params = { page, limit: pageSize };
      if (filter === "COMPLETED") {
        params.status = "COMPLETED";
      } else if (filter === "DRAFT") {
        params.status = "DRAFT";
      }
      const res = await salesApi.listOrders(params);
      const data = res.data?.data || res.data;
      return {
        orders: Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [],
        pagination: data?.pagination || { page: 1, limit: pageSize, total: data?.orders?.length || 0, totalPages: 1 },
        stats: data?.stats || null,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const orders = orderResult.orders;
  const pagination = orderResult.pagination;
  const stats = orderResult.stats;

  const openOrderModal = async (order) => {
    setSelectedOrderId(order.id);
    setLoadingDetails(true);
    try {
      const res = await salesApi.getOrder(order.id);
      const data = res.data?.data || res.data;
      setOrderDetails(data || order);
    } catch (err) {
      console.error("Failed to load order details:", err);
      toast.error("Failed to load complete order details");
      setOrderDetails(order);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeOrderModal = () => {
    setSelectedOrderId(null);
    setOrderDetails(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load Sales Orders" onRetry={loadOrders} />;
  }

  const handleFilterClick = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const filteredOrders = orders;

  const totalRevenue = orders.reduce((sum, o) => {
    const val = typeof o.totalAmount === "object" ? o.totalAmount?.amount : o.totalAmount;
    return sum + (Number(val) || 0);
  }, 0);

  const completedOrdersList = orders.filter((o) => {
    const s = String(o.status || "").toUpperCase();
    return s.includes("DELIVERED") || s.includes("COMPLETED") || s.includes("APPROVED");
  });

  const draftOrdersList = orders.filter((o) => {
    const s = String(o.status || "").toUpperCase();
    return s.includes("DRAFT") || s.includes("PENDING");
  });

  const completedRevenue = completedOrdersList.reduce((sum, o) => {
    const val = typeof o.totalAmount === "object" ? o.totalAmount?.amount : o.totalAmount;
    return sum + (Number(val) || 0);
  }, 0);

  const draftRevenue = draftOrdersList.reduce((sum, o) => {
    const val = typeof o.totalAmount === "object" ? o.totalAmount?.amount : o.totalAmount;
    return sum + (Number(val) || 0);
  }, 0);

  const filteredAmount = filteredOrders.reduce((sum, o) => {
    const val = typeof o.totalAmount === "object" ? o.totalAmount?.amount : o.totalAmount;
    return sum + (Number(val) || 0);
  }, 0);

  // Overall Organization Totals (across all orders in the organization)
  const displayTotalRevenue = stats?.totalValue ?? totalRevenue;
  const displayTotalCount = stats?.totalOrders ?? pagination.total ?? orders.length;

  const displayCompletedRevenue = stats?.byStatus?.COMPLETED?.value ?? completedRevenue;
  const displayCompletedCount = stats?.byStatus?.COMPLETED?.count ?? completedOrdersList.length;

  const displayDraftRevenue = (Number(stats?.byStatus?.DRAFT?.value || 0) + Number(stats?.byStatus?.PENDING?.value || 0)) || draftRevenue;
  const displayDraftCount = (Number(stats?.byStatus?.DRAFT?.count || 0) + Number(stats?.byStatus?.PENDING?.count || 0)) || draftOrdersList.length;

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s.includes("DELIVERED") || s.includes("COMPLETED")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (s.includes("APPROVED") || s.includes("CONFIRMED")) return "bg-blue-100 text-blue-800 border-blue-300";
    if (s.includes("CANCEL") || s.includes("REJECT")) return "bg-rose-100 text-rose-800 border-rose-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Sales Orders" subtitle="Manage and track customer sales orders across your organization">
        <div className="flex items-center gap-3">
          {!isSuperAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition cursor-pointer"
            >
              <FileSpreadsheet size={16} /> Import Orders (Excel)
            </button>
          )}
          {/* <button
            onClick={loadOrders}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button> */}
        </div>
      </PageHeader>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Order Value */}
        <div
          onClick={() => handleFilterClick("ALL")}
          title="Total gross value of all created sales orders across all statuses in your organization"
          className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition ${
            filter === "ALL"
              ? "bg-blue-50/90 border-blue-400 ring-2 ring-blue-300/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Order Value</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{displayTotalCount}</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">₹{displayTotalRevenue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500 mt-0.5">All created sales orders</p>
        </div>

        {/* Completed Revenue */}
        <div
          onClick={() => handleFilterClick("COMPLETED")}
          title="Total revenue realized from delivered or completed sales orders in your organization"
          className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition ${
            filter === "COMPLETED"
              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed Revenue</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {displayCompletedCount}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1.5">₹{displayCompletedRevenue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500 mt-0.5">Realized & delivered revenue</p>
        </div>

        {/* Draft / Pending Amount */}
        <div
          onClick={() => handleFilterClick("DRAFT")}
          title="Total value of sales orders currently in Draft, Pending review, or awaiting fulfillment in your organization"
          className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition ${
            filter === "DRAFT"
              ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending / Draft Value</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{displayDraftCount}</span>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1.5">₹{displayDraftRevenue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500 mt-0.5">Awaiting fulfillment / review</p>
        </div>

        {/* Filtered Active View */}
        {/* <div
          title="Dynamic total amount and order count matching your currently selected tab on this page"
          className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-5 shadow-sm transition hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Active Page View</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              {filter} (Page {page})
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-1.5">₹{filteredAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{filteredOrders.length} order(s) on current page</p>
        </div> */}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "ALL", label: `All Orders (${displayTotalCount})` },
          { key: "DRAFT", label: `Pending / Draft (${displayDraftCount})` },
          { key: "COMPLETED", label: `Completed Orders (${displayCompletedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterClick(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <SectionCard 
        title="All Sales Orders" 
        subtitle={pagination.total > 0 ? `Showing ${Math.min((page - 1) * pageSize + 1, pagination.total)}-${Math.min(page * pageSize, pagination.total)} of ${pagination.total} orders` : `${filteredOrders.length} order(s)`} 
        icon={ShoppingCart} 
        iconColor="text-blue-600"
      >
        {filteredOrders.length === 0 ? (
          <EmptyDashboard title="No Sales Orders Found" description="No orders found for the active filter." />
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Order Name / #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Branch / Executive</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredOrders.map((o) => {
                  const amountVal = typeof o.totalAmount === "object" ? o.totalAmount?.amount : o.totalAmount;
                  const formattedAmount = typeof o.totalAmount === "object" ? o.totalAmount?.formatted : `₹${Number(amountVal || 0).toLocaleString("en-IN")}`;
                  const custName = o.customer?.name || o.customerName || "N/A";
                  const execName = o.owner?.name || o.ownerName || "-";
                  const branch = o.branchName || o.owner?.branchName || (o.branchId ? "Mohit Branch" : "Indore Palasiya Branch");

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{o.orderName || (o.orderNumber ? `Sales Order (${o.orderNumber})` : "Sales Order")}</span>
                        <span className="text-xs font-mono text-blue-600 block">{o.orderNumber || o.id?.slice(0, 8)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{custName}</span>
                        {o.customer?.email && <span className="text-xs text-slate-400 block">{o.customer.email}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-bold text-slate-900 block">{branch}</span>
                        <span className="text-xs text-slate-500 block">Executive: {execName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {o.orderDate?.formatted || (o.createdAt ? dayjs(o.createdAt).format("MMM D, YYYY") : "-")}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formattedAmount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase whitespace-nowrap ${getStatusBadgeClass(o.status)}`}>
                          {o.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openOrderModal(o)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-medium transition shadow-sm"
                          title="View Full Order Details"
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing <span className="font-bold text-slate-900">{Math.min((page - 1) * pageSize + 1, pagination.total)}</span> to{" "}
                  <span className="font-bold text-slate-900">{Math.min(page * pageSize, pagination.total)}</span> of{" "}
                  <span className="font-bold text-slate-900">{pagination.total}</span> orders
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-3 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition cursor-pointer"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                {/* Page Indicator Buttons */}
                {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      page === p
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={page >= (pagination.totalPages || 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition cursor-pointer"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </SectionCard>

      {/* FULL SALES ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={closeOrderModal}
                className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={22} />
              </button>

              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <RefreshCw size={36} className="animate-spin text-indigo-600" />
                  <p className="text-slate-500 font-medium">Fetching Sales Order Details...</p>
                </div>
              ) : orderDetails ? (
                <>
                  {/* Modal Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-extrabold text-slate-900 font-mono">
                          {orderDetails.orderNumber || orderDetails.orderName || "Sales Order"}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusBadgeClass(orderDetails.status)}`}>
                          {orderDetails.status || "DRAFT"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <Calendar size={15} /> Order Date: {orderDetails.orderDate?.formatted || (orderDetails.createdAt ? dayjs(orderDetails.createdAt).format("MMM D, YYYY") : "-")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Order Amount</p>
                      <p className="text-3xl font-black text-indigo-600 mt-0.5">
                        {orderDetails.financial?.totalAmount?.formatted || (typeof orderDetails.totalAmount === "object" ? orderDetails.totalAmount?.formatted : `₹${Number(orderDetails.totalAmount || 0).toLocaleString("en-IN")}`)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Information Card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                        <User size={18} /> Customer Details
                      </div>
                      <div className="space-y-1.5 text-sm text-slate-700">
                        <p className="font-bold text-slate-900 text-base">{orderDetails.customer?.name || orderDetails.customerName || "N/A"}</p>
                        {orderDetails.customer?.companyName && orderDetails.customer.companyName !== "-" && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Building2 size={14} /> {orderDetails.customer.companyName}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Mail size={14} /> {orderDetails.customer?.email || "-"}
                        </p>
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Phone size={14} /> {orderDetails.customer?.phone || "-"}
                        </p>
                        {(orderDetails.customer?.gstNumber || orderDetails.customer?.panNumber) && (
                          <div className="pt-2 border-t border-slate-200 flex gap-4 text-xs text-slate-500">
                            {orderDetails.customer?.gstNumber && <span>GST: <strong>{orderDetails.customer.gstNumber}</strong></span>}
                            {orderDetails.customer?.panNumber && <span>PAN: <strong>{orderDetails.customer.panNumber}</strong></span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sales Representative & Organization Info Card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                        <Building2 size={18} /> Executive & Branch Context
                      </div>
                      <div className="space-y-1.5 text-sm text-slate-700">
                        <div>
                          <span className="text-xs text-slate-400 block uppercase font-medium">Sales Executive</span>
                          <span className="font-bold text-slate-900">{orderDetails.owner?.name || orderDetails.ownerName || "-"}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block uppercase font-medium">Assigned Branch</span>
                          <span className="font-semibold text-slate-800">{orderDetails.organization?.branchName || orderDetails.branchName || orderDetails.owner?.branchName || "-"}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block uppercase font-medium">Organization</span>
                          <span className="text-slate-800">{orderDetails.organization?.companyName || orderDetails.companyName || "IT Software"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Items Table */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Layers size={18} className="text-indigo-600" /> Ordered Items ({orderDetails.items?.length || 0})
                    </h3>

                    {(!orderDetails.items || orderDetails.items.length === 0) ? (
                      <div className="p-6 text-center text-slate-400 rounded-2xl border border-dashed bg-slate-50 text-sm">
                        No product item details recorded for this order.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Product Name</th>
                              <th className="py-3 px-4 text-center">Unit Price</th>
                              <th className="py-3 px-4 text-center">Qty</th>
                              <th className="py-3 px-4 text-center">Discount</th>
                              <th className="py-3 px-4 text-center">Tax</th>
                              <th className="py-3 px-4 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {orderDetails.items.map((item, idx) => {
                              const qty = item.quantity || 1;
                              const priceVal = typeof item.unitPrice === "object" ? item.unitPrice?.amount : item.unitPrice;
                              const formattedPrice = typeof item.unitPrice === "object" ? item.unitPrice?.formatted : `₹${Number(priceVal || 0).toLocaleString("en-IN")}`;
                              
                              const discVal = typeof item.discountAmount === "object" ? item.discountAmount?.amount : item.discountAmount;
                              const taxVal = typeof item.taxAmount === "object" ? item.taxAmount?.amount : item.taxAmount;
                              
                              const lineTotalVal = typeof item.lineTotal === "object" ? item.lineTotal?.amount : (qty * (Number(priceVal) || 0) - (Number(discVal) || 0) + (Number(taxVal) || 0));
                              const formattedLineTotal = typeof item.lineTotal === "object" ? item.lineTotal?.formatted : `₹${Number(lineTotalVal || 0).toLocaleString("en-IN")}`;

                              return (
                                <tr key={item.id || idx} className="hover:bg-slate-50/70">
                                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">
                                    {item.productName || item.description || "Product Item"}
                                    {item.sku && <span className="text-xs text-slate-400 block font-mono">SKU: {item.sku}</span>}
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-700">{formattedPrice}</td>
                                  <td className="py-3 px-4 text-center font-bold text-slate-900">{qty}</td>
                                  <td className="py-3 px-4 text-center text-slate-500">₹{Number(discVal || 0).toLocaleString("en-IN")}</td>
                                  <td className="py-3 px-4 text-center text-slate-500">₹{Number(taxVal || 0).toLocaleString("en-IN")}</td>
                                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formattedLineTotal}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary & Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs text-slate-600">
                      <p><strong>Payment Terms:</strong> {orderDetails.paymentTerms || "Standard 30 Days Net"}</p>
                      <p><strong>Delivery Terms:</strong> {orderDetails.deliveryTerms || "Standard Doorstep Delivery"}</p>
                      {orderDetails.notes && Array.isArray(orderDetails.notes) && orderDetails.notes.length > 0 && (
                        <div className="pt-2 border-t text-slate-700">
                          <strong>Notes:</strong> {orderDetails.notes.map((n) => n.text || n).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Amount:</span>
                        <span>{orderDetails.financial?.subtotal?.formatted || `₹${Number(orderDetails.financial?.subtotal || orderDetails.totalAmount || 0).toLocaleString("en-IN")}`}</span>
                      </div>
                      {orderDetails.financial?.discountAmount?.amount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount Applied:</span>
                          <span>-{orderDetails.financial?.discountAmount?.formatted}</span>
                        </div>
                      )}
                      {orderDetails.financial?.taxAmount?.amount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax / GST:</span>
                          <span>+{orderDetails.financial?.taxAmount?.formatted}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-base text-indigo-950 pt-2 border-t border-slate-200">
                        <span>Net Order Total:</span>
                        <span className="text-indigo-600">{orderDetails.financial?.totalAmount?.formatted || (typeof orderDetails.totalAmount === "object" ? orderDetails.totalAmount?.formatted : `₹${Number(orderDetails.totalAmount || 0).toLocaleString("en-IN")}`)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={closeOrderModal}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition shadow-md"
                    >
                      Close Details
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImportOrdersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onOrdersConverted={() => loadOrders()}
      />
    </motion.div>
  );
}
