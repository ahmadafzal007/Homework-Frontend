"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CRMRecord, DealStage, DealPriority, LastActivityType } from "@/lib/types";
import { User, Briefcase, Phone, ChevronDown, Gauge } from "lucide-react";

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="spin" fill="none" stroke="currentColor" strokeWidth={3} style={{ borderRadius: "50%" }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeLinecap="round" />
      <path d="M12 2C6.477 2 2 6.477 2 12" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

const DEFAULT_RECORD: CRMRecord = {
  person: { id: "cust-001", name: "Jane Smith", role: "VP of Engineering", company: "Acme Corp", industry: "SaaS" },
  deal: { stage: "proposal", deal_value: 75000, priority: "high", expected_close_days: 14 },
  activity: { last_contact_days_ago: 7, last_activity_type: "email_open", email_open_rate: 0.65, email_reply_rate: 0.2, calls_count: 2, meetings_count: 1 },
  contact: { email: "jane@acme.com", phone: "+1-555-0100", has_email: true, has_phone: true, consent_to_contact: true },
  data_quality: { missing_fields: [], profile_completeness_score: 0.85 },
  signals: { is_high_intent: true, is_unresponsive: false, is_decision_maker: true, engagement_score: 72 },
  history: { total_interactions: 8, days_in_pipeline: 45 },
};

const DEAL_STAGES: DealStage[] = ["lead", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
const DEAL_PRIORITIES: DealPriority[] = ["low", "medium", "high"];
const ACTIVITY_TYPES: LastActivityType[] = ["email_sent", "email_open", "email_reply", "call", "meeting", "none"];

const panel = {
  border: "1px solid rgba(39, 39, 42, 0.9)",
  borderRadius: "8px",
  backgroundOpen: "rgba(12, 12, 18, 0.82)",
  backgroundClosed: "rgba(9, 9, 11, 0.55)",
};

interface Props {
  initialRecord?: CRMRecord | null;
  onSubmit: (record: CRMRecord) => void;
  loading: boolean;
  submitLabel?: string;
}

export default function CRMForm({ initialRecord, onSubmit, loading, submitLabel = "Run Analysis" }: Props) {
  const [rec, setRec] = useState<CRMRecord>(initialRecord || DEFAULT_RECORD);
  const [activeSection, setActiveSection] = useState<string | null>("person");

  useEffect(() => {
    if (initialRecord) {
      setRec(initialRecord);
    }
  }, [initialRecord]);

  const set = <K extends keyof CRMRecord>(section: K, field: string, value: unknown) => {
    setRec((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as object), [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rec);
  };

  const Section = ({ id, label, icon: Icon, children }: any) => {
    const isOpen = activeSection === id;
    return (
      <div
        style={{
          marginBottom: "8px",
          border: panel.border,
          borderRadius: panel.borderRadius,
          background: isOpen ? panel.backgroundOpen : panel.backgroundClosed,
          boxShadow: isOpen ? "0 0 0 1px rgba(143, 62, 243, 0.14),0 1px 2px rgba(0,0,0,0.35)" : "0 1px 2px rgba(0,0,0,0.25)",
          transition: "background 0.2s, box-shadow 0.2s, border-color 0.2s",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection(isOpen ? null : id)}
          style={{
            width: "100%",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: isOpen ? "#fafafa" : "#a1a1aa" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isOpen ? "rgba(143, 62, 243, 0.12)" : "rgba(39, 39, 42, 0.5)",
                color: isOpen ? "#a78bfa" : "#71717a",
              }}
            >
              <Icon size={14} strokeWidth={2} />
            </div>
            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={15} color="#71717a" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "0 14px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const Field = ({ label, children }: any) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {children}
    </div>
  );

  const checkRow = {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px" as const,
    cursor: "pointer" as const,
    padding: "10px 12px" as const,
    background: "rgba(24, 24, 27, 0.45)",
    border: "1px solid rgba(39, 39, 42, 0.85)",
    borderRadius: "8px",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Section id="person" label="Identity & Firmographics" icon={User}>
        <Field label="Record ID">
          <input className="input-field" style={{ borderRadius: "6px" }} value={rec.person.id} onChange={(e) => set("person", "id", e.target.value)} required />
        </Field>
        <Field label="Full Name">
          <input className="input-field" style={{ borderRadius: "6px" }} value={rec.person.name} onChange={(e) => set("person", "name", e.target.value)} required />
        </Field>
        <Field label="Professional Role">
          <input className="input-field" style={{ borderRadius: "6px" }} value={rec.person.role ?? ""} onChange={(e) => set("person", "role", e.target.value)} />
        </Field>
        <Field label="Organization">
          <input className="input-field" style={{ borderRadius: "6px" }} value={rec.person.company ?? ""} onChange={(e) => set("person", "company", e.target.value)} />
        </Field>
      </Section>

      <Section id="deal" label="Deal Architecture" icon={Briefcase}>
        <Field label="Pipeline Stage">
          <select className="input-field" style={{ borderRadius: "6px" }} value={rec.deal.stage} onChange={(e) => set("deal", "stage", e.target.value as DealStage)}>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contract Value ($)">
          <input className="input-field" style={{ borderRadius: "6px" }} type="number" min={0} value={rec.deal.deal_value} onChange={(e) => set("deal", "deal_value", parseFloat(e.target.value) || 0)} />
        </Field>
        <Field label="Deal Priority">
          <select className="input-field" style={{ borderRadius: "6px" }} value={rec.deal.priority} onChange={(e) => set("deal", "priority", e.target.value as DealPriority)}>
            {DEAL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Est. Days to Close">
          <input className="input-field" style={{ borderRadius: "6px" }} type="number" min={0} value={rec.deal.expected_close_days} onChange={(e) => set("deal", "expected_close_days", parseInt(e.target.value) || 0)} />
        </Field>
      </Section>

      <Section id="engagement" label="Engagement Metrics" icon={Gauge}>
        <Field label="Days Since Contact">
          <input className="input-field" style={{ borderRadius: "6px" }} type="number" min={0} value={rec.activity.last_contact_days_ago} onChange={(e) => set("activity", "last_contact_days_ago", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Last Touch Type">
          <select className="input-field" style={{ borderRadius: "6px" }} value={rec.activity.last_activity_type} onChange={(e) => set("activity", "last_activity_type", e.target.value as LastActivityType)}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email Open Rate">
          <input className="input-field" style={{ borderRadius: "6px" }} type="number" min={0} max={1} step={0.01} value={rec.activity.email_open_rate} onChange={(e) => set("activity", "email_open_rate", parseFloat(e.target.value) || 0)} />
        </Field>
        <Field label="Engagement Score">
          <input className="input-field" style={{ borderRadius: "6px" }} type="number" min={0} max={100} value={rec.signals.engagement_score} onChange={(e) => set("signals", "engagement_score", parseFloat(e.target.value) || 0)} />
        </Field>
      </Section>

      <Section id="compliance" label="Compliance & Consent" icon={Phone}>
        <Field label="Contact Consent">
          <label style={checkRow}>
            <input type="checkbox" style={{ width: "16px", height: "16px", accentColor: "#8f3ef3" }} checked={rec.contact.consent_to_contact} onChange={(e) => set("contact", "consent_to_contact", e.target.checked)} />
            <span style={{ fontSize: "13px", color: "#d4d4d8" }}>Consent to outreach</span>
          </label>
        </Field>
        <Field label="Decision Maker">
          <label style={checkRow}>
            <input type="checkbox" style={{ width: "16px", height: "16px", accentColor: "#8f3ef3" }} checked={rec.signals.is_decision_maker} onChange={(e) => set("signals", "is_decision_maker", e.target.checked)} />
            <span style={{ fontSize: "13px", color: "#d4d4d8" }}>EB confirmed</span>
          </label>
        </Field>
      </Section>

      <motion.button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ marginTop: "12px", padding: "12px", width: "100%", borderRadius: "6px", letterSpacing: "0.08em", fontSize: "10px" }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <Spinner size={14} />
            <span>Calculating…</span>
          </div>
        ) : (
          submitLabel
        )}
      </motion.button>
    </form>
  );
}
