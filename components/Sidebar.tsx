"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  Code,
  Layers,
  LogOut,
  FileText,
} from "lucide-react";
import { ViewType, CRMRecord } from "@/lib/types";

interface SidebarProps {
  view: ViewType;
  setView: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedRecord: CRMRecord | null;
  onSignOut: () => void;
}

export default function Sidebar({
  view,
  setView,
  isCollapsed,
  onToggleCollapse,
  selectedRecord,
  onSignOut,
}: SidebarProps) {
  const mainNavItems = [
    { id: "overview" as ViewType, label: "Overview", icon: LayoutDashboard },
  ];

  const engineNavItems = [
    { id: "analyze" as ViewType, label: "AI Engine", icon: Layers },
    { id: "heuristic" as ViewType, label: "Rank Engine", icon: Code },
  ];

  const submissionNavItems = [
    { id: "readme" as ViewType, label: "README", icon: FileText },
    { id: "ai_usage" as ViewType, label: "AI Usage", icon: FileText },
    { id: "tests" as ViewType, label: "Tests", icon: Code },
  ];

  const canUseEngines = selectedRecord !== null;
  const customerSectionActive = view === "records" || view === "analyze" || view === "heuristic";
  const [customersOpen, setCustomersOpen] = useState(customerSectionActive && !isCollapsed);

  useEffect(() => {
    if (isCollapsed) return;
    if (customerSectionActive) {
      setCustomersOpen(true);
    }
  }, [customerSectionActive, isCollapsed]);

  const handleNavClick = (id: ViewType) => {
    setView(id);
    if (typeof window !== "undefined" && window.innerWidth <= 768 && !isCollapsed) {
      onToggleCollapse();
    }
  };

  const handleCustomersClick = () => {
    if (isCollapsed) {
      handleNavClick("records");
      return;
    }

    if (view !== "records") {
      setCustomersOpen(true);
      handleNavClick("records");
      return;
    }

    setCustomersOpen((o) => !o);
  };

  return (
    <motion.aside 
      className={`sidebar-root ${isCollapsed ? "collapsed" : ""}`}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="sidebar-header" style={{ 
        height: '100px', 
        padding: isCollapsed ? '20px 0' : '0 20px 0 24px', 
        justifyContent: 'space-between', 
        display: 'flex', 
        alignItems: 'center',
        flexDirection: isCollapsed ? 'column' : 'row',
        gap: isCollapsed ? '16px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.img 
                key="logo-full"
                src="/logo.png" 
                alt="Logo" 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ height: '64px', objectFit: 'contain' }}
              />
            ) : (
              <motion.img 
                key="logo-small"
                src="/logo.png" 
                alt="Logo" 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ height: '40px', width: '40px', objectFit: 'contain' }}
              />
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      <nav
        className="sidebar-nav"
        style={{
          padding: "8px",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`sidebar-nav-item ${view === item.id ? "active" : ""}`}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: isCollapsed ? "8px 0" : "8px 12px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              minHeight: "40px",
              marginBottom: "6px",
              borderRadius: "4px",
              position: "relative",
              background: view === item.id ? "rgba(255,255,255,0.05)" : "transparent",
              border: "1px solid rgba(255,255,255,0.05)",
              cursor: "pointer",
              color: view === item.id ? "#f8fafc" : "#94a3b8",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <item.icon size={18} style={{ flexShrink: 0 }} />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: "13px", fontWeight: "500" }}
              >
                {item.label}
              </motion.span>
            )}
            {view === item.id && (
              <motion.div
                layoutId="active-indicator"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "20%",
                  bottom: "20%",
                  width: "2px",
                  background: "#a78bfa",
                }}
              />
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={handleCustomersClick}
          className={`sidebar-nav-item ${customerSectionActive ? "active" : ""}`}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            minHeight: "40px",
            marginBottom: "6px",
            borderRadius: "4px",
            position: "relative",
            background: customerSectionActive ? "rgba(255,255,255,0.05)" : "transparent",
            border: "1px solid rgba(255,255,255,0.05)",
            cursor: "pointer",
            color: customerSectionActive ? "#f8fafc" : "#94a3b8",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Users size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: "13px", fontWeight: "500" }}
              >
                Customers
              </motion.span>
              <motion.div
                aria-hidden
                animate={{ rotate: customersOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", color: "#52525b" }}
              >
                <ChevronRight size={14} />
              </motion.div>
            </>
          )}
          {customerSectionActive && (
            <motion.div
              layoutId="active-indicator"
              style={{
                position: "absolute",
                left: 0,
                top: "20%",
                bottom: "20%",
                width: "2px",
                background: "#a78bfa",
              }}
            />
          )}
        </button>

        <AnimatePresence initial={false}>
          {!isCollapsed && customersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                overflow: "hidden",
                marginTop: "2px",
                marginBottom: "10px",
                paddingLeft: "12px",
                borderLeft: "1px solid rgba(255,255,255,0.05)",
                marginLeft: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "#52525b",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                }}
              >
                {selectedRecord ? `Selected: ${selectedRecord.person.name}` : "Select a customer to enable engines"}
              </div>

              {engineNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canUseEngines}
                  title={!canUseEngines ? "Select a customer in Customers first" : item.label}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-item ${view === item.id ? "active" : ""}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 10px",
                    justifyContent: "flex-start",
                    minHeight: "32px",
                    marginBottom: "4px",
                    borderRadius: "4px",
                    background: view === item.id ? "rgba(255,255,255,0.05)" : "transparent",
                    border: "1px solid rgba(255,255,255,0.03)",
                    cursor: !canUseEngines ? "not-allowed" : "pointer",
                    color: !canUseEngines ? "#52525b" : view === item.id ? "#f8fafc" : "#94a3b8",
                    opacity: !canUseEngines ? 0.65 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <item.icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", fontWeight: "500" }}>{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div aria-hidden style={{ flex: 1 }} />

        <div
          aria-hidden
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.06)",
            margin: isCollapsed ? "10px 0" : "12px 8px",
          }}
        />

        {!isCollapsed && (
          <div
            style={{
              fontSize: "10px",
              fontWeight: "800",
              color: "#52525b",
              textTransform: "uppercase",
              margin: "6px 12px 8px",
              letterSpacing: "0.05em",
            }}
          >
            Submission
          </div>
        )}

        {submissionNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`sidebar-nav-item ${view === item.id ? "active" : ""}`}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: isCollapsed ? "8px 0" : "8px 12px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              minHeight: "40px",
              marginBottom: "6px",
              borderRadius: "4px",
              position: "relative",
              background: view === item.id ? "rgba(255,255,255,0.05)" : "transparent",
              border: "1px solid rgba(255,255,255,0.05)",
              cursor: "pointer",
              color: view === item.id ? "#f8fafc" : "#94a3b8",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <item.icon size={18} style={{ flexShrink: 0 }} />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: "13px", fontWeight: "500" }}
              >
                {item.label}
              </motion.span>
            )}
            {view === item.id && (
              <motion.div
                layoutId="active-indicator"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "20%",
                  bottom: "20%",
                  width: "2px",
                  background: "#a78bfa",
                }}
              />
            )}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "8px", paddingTop: "16px" }}>
        <button
          type="button"
          onClick={onSignOut}
          className="sidebar-nav-item"
          title="Sign out"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            minHeight: "40px",
            borderRadius: "4px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <span style={{ fontSize: "13px", fontWeight: 500 }}>Sign out</span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}