"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { NextBestAction } from "@/lib/types";
import {
  Mail,
  Phone,
  CalendarDays,
  PauseCircle,
  Search,
  TrendingUp,
  Tag,
  ChevronDown,
  ShieldAlert,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface ActionMeta {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const PURPLE = "#8f3ef3";
const PURPLE_SOFT = "#a78bfa";
const GREEN = "#22c55e";
const RED = "#ef4444";
const GRAY = "#a1a1aa";

const ACTION_META: Record<string, ActionMeta> = {
  send_follow_up_email: { icon: Mail, color: PURPLE_SOFT, bg: "rgba(143, 62, 243, 0.12)" },
  create_call_task: { icon: Phone, color: GREEN, bg: "rgba(34, 197, 94, 0.12)" },
  schedule_meeting: { icon: CalendarDays, color: PURPLE, bg: "rgba(143, 62, 243, 0.12)" },
  pause_outreach: { icon: PauseCircle, color: RED, bg: "rgba(239, 68, 68, 0.12)" },
  request_more_data: { icon: Search, color: GRAY, bg: "rgba(161, 161, 170, 0.12)" },
  escalate_to_account_executive: { icon: TrendingUp, color: GREEN, bg: "rgba(34, 197, 94, 0.12)" },
  mark_as_low_priority: { icon: Tag, color: GRAY, bg: "rgba(161, 161, 170, 0.1)" },
};

interface Props {
  action: NextBestAction;
  rank: number;
}

export default function RecommendationCard({ action, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const meta: ActionMeta = ACTION_META[action.action_type] ?? {
    icon: CheckCircle2,
    color: PURPLE,
    bg: "rgba(143, 62, 243, 0.12)",
  };
  const Icon = meta.icon;
  const pct = Math.round(action.confidence * 100);

  return (
    <motion.div
      className="rec-card"
      style={{ marginBottom: "10px", overflow: "hidden", position: "relative" }}
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "2px",
          background: meta.color,
          opacity: 0.9,
          borderRadius: "6px 0 0 6px",
        }}
        aria-hidden
      />
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 12px 10px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            minWidth: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: meta.bg,
            borderRadius: "6px",
            color: meta.color,
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "3px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                flex: "0 0 auto",
                minWidth: "2.25rem",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                fontVariantNumeric: "tabular-nums",
                color: "#fafafa",
                background: "rgba(143, 62, 243, 0.18)",
                border: "1px solid rgba(143, 62, 243, 0.35)",
                padding: "3px 6px",
                borderRadius: "9999px",
                lineHeight: 1,
              }}
            >
              #{rank}
            </span>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#fafafa",
                lineHeight: 1.3,
                flex: 1,
                minWidth: 0,
              }}
            >
              {action.title}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", paddingLeft: "calc(2.25rem + 8px)" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Action</span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{action.action_type.replace(/_/g, " ")}</span>
          </div>
        </div>

        <div style={{ textAlign: "right", minWidth: "92px", flexShrink: 0 }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#71717a", marginBottom: "4px", letterSpacing: "0.08em" }}>CONFIDENCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
            <div style={{ width: "52px", height: "5px", background: "rgba(39, 39, 42, 0.9)", borderRadius: "9999px", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", background: PURPLE, borderRadius: "9999px" }}
              />
            </div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#fafafa", fontVariantNumeric: "tabular-nums", minWidth: "32px" }}>{pct}%</span>
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ color: "#71717a", flexShrink: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
          <ChevronDown size={16} />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 12px 12px 18px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa", marginBottom: "6px" }}>
                  <FileText size={11} strokeWidth={2} />
                  <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reasoning</span>
                </div>
                <p style={{ fontSize: "12px", color: "#d4d4d8", lineHeight: 1.55 }}>{action.reasoning}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid rgba(39, 39, 42, 0.85)", paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: GREEN, marginBottom: "8px" }}>
                      <CheckCircle2 size={11} strokeWidth={2} />
                      <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Evidence</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {action.evidence.map((e, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "11px",
                            color: "#a1a1aa",
                            padding: "6px 10px",
                            background: "rgba(34, 197, 94, 0.06)",
                            border: "1px solid rgba(34, 197, 94, 0.15)",
                            borderRadius: "6px",
                            lineHeight: 1.45,
                          }}
                        >
                          {e}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: RED, marginBottom: "8px" }}>
                      <ShieldAlert size={11} strokeWidth={2} />
                      <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Risks</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {action.risks_or_caveats.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "11px",
                            color: "#a1a1aa",
                            padding: "6px 10px",
                            background: "rgba(239, 68, 68, 0.06)",
                            border: "1px solid rgba(239, 68, 68, 0.15)",
                            borderRadius: "6px",
                            lineHeight: 1.45,
                          }}
                        >
                          {r}
                        </div>
                      ))}
                      {action.risks_or_caveats.length === 0 && (
                        <div style={{ fontSize: "11px", color: "#71717a", fontStyle: "italic", padding: "6px 10px" }}>No specific risks identified.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
