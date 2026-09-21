import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  UserCheck,
  Briefcase,
  ShoppingCart,
  IndianRupee,
  ClipboardCheck,
  Clock3,
  Bell,
  Activity,
  ShieldCheck,
  TrendingUp,
  CalendarDays,
  AlertTriangle,
  Plus,
  Download,
  Building,
  Sparkles,
  GitBranch,
  Layers,
  CheckCircle2,
  Check,
  Shield,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import dayjs from "dayjs";

import useExecutiveDashboard from "../../hooks/useExecutiveDashboard";
import { useAuth } from "../../context/AuthContext";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsGrid from "../../components/dashboard/StatsGrid";
import StatCard from "../../components/dashboard/StatCard";
import SectionCard from "../../components/dashboard/SectionCard";
import ChartCard from "../../components/dashboard/ChartCard";
import PerformanceCard from "../../components/dashboard/PerformanceCard";
import ActivityTimeline from "../../components/dashboard/ActivityTimeline";
import NotificationList from "../../components/dashboard/NotificationList";
import QuickActions from "../../components/dashboard/QuickActions";
import EmptyDashboard from "../../components/dashboard/EmptyDashboard";
import ErrorState from "../../components/dashboard/ErrorState";
import { DashboardGridSkeleton } from "../../components/dashboard/LoadingSkeleton";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

const quickActions = [
  {
    label: "Add Organization",
    icon: Building2,
    iconColor: "text-blue-600",
    path: "/organization/organization",
  },
  {
    label: "Add User",
    icon: Users,
    iconColor: "text-emerald-600",
    path: "/organization/users",
  },
  {
    label: "Create Team",
    icon: Briefcase,
    iconColor: "text-orange-500",
    path: "/organization/teams",
  },
  {
    label: "Export Reports",
    icon: Download,
    iconColor: "text-violet-600",
    path: "/reports",
  },
];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { dashboard, loading, error, refresh } = useExecutiveDashboard();

  const fullName = useMemo(() => {
    if (!user) return "";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  }, [user]);

  const organizationName = useMemo(() => {
    return (
      user?.organization?.name ||
      user?.organizationName ||
      dashboard?.organizationInfo?.name ||
      dashboard?.recentOrganizations?.[0]?.name ||
      "Acme Corporation"
    );
  }, [user, dashboard]);

  // Extract metrics from API response safely
  const orgOverview = dashboard?.organizationOverview || {};
  const cards = dashboard?.cards || {};
  const visitSummary = dashboard?.visitSummary || {};
  const targets = Array.isArray(dashboard?.targets) ? dashboard.targets : [];
  const attendanceToday = dashboard?.attendanceToday || {};
  const orders = dashboard?.orders || {};

  const totalOrganizations = cards?.totalOrganizations ?? orgOverview?.organizations ?? 0;
  const totalBranches = cards?.totalBranches ?? orgOverview?.branches ?? 0;
  const totalUsers = cards?.totalUsers ?? orgOverview?.users ?? 0;
  const totalCustomers = cards?.totalCustomers ?? 0;
  const totalSalesOrders = cards?.totalSalesOrders ?? 0;
  const revenue = cards?.totalRevenue ?? orders?.APPROVED?.revenue ?? 0;
  const todaysRevenue = cards?.todaysRevenue ?? 0;

  const completedVisits = cards?.completedVisits ?? visitSummary?.COMPLETED ?? 0;
  const pendingVisits = cards?.pendingVisits ?? visitSummary?.PENDING ?? 0;
  const todayVisits = cards?.todayVisits ?? 0;
  const totalVisits = cards?.totalVisits ?? (completedVisits + pendingVisits + todayVisits);

  const presentCount = cards?.presentEmployees ?? attendanceToday?.PRESENT ?? 0;
  const absentCount = cards?.absentEmployees ?? attendanceToday?.ABSENT ?? 0;
  const leaveCount = cards?.leaveRequests ?? attendanceToday?.LEAVE ?? 0;

  const approvedOrders = orders?.APPROVED?.count || 0;
  const pendingOrders = orders?.PENDING?.count || 0;
  const cancelledOrders = orders?.CANCELLED?.count || 0;
  const totalOrdersCount = totalSalesOrders || (approvedOrders + pendingOrders + cancelledOrders);

  // Dynamic 12-month calendar revenue data from backend (Jan to Dec trajectory)
  const revenueData = useMemo(() => {
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (Array.isArray(dashboard?.monthlyRevenue) && dashboard.monthlyRevenue.length === 12) {
      return dashboard.monthlyRevenue;
    }
    if (Array.isArray(dashboard?.monthlyRevenue) && dashboard.monthlyRevenue.length > 0) {
      // Map received months into the 12 calendar months
      const map = {};
      dashboard.monthlyRevenue.forEach((m) => {
        if (m.month) map[m.month] = m.revenue || 0;
      });
      return allMonths.map((name) => ({
        month: name,
        revenue: map[name] ?? 0,
      }));
    }
    // Default 12 months with active total placed on the active month
    const currentMonthIdx = dayjs().month();
    return allMonths.map((name, idx) => ({
      month: name,
      revenue: idx === currentMonthIdx ? (revenue || 0) : 0,
    }));
  }, [dashboard?.monthlyRevenue, revenue]);

  // Dynamic growth computation based on real consecutive monthly order revenue
  const revenueGrowthInfo = useMemo(() => {
    if (!revenueData || revenueData.length < 2) {
      return { text: "+18.4% YoY Growth", isPositive: true };
    }
    const currentMonthIdx = dayjs().month();
    const current = revenueData[currentMonthIdx]?.revenue || 0;
    const previous = currentMonthIdx > 0 ? (revenueData[currentMonthIdx - 1]?.revenue || 0) : 0;

    if (previous === 0 && current > 0) {
      return { text: "+100% MoM Growth", isPositive: true };
    }
    if (previous === 0 && current === 0) {
      // Look back for last non-zero active month
      const nonZero = revenueData.filter((d) => d.revenue > 0);
      if (nonZero.length > 0) {
        return { text: "Enterprise Active", isPositive: true };
      }
      return { text: "Active Tracking", isPositive: true };
    }
    const diff = ((current - previous) / previous) * 100;
    const isPos = diff >= 0;
    return {
      text: `${isPos ? "+" : ""}${diff.toFixed(1)}% MoM Growth`,
      isPositive: isPos,
    };
  }, [revenueData]);

  // Order status pie data
  const orderData = useMemo(() => {
    return [
      { name: "Approved", value: totalOrdersCount > 0 ? Math.round((approvedOrders / totalOrdersCount) * 100) : 70 },
      { name: "Pending", value: totalOrdersCount > 0 ? Math.round((pendingOrders / totalOrdersCount) * 100) : 20 },
      { name: "Cancelled", value: totalOrdersCount > 0 ? Math.round((cancelledOrders / totalOrdersCount) * 100) : 10 },
    ].filter((d) => d.value > 0);
  }, [totalOrdersCount, approvedOrders, pendingOrders, cancelledOrders]);

  // Performance metrics from targets
  const performanceMetrics = useMemo(() => {
    const list = targets.slice(0, 3).map((t) => ({
      label: t.metric || "Target",
      value: t.targetValue > 0 ? Math.round((t.achievedValue / t.targetValue) * 100) : 0,
      suffix: "%",
    }));

    if (list.length < 3) {
      const defaultMetrics = [
        { label: "Visit Completion Rate", value: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 100 },
        { label: "Sales Target Achievement", value: totalSalesOrders > 0 ? 100 : 85 },
        { label: "User Active Engagement", value: totalUsers > 0 ? 100 : 92 },
      ];
      for (let i = list.length; i < 3; i++) {
        list.push(defaultMetrics[i]);
      }
    }
    return list;
  }, [targets, totalVisits, completedVisits, totalSalesOrders, totalUsers]);

  // License seat allocation quota
  const licenseQuota = useMemo(() => {
    const lic = dashboard?.licenseQuota || dashboard?.license;
    const max = lic?.maxLicenses ?? user?.organization?.maxLicenses ?? 20;
    const consumed = lic?.consumedLicenses ?? totalUsers ?? orgOverview?.users ?? 0;
    const available = lic?.availableLicenses ?? Math.max(0, max - consumed);
    const isLimitReached = lic?.isLimitReached ?? (consumed >= max);
    const percentUsed = Math.min(100, Math.round((consumed / max) * 100));
    return { max, consumed, available, isLimitReached, percentUsed };
  }, [dashboard, user, totalUsers, orgOverview]);

  // Dynamic real-time activity feed from actual sales orders and live system logs
  const recentActivities = useMemo(() => {
    const list = [];
    if (Array.isArray(dashboard?.recentOrders) && dashboard.recentOrders.length > 0) {
      dashboard.recentOrders.forEach((o) => {
        list.push({
          title: `Sales Order #${o.orderNumber || o.id?.slice(0, 8)}`,
          description: `${o.customer?.name || "Customer"} — Status: ${o.status || "CONFIRMED"} — ₹${Number(o.totalAmount || 0).toLocaleString("en-IN")}`,
          time: dayjs(o.createdAt).format("MMM D, h:mm A"),
          completed: o.status === "APPROVED" || o.status === "COMPLETED" || o.status === "DELIVERED",
        });
      });
    }
    if (list.length === 0) {
      list.push(
        { title: "System Operational", description: `Enterprise active with ${totalUsers} users across ${totalOrganizations} organizations`, time: "Just now", completed: true },
        { title: "Revenue Sync Active", description: `Total aggregated revenue: ₹${Number(revenue).toLocaleString("en-IN")}`, time: "Today", completed: true },
        { title: "Field Operations Active", description: `${presentCount} employees logged in today`, time: dayjs().format("h:mm A"), completed: true }
      );
    }
    return list;
  }, [dashboard?.recentOrders, totalUsers, totalOrganizations, revenue, presentCount]);

  if (loading) {
    return <DashboardGridSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Unable to fetch executive dashboard data. Please ensure the backend server is running."
        onRetry={refresh}
      />
    );
  }

  const hasData = dashboard && Object.keys(dashboard).length > 0;

  if (!hasData) {
    return (
      <EmptyDashboard
        title="No Dashboard Data"
        description="The dashboard data is not available yet. Data will appear once activities are recorded."
        onAction={refresh}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Super Admin Banner Header with Organization Name */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-indigo-700/50">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              {organizationName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Super Admin Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Super Admin Executive Dashboard
          </h1>
          <p className="text-sm text-indigo-200/90">
            Welcome back 👋, <span className="font-semibold text-white">{fullName || "Admin"}</span> — Live enterprise metrics for <span className="font-bold text-amber-300">{organizationName}</span>
          </p>
        </div>

        {/* <button
          onClick={refresh}
          className="self-start md:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition border border-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Refresh Data
        </button> */}
      </div>

      {/* Organization Seat License Quota Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${
          licenseQuota.isLimitReached
            ? "bg-red-50/90 border-red-200 text-red-950"
            : licenseQuota.available <= 5
            ? "bg-amber-50/90 border-amber-200 text-amber-950"
            : "bg-slate-50/90 border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl ${
                licenseQuota.isLimitReached
                  ? "bg-red-100 text-red-700"
                  : licenseQuota.available <= 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Organization License Quota
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    licenseQuota.isLimitReached
                      ? "bg-red-200 text-red-800"
                      : licenseQuota.available <= 5
                      ? "bg-amber-200 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {licenseQuota.isLimitReached ? "Limit Reached" : `${licenseQuota.available} Seats Available`}
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-800 mt-0.5">
                {licenseQuota.consumed} of {licenseQuota.max} License Consumed (1 user = 1 license)
              </p>
            </div>
          </div>

          {licenseQuota.isLimitReached ? (
            <div className="text-xs font-medium text-red-700 bg-red-100/80 border border-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertTriangle size={14} className="shrink-0" />
              <span>All licenses consumed. Contact your Franchise Administrator to upgrade.</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Every created role (Super Admin, Admin, Manager, Sales Executive) counts as 1.
            </div>
          )}
        </div>

        {/* Quota Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2.5 mt-3.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              licenseQuota.isLimitReached
                ? "bg-red-500"
                : licenseQuota.available <= 5
                ? "bg-amber-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${licenseQuota.percentUsed}%` }}
          />
        </div>
      </div>

      {/* Read-Only Organization Overview Card with Vibrant Styling */}
      <SectionCard
        title="Organization Overview & Hierarchy"
        subtitle="Live organization structure, branches, departments, and user totals"
        icon={Building2}
        iconColor="text-blue-600"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Organizations", value: orgOverview.organizations ?? 0, icon: Building2, color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200" },
            // { label: "Organizations", value: orgOverview.organizations ?? 0, icon: Building, color: "from-purple-500/10 to-violet-500/10 text-purple-600 border-purple-200" },
            { label: "Branches", value: orgOverview.branches ?? 0, icon: GitBranch, color: "from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200" },
            { label: "Departments", value: orgOverview.departments ?? 0, icon: Layers, color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200" },
            { label: "Teams", value: orgOverview.teams ?? 0, icon: Briefcase, color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200" },
            { label: "Total Users", value: orgOverview.users ?? 0, icon: Users, color: "from-indigo-500/10 to-blue-600/10 text-indigo-600 border-indigo-200" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                className={`p-4 rounded-2xl border bg-gradient-to-br ${item.color} shadow-sm flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{item.label}</span>
                  <Icon size={18} className="opacity-80" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
              </motion.div>
            );
          })}
        </div>
      </SectionCard>

      {/* KPI Stats Grid */}
      <StatsGrid>
        {/* <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          color="bg-indigo-500"
        /> */}
        <StatCard
          title="Assigned Customers"
          value={totalCustomers}
          icon={UserCheck}
          color="bg-blue-500"
        />
        {/* <StatCard
          title="Total Organizations"
          value={totalOrganizations}
          icon={Building2}
          color="bg-purple-500"
        /> */}
        {/* <StatCard
          title="Total Branches"
          value={totalBranches}
          icon={Building}
          color="bg-sky-500"
        /> */}
        <StatCard
          title="Total Sales Orders"
          value={totalSalesOrders}
          icon={ShoppingCart}
          color="bg-cyan-500"
        />
        <StatCard
          title="Today's Revenue"
          value={todaysRevenue}
          icon={IndianRupee}
          color="bg-amber-500"
          format="currency"
        />
        {/* <StatCard
          title="Today's Visits"
          value={todayVisits}
          icon={Clock3}
          color="bg-amber-500"
        /> */}
        {/* <StatCard
          title="Completed Visits"
          value={completedVisits}
          icon={ClipboardCheck}
          color="bg-teal-500"
        /> */}
        <StatCard
          title="Total Revenue"
          value={revenue}
          icon={IndianRupee}
          color="bg-emerald-600"
          format="currency"
        />
      </StatsGrid>

      {/* Modern Visual Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Area Chart with Smooth Gradient Fill */}
        <ChartCard
          title="System Revenue Analytics"
          subtitle="Real-time monthly revenue trajectory across all organizations"
          className="xl:col-span-2"
          delay={0.2}
          action={
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                revenueGrowthInfo.isPositive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <TrendingUp size={14} />
              {revenueGrowthInfo.text}
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
              <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Orders Status Donut Pie Chart */}
        {/* <ChartCard
          title="Orders Status Distribution"
          subtitle="Breakdown of approved vs pending vs cancelled sales orders"
          delay={0.3}
        >
          {orderData.length > 0 ? (
            <>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderData}
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                    >
                      {orderData.map((_entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-4">
                {orderData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyDashboard
              title="No Order Data"
              description="Orders will appear here when available."
            />
          )}
        </ChartCard> */}
      </div>

      {/* Performance Section */}
      {/* <div>
        <PerformanceCard
          title="Field Force Performance Analytics"
          subtitle="Overall team productivity and target achievement metrics"
          icon={Activity}
          metrics={performanceMetrics}
        />
      </div> */}

      {/* Activity & Notifications Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SectionCard
          title="System Activity Feed"
          subtitle="Real-time operations & transaction log across organizations"
          icon={Activity}
          className="xl:col-span-20"
          // action={
          //   // <button className="text-blue-600 text-sm font-semibold hover:underline">
          //   //   View All Logged
          //   // </button>
          // }
        >
          <ActivityTimeline activities={recentActivities} />
        </SectionCard>

        {/* <SectionCard
          title="System Notifications"
          icon={Bell}
          iconColor="text-amber-500"
        >
          <NotificationList
            notifications={[
              { title: `${pendingOrders} orders awaiting approval`, type: "warning", time: "Just now" },
              { title: "System Database Synced", type: "success", time: "1 hour ago" },
              { title: "Field Operations Active", type: "info", time: "Today" },
            ]}
          />
        </SectionCard> */}
      </div>

      {/* Quick Actions & Pending Approvals Grid */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Quick Management Actions" subtitle="System administration shortcuts">
          <QuickActions actions={quickActions} />
        </SectionCard>

        <SectionCard
          title="System Approvals Queue"
          subtitle="Pending reviews requiring Super Admin attention"
          icon={AlertTriangle}
          iconColor="text-orange-500"
        >
          <div className="space-y-3">
            {[
              { label: `${pendingOrders} Sales Orders Pending Review`, count: pendingOrders },
              { label: "8 Expense Claims Pending Approval", count: 8 },
              { label: "6 Leave Requests Awaiting Action", count: 6 },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/40 transition"
              >
                <span className="font-semibold text-slate-700 text-sm">{item.label}</span>
                <button className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm">
                  Review →
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div> */}

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs py-4 border-t border-slate-200">
        © 2026 IT360 Sales Force Automation Platform — Enterprise Management
      </footer>
    </motion.div>
  );
}



