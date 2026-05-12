import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import NotificationPanel from "./NotificationPanel";
import GlobalMic from "./GlobalMic";

interface SchedulerLayoutProps {
  children: React.ReactNode;
}

export default function SchedulerLayout({ children }: SchedulerLayoutProps) {
  const { currentUser, logout } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/calendar", label: "Calendar", icon: "🗓️" },
    { href: "/schedule", label: "Schedule", icon: "📅" },
    { href: "/patients", label: "Patients", icon: "👥" },
    { href: "/staff", label: "Staff", icon: "⚕️" },
    { href: "/audit", label: "Audit Log", icon: "📋" },
  ];

  const isActive = (href: string) => location === href;

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Fixed Mic - Always Visible */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100]">
        <GlobalMic />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-50 h-full
          ${sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-16 md:translate-x-0"}
          border-r border-border bg-card transition-all duration-300 flex flex-col shadow-lg overflow-hidden
        `}
      >
        {/* Logo */}
        <div className="border-b border-border p-4 flex items-center justify-between min-w-[240px] md:min-w-0">
          <h1 className="text-xl font-bold text-primary md:hidden">PatientScheduler</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 min-w-[240px] md:min-w-0">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm md:hidden">{item.label}</span>
              </a>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-2 min-w-[240px] md:min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            <span className="md:hidden">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors md:hidden"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-2xl font-bold text-primary">Patient Scheduler</h2>
          </div>

          {/* Current User Info */}
          {currentUser && (
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationPanel />

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <User size={16} className="text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium text-blue-900">{currentUser.name}</span>
                  <span className="text-blue-600 ml-2">{currentUser.serviceLine}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-gray-500 hover:text-red-600"
              >
                <LogOut size={18} />
              </Button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background min-h-0">
          <div className="p-4 md:p-6 pb-20">{children}</div>
        </div>
      </main>
    </div>
  );
}
