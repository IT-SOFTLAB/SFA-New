import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Warehouse,
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Building,
  GitBranch,
  UserCheck,
  UserX,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Users,
  ShieldCheck,
  Package,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import inventoryApi from "../../api/inventory.api";
import branchApi from "../../api/branch.api";
import { useAuth } from "../../context/AuthContext";
import { isSuperAdminUser } from "../../utils/roleUtils";

export default function Warehouses() {
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL"); // ALL, ASSIGNED, REQUIRED

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [assigningWarehouse, setAssigningWarehouse] = useState(null);
  const [viewWarehouse, setViewWarehouse] = useState(null);

  // Form State for Create/Edit Warehouse
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    code: "",
    location: "",
    branchId: "",
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State for Assign Manager
  const [assignMode, setAssignMode] = useState("existing"); // 'existing' | 'new'
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [newManagerForm, setNewManagerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Password@123",
    phoneNumber: "",
  });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Initial Data Fetch
  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [whRes, branchRes, mgrRes] = await Promise.all([
        inventoryApi.getWarehouses().catch((err) => { console.error("Error fetching warehouses:", err); return { data: { data: [] } }; }),
        branchApi.getBranches().catch((err) => { console.error("Error fetching branches:", err); return { data: { data: [] } }; }),
        inventoryApi.getWarehouseManagers().catch((err) => { console.error("Error fetching managers:", err); return { data: { data: [] } }; }),
      ]);

      const fetchedWarehouses = whRes.data?.data?.warehouses || whRes.data?.warehouses || (Array.isArray(whRes.data?.data) ? whRes.data.data : []);
      const fetchedBranches = branchRes.data?.data?.branches || branchRes.data?.branches || (Array.isArray(branchRes.data?.data) ? branchRes.data.data : []);
      const fetchedManagers = mgrRes.data?.data?.managers || mgrRes.data?.data || (Array.isArray(mgrRes.data) ? mgrRes.data : []);

      setWarehouses(fetchedWarehouses);
      setBranches(fetchedBranches);
      setManagers(fetchedManagers);

      if (isManualRefresh) toast.success("Warehouse data refreshed");
    } catch (err) {
      console.error("Error loading warehouse data:", err);
      toast.error("Failed to load warehouse records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((wh) => {
      const matchesSearch =
        !search ||
        wh.name?.toLowerCase().includes(search.toLowerCase()) ||
        wh.code?.toLowerCase().includes(search.toLowerCase()) ||
        wh.location?.toLowerCase().includes(search.toLowerCase());

      const branchName = wh.branches?.[0]?.name || "";
      const matchesBranch =
        selectedBranchFilter === "ALL" || branchName === selectedBranchFilter;

      const isAssigned = Boolean(wh.warehouseManagerId || wh.warehouseManager);
      const matchesManager =
        managerFilter === "ALL" ||
        (managerFilter === "ASSIGNED" && isAssigned) ||
        (managerFilter === "REQUIRED" && !isAssigned);

      return matchesSearch && matchesBranch && matchesManager;
    });
  }, [warehouses, search, selectedBranchFilter, managerFilter]);

  // Handle Open Create Warehouse Modal
  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setWarehouseForm({
      name: "",
      code: `WH-${Date.now().toString().slice(-4)}`,
      location: "",
      latitude: "",
      longitude: "",
      branchId: branches[0]?.id || "",
      isActive: true,
    });
    setFormError("");
    setShowCreateModal(true);
  };

  // Handle Open Edit Warehouse Modal
  const handleOpenEdit = (wh) => {
    setEditingWarehouse(wh);
    setWarehouseForm({
      name: wh.name || "",
      code: wh.code || "",
      location: wh.location || "",
      latitude: wh.latitude != null ? wh.latitude : "",
      longitude: wh.longitude != null ? wh.longitude : "",
      branchId: wh.branches?.[0]?.id || "",
      isActive: wh.isActive !== false,
    });
    setFormError("");
    setShowCreateModal(true);
  };

  // Submit Create / Edit Warehouse
  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!warehouseForm.name.trim() || warehouseForm.name.length < 2) {
      setFormError("Warehouse name must be at least 2 characters");
      return;
    }

    if (warehouseForm.latitude === "" || warehouseForm.latitude == null || isNaN(parseFloat(warehouseForm.latitude))) {
      setFormError("Latitude is required and must be a valid number");
      return;
    }

    if (warehouseForm.longitude === "" || warehouseForm.longitude == null || isNaN(parseFloat(warehouseForm.longitude))) {
      setFormError("Longitude is required and must be a valid number");
      return;
    }

    const payload = {
      name: warehouseForm.name.trim(),
      code: warehouseForm.code.trim() || undefined,
      location: warehouseForm.location.trim() || undefined,
      latitude: parseFloat(warehouseForm.latitude),
      longitude: parseFloat(warehouseForm.longitude),
      isActive: warehouseForm.isActive,
    };

    setFormSubmitting(true);
    try {
      if (editingWarehouse) {
        await inventoryApi.updateWarehouse(editingWarehouse.id, payload);
        toast.success(`Warehouse "${payload.name}" updated successfully`);
      } else {
        await inventoryApi.createWarehouse({
          ...payload,
          ...(warehouseForm.branchId && { branchId: warehouseForm.branchId }),
        });
        toast.success(`Warehouse "${payload.name}" created successfully`);
      }
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error("Error saving warehouse:", err);
      const msg = err.response?.data?.message || err.message || "Failed to save warehouse";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Open Assign Manager Modal
  const handleOpenAssignManager = (wh) => {
    setAssigningWarehouse(wh);
    setAssignMode("existing");
    setSelectedManagerId(wh.warehouseManagerId || wh.warehouseManager?.id || "");
    setNewManagerForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "Password@123",
      phoneNumber: "",
    });
    setAssignError("");
  };

  // Submit Manager Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignError("");

    if (!assigningWarehouse) return;

    setAssignSubmitting(true);
    try {
      if (assignMode === "existing") {
        if (!selectedManagerId) {
          setAssignError("Please select a Warehouse Manager");
          setAssignSubmitting(false);
          return;
        }
        await inventoryApi.assignWarehouseManager(assigningWarehouse.id, {
          userId: selectedManagerId,
        });
        toast.success(`Manager assigned to ${assigningWarehouse.name}`);
      } else {
        if (!newManagerForm.firstName || !newManagerForm.lastName || !newManagerForm.email) {
          setAssignError("Please complete all required fields for the new manager");
          setAssignSubmitting(false);
          return;
        }
        await inventoryApi.createWarehouseManager({
          ...newManagerForm,
          warehouseId: assigningWarehouse.id,
        });
        toast.success(`New Warehouse Manager created & assigned to ${assigningWarehouse.name}`);
      }
      setAssigningWarehouse(null);
      fetchData();
    } catch (err) {
      console.error("Error assigning manager:", err);
      const msg = err.response?.data?.message || err.message || "Failed to assign warehouse manager";
      setAssignError(msg);
      toast.error(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Branch Warehouses</h1>
          <p className="text-slate-500 text-sm mt-1">
            Dedicated warehouse management per branch & manager assignment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-sm rounded-xl shadow-xs hover:bg-slate-50 transition"
          >
            <RotateCw size={16} className={refreshing ? "animate-spin text-indigo-600" : "text-slate-500"} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button> */}

          {!isSuperAdmin && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
            >
              <Plus size={18} />
              Create Warehouse
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search warehouse name, code, or location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                Branch: {b.name}
              </option>
            ))}
          </select>

          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Manager States</option>
            <option value="ASSIGNED">Manager Assigned</option>
            <option value="REQUIRED">Manager Required</option>
          </select>
        </div>
      </div>

      {/* Warehouses Grid View */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-medium text-slate-600">Loading dedicated branch warehouses...</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <Warehouse size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Warehouses Found</h3>
          <p className="text-slate-500 text-xs mt-1">Try adjusting search or branch filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredWarehouses.map((wh) => {
            const branch = wh.branches?.[0];
            const manager = wh.warehouseManager;
            const isAssigned = Boolean(manager);
            const stockUnits = Array.isArray(wh.stocks)
              ? wh.stocks.reduce((acc, s) => acc + (s.available !== undefined ? s.available : Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0))), 0)
              : 0;

            return (
              <motion.div
                key={wh.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                        <Warehouse size={22} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-snug">{wh.name}</h3>
                        <span className="text-xs font-mono font-semibold text-slate-500">{wh.code || "WH-CODE"}</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        wh.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {wh.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Branch Hierarchy Box (1 Branch = 1 Dedicated Warehouse) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Dedicated Branch</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        1:1 Topology
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                      <GitBranch size={16} className="text-indigo-600 shrink-0" />
                      {branch ? branch.name : <span className="text-amber-600 font-normal">Unlinked Branch</span>}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span>{wh.location || "Location not specified"}</span>
                    </div>
                  </div>

                  {/* Manager State Box */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Warehouse Manager
                      </span>
                      {isAssigned ? (
                        <div className="mt-1">
                          <span className="font-bold text-slate-800 text-sm block">
                            {manager.firstName} {manager.lastName}
                          </span>
                          <span className="text-xs text-slate-500 block">{manager.email}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <AlertTriangle size={12} /> WAREHOUSE_MANAGER_REQUIRED
                        </span>
                      )}
                    </div>

                    {!isSuperAdmin && (
                      <button
                        onClick={() => handleOpenAssignManager(wh)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition shrink-0"
                      >
                        {isAssigned ? "Reassign" : "Assign Manager"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Bottom Row Actions & Metrics */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Stock</span>
                    <span className="font-extrabold text-indigo-600 text-base">{stockUnits} units</span>
                  </div>

                  <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewWarehouse(wh)}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleOpenEdit(wh)}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                          title="Edit Warehouse"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT WAREHOUSE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {editingWarehouse ? "Edit Warehouse" : "Create Dedicated Warehouse"}
              </h2>
              <p className="text-slate-500 text-xs mb-6">
                1 Branch = 1 Dedicated Warehouse architecture.
              </p>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}

              <form onSubmit={handleWarehouseSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    placeholder="e.g. Indore Palasiya Warehouse"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Code</label>
                    <input
                      type="text"
                      value={warehouseForm.code}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                      placeholder="e.g. WH-IND-01"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {!editingWarehouse && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dedicated Branch</label>
                      <select
                        value={warehouseForm.branchId}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, branchId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address</label>
                  <input
                    type="text"
                    value={warehouseForm.location}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                    placeholder="e.g. Palasiya Square, Indore"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={warehouseForm.latitude}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, latitude: e.target.value })}
                      placeholder="e.g. 22.7196"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={warehouseForm.longitude}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, longitude: e.target.value })}
                      placeholder="e.g. 75.8577"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={warehouseForm.isActive}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Active Warehouse
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                    >
                      {formSubmitting ? "Saving..." : editingWarehouse ? "Update Warehouse" : "Create Warehouse"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASSIGN WAREHOUSE MANAGER MODAL */}
      <AnimatePresence>
        {assigningWarehouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <button
                onClick={() => setAssigningWarehouse(null)}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                Assign Manager
              </h2>
              <p className="text-slate-500 text-xs mb-6">
                Warehouse: <strong className="text-slate-800">{assigningWarehouse.name}</strong>
              </p>

              {assignError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {assignError}
                </div>
              )}

              {/* Toggle Mode */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAssignMode("existing")}
                  className={`flex-1 py-2 rounded-lg transition ${assignMode === "existing" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"}`}
                >
                  Select Existing Manager
                </button>
                <button
                  type="button"
                  onClick={() => setAssignMode("new")}
                  className={`flex-1 py-2 rounded-lg transition ${assignMode === "new" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"}`}
                >
                  + Create New Manager
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4 text-sm">
                {assignMode === "existing" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Manager *</label>
                    <select
                      value={selectedManagerId}
                      onChange={(e) => setSelectedManagerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a Warehouse Manager...</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={newManagerForm.firstName}
                          onChange={(e) => setNewManagerForm({ ...newManagerForm, firstName: e.target.value })}
                          placeholder="e.g. Ramesh"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={newManagerForm.lastName}
                          onChange={(e) => setNewManagerForm({ ...newManagerForm, lastName: e.target.value })}
                          placeholder="e.g. Kumar"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={newManagerForm.email}
                        onChange={(e) => setNewManagerForm({ ...newManagerForm, email: e.target.value })}
                        placeholder="e.g. ramesh.wh@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                        <input
                          type="password"
                          required
                          value={newManagerForm.password}
                          onChange={(e) => setNewManagerForm({ ...newManagerForm, password: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={newManagerForm.phoneNumber}
                          onChange={(e) => setNewManagerForm({ ...newManagerForm, phoneNumber: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAssigningWarehouse(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                  >
                    {assignSubmitting ? "Assigning..." : "Assign Manager"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW WAREHOUSE DETAILS MODAL */}
      <AnimatePresence>
        {viewWarehouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-6 relative">
                <button
                  onClick={() => setViewWarehouse(null)}
                  className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white/10 text-indigo-400 border border-white/10">
                    <Warehouse size={28} />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300 block">Warehouse Specification</span>
                    <h2 className="text-2xl font-bold text-white mt-0.5">{viewWarehouse.name}</h2>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Code</span>
                    <span className="font-mono text-sm font-bold text-slate-800 mt-1 block">{viewWarehouse.code || "WH"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Location</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">{viewWarehouse.location || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Dedicated Branch</span>
                    <span className="text-sm font-bold text-indigo-600 mt-1 block">{viewWarehouse.branches?.[0]?.name || "Unlinked Branch"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Warehouse Manager</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {viewWarehouse.warehouseManager ? `${viewWarehouse.warehouseManager.firstName} ${viewWarehouse.warehouseManager.lastName}` : "WAREHOUSE_MANAGER_REQUIRED"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package size={24} className="text-indigo-600" />
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Warehouse Stock Balance</span>
                      <h4 className="text-lg font-bold text-slate-800">
                        {Array.isArray(viewWarehouse.stocks) ? viewWarehouse.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0) : 0} Total Units
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setViewWarehouse(null)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
