import { useState } from "react";
import { Search, Bell, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openProfile, setOpenProfile] = useState(false);

  const fullName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    "User";

  const role =
    Array.isArray(user?.roles) && user.roles.length > 0
      ? user.roles[0]?.role?.name
      : "User";

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      if (setMobileOpen) setMobileOpen(!mobileOpen);
    } else {
      if (setCollapsed) setCollapsed(!collapsed);
    }
  };

  return (
    <header className="h-16 sm:h-18 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* <button
          type="button"
          onClick={handleMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button> */}

        
        <div className="min-w-0 truncate">
          <h1 className="text-sm sm:text-xl font-bold text-slate-800 tracking-tight truncate">
            Sales Force Automation
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 hidden xs:block truncate">
            Enterprise Dashboard
          </p>
        </div>
      </div>

      {/* Center */}

      {/* <div className="hidden lg:flex w-full max-w-xl mx-10">

        <div className="relative w-full">

          <Search
            size={18}
            className="absolute left-4 top-3.5 text-slate-400"
          />

          <input
            placeholder="Search anything..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

        </div>

      </div> */}

            {/* Right */}

      <div className="flex items-center gap-5">

        <button onClick={() => navigate("/notifications")}
          className="relative rounded-xl p-2 hover:bg-slate-100 transition"
        >

          <Bell size={21} />

          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />

        </button>

        <div className="relative">

          <button
            onClick={() =>
              setOpenProfile(!openProfile)
            }
            className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-slate-100 transition"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-full overflow-hidden bg-blue-600 text-white font-bold">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{fullName.charAt(0)}</span>
              )}
            </div>

            <div className="hidden md:block text-left">

              <p className="font-semibold text-sm">

                {fullName}

              </p>

              <p className="text-xs text-slate-500">

                {role}

              </p>

            </div>

            <ChevronDown size={18} />

          </button>

                    {openProfile && (

            <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-slate-200 bg-white shadow-xl z-50">

              <div className="border-b p-5">

                <p className="font-semibold">

                  {fullName}

                </p>

                <p className="text-sm text-slate-500">

                  {user?.email}

                </p>

              </div>

              <button
                onClick={logout}
                className="w-full text-left px-5 py-4 hover:bg-red-50 hover:text-red-600 transition"
              >

                Logout

              </button>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}