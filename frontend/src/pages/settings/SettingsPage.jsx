import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  Building,
  Briefcase,
  Camera,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  MapPin,
  GitBranch,
  ShieldCheck,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/auth.api";
import PageHeader from "../../components/dashboard/PageHeader";
import SectionCard from "../../components/dashboard/SectionCard";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Profile Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    designation: "",
    department: "",
    branch: "",
    territory: "",
    employeeId: "",
  });

  // Password Form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    orderNotifications: true,
    taskUpdates: true,
    weeklyReport: false,
  });

  const primaryRoleName = useMemo(() => {
    if (!user) return "System User";
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      const r = user.roles[0];
      return typeof r === "string" ? r : r.role?.name || r.name || "System User";
    }
    return user.role?.name || "System User";
  }, [user]);

  const initials = useMemo(() => {
    const fn = formData.firstName || user?.firstName || "U";
    const ln = formData.lastName || user?.lastName || "";
    return `${fn[0] || ""}${ln[0] || ""}`.toUpperCase();
  }, [formData, user]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        designation: primaryRoleName,
        department: user.department?.name || "Operations",
        branch: user.branch?.name || "Main Branch",
        territory: user.territory?.name || "Central Territory",
        employeeId: user.id ? `EMP-${user.id.substring(0, 6).toUpperCase()}` : "EMP-1001",
      });
      if (user.avatarUrl) {
        setAvatarPreview(user.avatarUrl);
      }
    }
  }, [user, primaryRoleName]);

  // Handle Profile Picture File Upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("Profile picture selected! Click 'Save Profile' to upload and save.");
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Profile picture removed. Click 'Save Profile' to apply.");
  };

  // Submit Profile Information
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let finalAvatarUrl = avatarPreview;

      // If a new photo was selected, upload it directly to Cloudinary
      if (selectedFile) {
        const uploadRes = await authApi.uploadAvatar(selectedFile);
        finalAvatarUrl = uploadRes.data?.data?.avatarUrl || uploadRes.data?.avatarUrl;
        setAvatarPreview(finalAvatarUrl);
        setSelectedFile(null);
      } else if (!avatarPreview) {
        finalAvatarUrl = null;
      }

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        avatarUrl: finalAvatarUrl,
      };
      await authApi.updateProfile(payload);
      if (setUser && user) {
        const updatedUser = { ...user, ...payload };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    try {
      setPasswordSaving(true);
      await authApi.changePassword({
        oldPassword: passwordData.currentPassword,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to change password. Please verify your current password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-5xl mx-auto pb-10">
      <PageHeader title="Account & Profile Settings" subtitle="Manage your personal profile, avatar image, security options, and notification preferences." />

      {/* Header Profile Hero Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-5">
          {/* Avatar Container with Upload Overlay */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md border-4 border-white">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white hover:bg-indigo-600 transition shadow-lg cursor-pointer"
              title="Change Profile Picture"
            >
              <Camera size={16} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{formData.firstName} {formData.lastName}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-1" /> Active Account
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{formData.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                {primaryRoleName}
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                ID: {formData.employeeId}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
          >
            <Camera size={14} /> Upload Picture
          </button>
          {avatarPreview && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-xs hover:bg-red-100 transition flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <User size={16} /> Personal Profile
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
            activeTab === "security"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <KeyRound size={16} /> Security & Password
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
            activeTab === "preferences"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sliders size={16} /> Preferences
        </button>
      </div>

      {/* TAB 1: Profile Information */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <SectionCard title="Personal Details" icon={User} iconColor="text-indigo-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address (Verified)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm outline-none cursor-not-allowed pr-10"
                  />
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Organization & Role Information" icon={Briefcase} iconColor="text-indigo-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Role</label>
                <input
                  type="text"
                  value={formData.designation}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold text-sm outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Operating Branch</label>
                <input
                  type="text"
                  value={formData.branch}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === "security" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <SectionCard title="Change Account Password" icon={KeyRound} iconColor="text-indigo-600">
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              {passwordSaving ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Preferences & Notifications */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <SectionCard title="Notification Preferences" icon={Bell} iconColor="text-indigo-600">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Email Order Notifications</h4>
                  <p className="text-xs text-slate-500">Receive email alerts for new sales orders and approvals.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.orderNotifications}
                  onChange={(e) => setPreferences({ ...preferences, orderNotifications: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Task Assignment Alerts</h4>
                  <p className="text-xs text-slate-500">Get notified when new field tasks or visits are assigned.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.taskUpdates}
                  onChange={(e) => setPreferences({ ...preferences, taskUpdates: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Weekly Performance Summary</h4>
                  <p className="text-xs text-slate-500">Receive a weekly digest report of team target achievement.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.weeklyReport}
                  onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => toast.success("Preferences updated successfully!")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              <Save size={18} /> Save Preferences
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
