"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "@/components/Sidebar";
import LoginPage from "@/components/LoginPage";
import CRMForm from "@/components/CRMForm";
import RecommendationCard from "@/components/RecommendationCard";
import {
  getHealth,
  getRecords,
  recommend,
  recommendHeuristic,
  getSubmissionAIUsage,
  getSubmissionReadme,
  getSubmissionTests,
  runSubmissionTests,
} from "@/lib/api";
import { clearToken, getToken, isTokenValid, setToken } from "@/lib/auth";
import type { CRMRecord, HealthResponse, NBARResponse, ViewType } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const CUSTOMER_SEARCH_DEBOUNCE_MS = 320;


function recordMatchesCustomerSearch(r: CRMRecord, q: string): boolean {
  const ql = q.trim().toLowerCase();
  if (!ql) return true;
  const blob = [
    r.person.id,
    r.person.name,
    r.person.role,
    r.person.company,
    r.person.industry,
    r.deal.stage,
    r.contact.email,
    r.contact.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(ql);
}

function MarkdownView({ value }: { value: string }) {
  return (
    <div className="submission-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }: any) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

function CircleLoader({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="spin"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      role="img"
      aria-label="Loading"
      style={{ borderRadius: "50%" }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.12)" strokeLinecap="round" />
      <path d="M12 2C6.477 2 2 6.477 2 12" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms)) return `${ms}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

type PytestCountKey =
  | "passed"
  | "failed"
  | "skipped"
  | "errors"
  | "xfailed"
  | "xpassed"
  | "deselected"
  | "warnings";

type PytestCounts = Partial<Record<PytestCountKey, number>>;

function parsePytestOutput(output: string): {
  counts: PytestCounts;
  failures: Array<{ nodeid: string; message: string | null }>;
  errors: Array<{ nodeid: string; message: string | null }>;
  summaryLine: string | null;
} {
  const counts: PytestCounts = {};
  const failures: Array<{ nodeid: string; message: string | null }> = [];
  const errors: Array<{ nodeid: string; message: string | null }> = [];
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    const mFail = /^FAILED\s+([^\s]+)(?:\s+-\s+(.*))?$/.exec(line);
    if (mFail) {
      failures.push({ nodeid: mFail[1], message: mFail[2] ?? null });
      continue;
    }

    const mErr = /^ERROR\s+([^\s]+)(?:\s+-\s+(.*))?$/.exec(line);
    if (mErr) {
      errors.push({ nodeid: mErr[1], message: mErr[2] ?? null });
      continue;
    }
  }

  let summaryLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (!l) continue;
    if (
      /(?:\d+\s+passed|\d+\s+failed|\d+\s+skipped|\d+\s+error|\d+\s+errors|\d+\s+xfailed|\d+\s+xpassed|\d+\s+deselected|\d+\s+warnings)/.test(
        l
      )
    ) {
      summaryLine = l;
      break;
    }
  }

  if (summaryLine) {
    const re = /(\d+)\s+(passed|failed|skipped|error|errors|xfailed|xpassed|deselected|warnings)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(summaryLine)) !== null) {
      const n = parseInt(match[1], 10);
      const rawKey = match[2];
      const key = (rawKey === "error" ? "errors" : rawKey) as PytestCountKey;
      counts[key] = n;
    }
  }

  return { counts, failures, errors, summaryLine };
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token && isTokenValid());
    setAuthReady(true);
  }, []);

  const handleLoginSuccess = useCallback((accessToken: string) => {
    setToken(accessToken);
    setAuthed(true);
  }, []);

  const handleSignOut = useCallback(() => {
    clearToken();
    setAuthed(false);
  }, []);

  if (!authReady) {
    return <div className="min-h-screen bg-[#060608]" aria-hidden />;
  }

  if (!authed) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return <Dashboard onSignOut={handleSignOut} />;
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [view, setView] = useState<ViewType>("overview");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  }, []);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<CRMRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsErr, setRecordsErr] = useState<string | null>(null);
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [recordsRemoteQuery, setRecordsRemoteQuery] = useState<string | null>(null);
  const [recordsLocalOnly, setRecordsLocalOnly] = useState<CRMRecord[] | null>(null);
  const debouncedCustomerSearchInput = useDebouncedValue(customerSearchInput, CUSTOMER_SEARCH_DEBOUNCE_MS);
  const recordsRef = useRef(records);
  recordsRef.current = records;

  const [selectedRecord, setSelectedRecord] = useState<CRMRecord | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CRMRecord | null>(null);

  // Per-engine, per-record frontend caches. Keeping these separate guarantees
  // the AI Engine view only ever renders agentic results and the Rank Engine
  // view only ever renders heuristic results, and that navigating back to a
  // customer already analyzed shows the prior result instantly without a
  // refetch. They also mirror the server-side separation that the backend
  // uses (agentic_<id> vs heuristic_<id> cache keys).
  const [agenticCache, setAgenticCache] = useState<Record<string, NBARResponse>>({});
  const [heuristicCache, setHeuristicCache] = useState<Record<string, NBARResponse>>({});
  const [agenticLoadingId, setAgenticLoadingId] = useState<string | null>(null);
  const [heuristicLoadingId, setHeuristicLoadingId] = useState<string | null>(null);
  const [agenticErrors, setAgenticErrors] = useState<Record<string, string>>({});
  const [heuristicErrors, setHeuristicErrors] = useState<Record<string, string>>({});

  const currentRecordId = selectedRecord?.person.id ?? null;
  const agenticResult = currentRecordId ? agenticCache[currentRecordId] ?? null : null;
  const heuristicResult = currentRecordId ? heuristicCache[currentRecordId] ?? null : null;
  const agenticLoading = currentRecordId !== null && agenticLoadingId === currentRecordId;
  const heuristicLoading = currentRecordId !== null && heuristicLoadingId === currentRecordId;
  const agenticErr = currentRecordId ? agenticErrors[currentRecordId] ?? null : null;
  const heuristicErr = currentRecordId ? heuristicErrors[currentRecordId] ?? null : null;

  const [readmeMd, setReadmeMd] = useState<string | null>(null);
  const [aiUsageMd, setAiUsageMd] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState<string | null>(null);

  const [testFiles, setTestFiles] = useState<Array<{ path: string; content: string }> | null>(null);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsErr, setTestsErr] = useState<string | null>(null);
  const [selectedTestPath, setSelectedTestPath] = useState<string | null>(null);

  const [testRunResult, setTestRunResult] = useState<{
    ok: boolean;
    exit_code: number;
    duration_ms: number;
    output: string;
  } | null>(null);
  const [testRunLoading, setTestRunLoading] = useState(false);
  const [testRunErr, setTestRunErr] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: Error) => setHealthErr(e.message));
  }, []);

  const loadRecords = useCallback(async (p: number, search?: string | null) => {
    setRecordsLoading(true);
    setRecordsErr(null);
    try {
      const res = await getRecords(p, 10, search && search.length > 0 ? search : undefined);
      setRecords(res.items);
      setTotalPages(res.total_pages || 1);
      setPage(res.page);
    } catch (e: unknown) {
      setRecordsErr(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== "records") {
      setCustomerSearchInput("");
      setRecordsRemoteQuery(null);
      setRecordsLocalOnly(null);
      setPage(1);
    }
  }, [view]);

  useEffect(() => {
    if (view !== "records") return;
    if (recordsLocalOnly !== null) return;
    void loadRecords(page, recordsRemoteQuery);
  }, [view, page, recordsRemoteQuery, recordsLocalOnly, loadRecords]);

  /** Clear filters immediately when the user empties the field (no debounce). */
  useEffect(() => {
    if (view !== "records") return;
    if (customerSearchInput.trim() !== "") return;
    setRecordsLocalOnly(null);
    setRecordsRemoteQuery(null);
    setPage(1);
  }, [customerSearchInput, view]);

  /**
   * Debounced search: local-first against the current `records` snapshot when not already
   * in remote mode; otherwise query the API. `recordsRef` avoids tying this to fetch updates.
   * Skips if the box was cleared but debounce has not caught up yet.
   */
  useEffect(() => {
    if (view !== "records") return;
    const q = debouncedCustomerSearchInput.trim();
    if (q === "") return;
    if (customerSearchInput.trim() === "") return;

    if (recordsRemoteQuery === null) {
      const local = recordsRef.current.filter((r) => recordMatchesCustomerSearch(r, q));
      if (local.length > 0) {
        setRecordsLocalOnly(local);
        setRecordsRemoteQuery(null);
        return;
      }
    }

    setRecordsLocalOnly(null);
    setRecordsRemoteQuery(q);
    setPage(1);
  }, [debouncedCustomerSearchInput, customerSearchInput, view, recordsRemoteQuery]);

  const runAgentic = async (rec: CRMRecord) => {
    const recordId = rec.person.id;
    setAgenticLoadingId(recordId);
    setAgenticErrors((prev) => {
      if (!(recordId in prev)) return prev;
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    try {
      const out = await recommend(rec, "agentic", false);
      setAgenticCache((c) => ({ ...c, [recordId]: out }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setAgenticErrors((prev) => ({ ...prev, [recordId]: msg }));
    } finally {
      setAgenticLoadingId((prev) => (prev === recordId ? null : prev));
    }
  };

  const runHeuristic = async (rec: CRMRecord) => {
    const recordId = rec.person.id;
    setHeuristicLoadingId(recordId);
    setHeuristicErrors((prev) => {
      if (!(recordId in prev)) return prev;
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    try {
      const out = await recommendHeuristic(rec, false);
      setHeuristicCache((c) => ({ ...c, [recordId]: out }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setHeuristicErrors((prev) => ({ ...prev, [recordId]: msg }));
    } finally {
      setHeuristicLoadingId((prev) => (prev === recordId ? null : prev));
    }
  };

  const loadReadme = useCallback(async (force = false) => {
    if (!force && readmeMd !== null) return;
    setDocsLoading(true);
    setDocsErr(null);
    try {
      const res = await getSubmissionReadme();
      setReadmeMd(res.content);
    } catch (e: unknown) {
      setDocsErr(e instanceof Error ? e.message : "Failed to load README");
    } finally {
      setDocsLoading(false);
    }
  }, [readmeMd]);

  const loadAIUsage = useCallback(async (force = false) => {
    if (!force && aiUsageMd !== null) return;
    setDocsLoading(true);
    setDocsErr(null);
    try {
      const res = await getSubmissionAIUsage();
      setAiUsageMd(res.content);
    } catch (e: unknown) {
      setDocsErr(e instanceof Error ? e.message : "Failed to load AI usage");
    } finally {
      setDocsLoading(false);
    }
  }, [aiUsageMd]);

  const loadTests = useCallback(async (force = false) => {
    if (!force && testFiles !== null) return;
    setTestsLoading(true);
    setTestsErr(null);
    try {
      const res = await getSubmissionTests();
      setTestFiles(res.files);
      if (!selectedTestPath && res.files.length > 0) {
        setSelectedTestPath(res.files[0].path);
      }
    } catch (e: unknown) {
      setTestsErr(e instanceof Error ? e.message : "Failed to load tests");
    } finally {
      setTestsLoading(false);
    }
  }, [testFiles, selectedTestPath]);

  const runTests = useCallback(async () => {
    setTestRunLoading(true);
    setTestRunErr(null);
    setTestRunResult(null);
    try {
      const res = await runSubmissionTests();
      setTestRunResult(res);
    } catch (e: unknown) {
      setTestRunErr(e instanceof Error ? e.message : "Failed to run tests");
    } finally {
      setTestRunLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "readme" && readmeMd === null && !docsLoading) {
      void loadReadme();
    }
    if (view === "ai_usage" && aiUsageMd === null && !docsLoading) {
      void loadAIUsage();
    }
    if (view === "tests" && testFiles === null && !testsLoading) {
      void loadTests();
    }
  }, [view, readmeMd, aiUsageMd, testFiles, docsLoading, testsLoading, loadReadme, loadAIUsage, loadTests]);

  const rootClass = `app-root${isCollapsed ? " sidebar-collapsed" : ""}`;
  const displayRecords = recordsLocalOnly ?? records;
  const parsedTestRun = testRunResult ? parsePytestOutput(testRunResult.output || "") : null;
  const testDurationLabel = testRunResult ? formatDurationMs(testRunResult.duration_ms) : null;

  // Add mobile overlay to close sidebar if clicking outside
  const MobileOverlay = (
    <div
      className={`mobile-overlay ${!isCollapsed ? "active" : ""}`}
      onClick={() => setIsCollapsed(true)}
    />
  );

  // Mobile header with hamburger
  const MobileHeader = (
    <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-zinc-800/80 mb-6 sticky top-0 bg-[#040406] z-30">
      <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
      <button
        onClick={() => setIsCollapsed(false)}
        className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 text-zinc-300"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>
  );

  return (
    <div className={rootClass}>
      {MobileOverlay}
      <Sidebar
        view={view}
        setView={setView}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((c) => !c)}
        selectedRecord={selectedRecord}
        onSignOut={onSignOut}
      />

      <main className="app-main">
        {MobileHeader}
        <div className="app-main-inner view-root">
          <AnimatePresence mode="wait">
            {view === "overview" && (
              <motion.section
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="view-header"
              >
                <h1 className="view-title font-(family-name:--font-space)">Overview</h1>
                <p className="view-subtitle">Engine status and pipeline snapshot</p>
                <div
                  className="stat-card mt-8"
                  style={{ maxWidth: 480, display: "flex", alignItems: "center", gap: 16 }}
                >
                  <div
                    className={`status-pill ${health ? "status-ok" : healthErr ? "status-error" : "status-loading"}`}
                  >
                    <span className="status-dot" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {health
                        ? `API · ${health.status} · ${health.data_store}`
                        : healthErr
                          ? healthErr
                          : "Checking…"}
                    </span>
                  </div>
                </div>
                <div className="overview-engine-grid">
                  <div className="overview-engine-card">
                    <div className="overview-engine-title">
                      AI Engine (Agentic)
                    </div>
                    <p className="overview-engine-body">
                      Sends the selected CRM record to <code>/api/v1/recommend?engine=agentic</code> in the backend.
                      The service runs an agentic reasoning workflow (LangGraph + Gemini), evaluates engagement, stage,
                      and contact signals, then returns ranked next-best actions with confidence, evidence, and caveats.
                    </p>
                  </div>
                  <div className="overview-engine-card">
                    <div className="overview-engine-title">
                      Rank Engine (Rule-Based)
                    </div>
                    <p className="overview-engine-body">
                      Calls <code>/api/v1/recommend/heuristic</code> in the backend. This path uses deterministic scoring
                      rules (no LLM reasoning) to rank recommendations from CRM features consistently. It is faster and
                      reproducible, ideal when predictable ranking behavior is required.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {view === "records" && (
              <motion.section
                key="records"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">Customers</h1>
                  <p className="view-subtitle">Browse CRM records and select one for analysis</p>
                </div>
                <div className="records-search-row">
                  <input
                    type="search"
                    className="input-field records-search-input"
                    placeholder="Search name, company, ID, stage, email…"
                    value={customerSearchInput}
                    onChange={(e) => setCustomerSearchInput(e.target.value)}
                    aria-label="Search customers"
                  />
                  {customerSearchInput.length > 0 && (
                    <button
                      type="button"
                      className="pagination-btn records-search-clear"
                      onClick={() => setCustomerSearchInput("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {recordsLocalOnly !== null && (
                  <p className="records-search-hint">
                    Showing {recordsLocalOnly.length} match{recordsLocalOnly.length === 1 ? "" : "es"} on this page
                    (current page only). Clear the field to show the full list again.
                  </p>
                )}
                {recordsRemoteQuery && recordsLocalOnly === null && (
                  <p className="records-search-hint">Database results for &quot;{recordsRemoteQuery}&quot;.</p>
                )}
                {recordsErr && <p className="dashboard-alert-error">{recordsErr}</p>}
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Stage</th>
                        <th>Value</th>
                        <th>View</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {recordsLoading ? (
                        <tr>
                          <td colSpan={6} style={{ color: "#71717a", padding: 24 }}>
                            Loading...
                          </td>
                        </tr>
                      ) : (
                        displayRecords.map((r) => (
                          <tr key={r.person.id}>
                            <td>{r.person.name}</td>
                            <td>{r.person.company ?? "-"}</td>
                            <td>{r.deal.stage}</td>
                            <td>${r.deal.deal_value.toLocaleString()}</td>
                            <td>
                              <button
                                type="button"
                                className="customer-view-btn"
                                title="View details"
                                aria-label={`View details for ${r.person.name}`}
                                onClick={() => setCustomerDetail(r)}
                              >
                                <Search size={14} strokeWidth={2} />
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: "8px 14px", fontSize: 11 }}
                                onClick={() => {
                                  setSelectedRecord(r);
                                  setView("analyze");
                                }}
                              >
                                Analyze
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {customerDetail && (
                  <div
                    className="customer-detail-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="customer-detail-title"
                    onClick={() => setCustomerDetail(null)}
                  >
                    <div className="customer-detail-sheet" onClick={(e) => e.stopPropagation()}>
                      <div className="customer-detail-header">
                        <h2 id="customer-detail-title" className="customer-detail-sheet-title">
                          {customerDetail.person.name}
                        </h2>
                        <button
                          type="button"
                          className="pagination-btn"
                          aria-label="Close details"
                          onClick={() => setCustomerDetail(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="customer-detail-meta">{customerDetail.person.id}</p>

                      <h3 className="customer-detail-section-title">Person</h3>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Role</span>
                        <span className="customer-detail-v">{customerDetail.person.role ?? "-"}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Company</span>
                        <span className="customer-detail-v">{customerDetail.person.company ?? "-"}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Industry</span>
                        <span className="customer-detail-v">{customerDetail.person.industry ?? "-"}</span>
                      </div>

                      <h3 className="customer-detail-section-title">Deal</h3>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Stage</span>
                        <span className="customer-detail-v">{customerDetail.deal.stage}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Value</span>
                        <span className="customer-detail-v">${customerDetail.deal.deal_value.toLocaleString()}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Priority</span>
                        <span className="customer-detail-v">{customerDetail.deal.priority}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Est. days to close</span>
                        <span className="customer-detail-v">{customerDetail.deal.expected_close_days}</span>
                      </div>

                      <h3 className="customer-detail-section-title">Activity</h3>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Last contact</span>
                        <span className="customer-detail-v">{customerDetail.activity.last_contact_days_ago} days ago</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Last activity</span>
                        <span className="customer-detail-v">{customerDetail.activity.last_activity_type}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Email open / reply</span>
                        <span className="customer-detail-v">
                          {Math.round(customerDetail.activity.email_open_rate * 100)}% /{" "}
                          {Math.round(customerDetail.activity.email_reply_rate * 100)}%
                        </span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Calls / meetings</span>
                        <span className="customer-detail-v">
                          {customerDetail.activity.calls_count} / {customerDetail.activity.meetings_count}
                        </span>
                      </div>

                      <h3 className="customer-detail-section-title">Contact</h3>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Email</span>
                        <span className="customer-detail-v">{customerDetail.contact.email ?? "-"}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Phone</span>
                        <span className="customer-detail-v">{customerDetail.contact.phone ?? "-"}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Consent</span>
                        <span className="customer-detail-v">{customerDetail.contact.consent_to_contact ? "Yes" : "No"}</span>
                      </div>

                      <h3 className="customer-detail-section-title">Signals & history</h3>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Engagement</span>
                        <span className="customer-detail-v">{customerDetail.signals.engagement_score}</span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Flags</span>
                        <span className="customer-detail-v">
                          {[
                            customerDetail.signals.is_high_intent && "high intent",
                            customerDetail.signals.is_unresponsive && "unresponsive",
                            customerDetail.signals.is_decision_maker && "decision maker",
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Profile completeness</span>
                        <span className="customer-detail-v">
                          {Math.round(customerDetail.data_quality.profile_completeness_score * 100)}%
                        </span>
                      </div>
                      <div className="customer-detail-row">
                        <span className="customer-detail-k">Interactions / days in pipeline</span>
                        <span className="customer-detail-v">
                          {customerDetail.history.total_interactions} / {customerDetail.history.days_in_pipeline}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {recordsLocalOnly === null && totalPages > 1 && (
                  <div className="records-pagination">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="records-pagination-label">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </motion.section>
            )}

            {view === "analyze" && (
              <motion.section
                key="analyze"
                className="engine-view-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">AI Engine</h1>
                  <p className="view-subtitle">Agentic recommendations (LangGraph + Gemini)</p>
                </div>
                <div className="engine-split">
                  <div className="engine-form-panel">
                    <div className="engine-panel-title">Input Profile</div>
                    <div className="engine-panel-body-scroll">
                      <CRMForm
                        initialRecord={selectedRecord}
                        onSubmit={runAgentic}
                        loading={agenticLoading}
                        submitLabel="Run agentic analysis"
                      />
                    </div>
                  </div>
                  <div className="engine-results-panel">
                    <div className="engine-panel-title">Ranked Recommendations</div>
                    <div className="engine-panel-body-scroll">
                      {agenticErr && <p className="dashboard-alert-error">{agenticErr}</p>}
                      {agenticResult?.uncertainty_note && (
                        <div className="engine-uncertainty-note" role="note">
                          <span className="engine-uncertainty-label">Note</span>
                          <span className="engine-uncertainty-text">{agenticResult.uncertainty_note}</span>
                        </div>
                      )}
                      {agenticResult?.recommendations.map((a, i) => (
                        <RecommendationCard key={`agentic-${a.action_type}-${i}`} action={a} rank={i + 1} />
                      ))}
                      {!agenticErr && !agenticLoading && !agenticResult && (
                        <div className="engine-empty-state">
                          Submit a customer profile to generate ranked AI recommendations.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {view === "heuristic" && (
              <motion.section
                key="heuristic"
                className="engine-view-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">Rank Engine</h1>
                  <p className="view-subtitle">Deterministic rule-based ranked recommendations</p>
                </div>
                <div className="engine-split">
                  <div className="engine-form-panel">
                    <div className="engine-panel-title">Input Profile</div>
                    <div className="engine-panel-body-scroll">
                      <CRMForm
                        initialRecord={selectedRecord}
                        onSubmit={runHeuristic}
                        loading={heuristicLoading}
                        submitLabel="Run rule-based analysis"
                      />
                    </div>
                  </div>
                  <div className="engine-results-panel">
                    <div className="engine-panel-title">Ranked Recommendations</div>
                    <div className="engine-panel-body-scroll">
                      {heuristicErr && <p className="dashboard-alert-error">{heuristicErr}</p>}
                      {heuristicResult?.uncertainty_note && (
                        <div className="engine-uncertainty-note" role="note">
                          <span className="engine-uncertainty-label">Note</span>
                          <span className="engine-uncertainty-text">{heuristicResult.uncertainty_note}</span>
                        </div>
                      )}
                      {heuristicResult?.recommendations.map((a, i) => (
                        <RecommendationCard key={`heuristic-${a.action_type}-${i}`} action={a} rank={i + 1} />
                      ))}
                      {!heuristicErr && !heuristicLoading && !heuristicResult && (
                        <div className="engine-empty-state">
                          Submit a customer profile to generate deterministic ranked recommendations.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {view === "readme" && (
              <motion.section
                key="readme"
                className="engine-view-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">README</h1>
                  <p className="view-subtitle">Submission document (README.md)</p>
                </div>

                <div className="engine-results-panel">
                  <div className="submission-panel-header">
                    <div className="engine-panel-title">README.md</div>
                    <button
                      type="button"
                      className="pagination-btn"
                      style={{ width: "auto", padding: "0 10px" }}
                      onClick={() => void loadReadme(true)}
                      disabled={docsLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="engine-panel-body-scroll">
                    {docsErr && <p className="dashboard-alert-error">{docsErr}</p>}
                    {docsLoading && !readmeMd && (
                      <div className="engine-empty-state">Loading README…</div>
                    )}
                    {!docsLoading && !docsErr && !readmeMd && (
                      <div className="engine-empty-state">README could not be loaded.</div>
                    )}
                    {readmeMd && <MarkdownView value={readmeMd} />}
                  </div>
                </div>
              </motion.section>
            )}

            {view === "ai_usage" && (
              <motion.section
                key="ai_usage"
                className="engine-view-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">AI Usage</h1>
                  <p className="view-subtitle">Submission document (AI_USAGE.md)</p>
                </div>

                <div className="engine-results-panel">
                  <div className="submission-panel-header">
                    <div className="engine-panel-title">AI_USAGE.md</div>
                    <button
                      type="button"
                      className="pagination-btn"
                      style={{ width: "auto", padding: "0 10px" }}
                      onClick={() => void loadAIUsage(true)}
                      disabled={docsLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="engine-panel-body-scroll">
                    {docsErr && <p className="dashboard-alert-error">{docsErr}</p>}
                    {docsLoading && !aiUsageMd && (
                      <div className="engine-empty-state">Loading AI_USAGE…</div>
                    )}
                    {!docsLoading && !docsErr && !aiUsageMd && (
                      <div className="engine-empty-state">AI_USAGE could not be loaded.</div>
                    )}
                    {aiUsageMd && <MarkdownView value={aiUsageMd} />}
                  </div>
                </div>
              </motion.section>
            )}

            {view === "tests" && (
              <motion.section
                key="tests"
                className="engine-view-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="view-header">
                  <h1 className="view-title font-(family-name:--font-space)">Tests</h1>
                  <p className="view-subtitle">View test files and run pytest from the backend</p>
                </div>

                <div className="engine-split">
                  <div className="engine-form-panel">
                    <div className="submission-panel-header">
                      <div className="engine-panel-title">Test files</div>
                      <button
                        type="button"
                        className="pagination-btn"
                        style={{ width: "auto", padding: "0 10px" }}
                        onClick={() => void loadTests(true)}
                        disabled={testsLoading}
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="engine-panel-body-scroll">
                      {testsErr && <p className="dashboard-alert-error">{testsErr}</p>}
                      {testsLoading && !testFiles && (
                        <div className="submission-center-loader" role="status" aria-label="Loading tests">
                          <CircleLoader size={40} />
                        </div>
                      )}
                      {!testsLoading && !testsErr && testFiles?.length === 0 && (
                        <div className="engine-empty-state">No test files found.</div>
                      )}

                      {testFiles && testFiles.length > 0 && (
                        <>
                          <div
                            className="submission-file-tabs"
                            role="tablist"
                            aria-label="Test files"
                          >
                            {testFiles.map((f) => {
                              const label = f.path.split("/").pop() ?? f.path;
                              const active = selectedTestPath === f.path;
                              return (
                                <button
                                  key={f.path}
                                  type="button"
                                  onClick={() => setSelectedTestPath(f.path)}
                                  className={`submission-file-tab ${active ? "active" : ""}`}
                                  role="tab"
                                  aria-selected={active}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          <pre className="submission-pre submission-pre-code">
                            {testFiles.find((f) => f.path === selectedTestPath)?.content ?? ""}
                          </pre>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="engine-results-panel">
                    <div className="submission-panel-header">
                      <div className="engine-panel-title">Run tests</div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: "10px 16px", fontSize: 11 }}
                        onClick={() => void runTests()}
                        disabled={testRunLoading}
                      >
                        {testRunLoading ? "Running…" : "Run pytest"}
                      </button>
                    </div>

                    <div className="engine-panel-body-scroll">
                      {testRunErr && <p className="dashboard-alert-error">{testRunErr}</p>}

                      {testRunLoading ? (
                        <div className="submission-center-loader" role="status" aria-label="Running tests">
                          <CircleLoader size={44} />
                        </div>
                      ) : testRunResult ? (
                        <div className="submission-test-results">
                          <div className="submission-test-summary">
                            <div
                              className={`status-pill ${testRunResult.ok ? "status-ok" : "status-error"}`}
                              style={{ marginBottom: 0 }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 700 }}>
                                {testRunResult.ok ? "Passed" : "Failed"}
                              </span>
                            </div>

                            <div className="submission-test-meta">
                              <div className="submission-test-meta-item">
                                <span className="submission-test-meta-k">Exit</span>
                                <span className="submission-test-meta-v">{testRunResult.exit_code}</span>
                              </div>
                              <div className="submission-test-meta-item">
                                <span className="submission-test-meta-k">Duration</span>
                                <span className="submission-test-meta-v">
                                  {testDurationLabel ?? `${Math.round(testRunResult.duration_ms)}ms`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {parsedTestRun && (
                            <div className="submission-test-metrics" aria-label="Test summary">
                              {parsedTestRun.counts.passed !== undefined && (
                                <div className="submission-test-metric ok">
                                  <div className="submission-test-metric-k">Passed</div>
                                  <div className="submission-test-metric-v">{parsedTestRun.counts.passed}</div>
                                </div>
                              )}
                              {parsedTestRun.counts.failed !== undefined && (
                                <div className="submission-test-metric error">
                                  <div className="submission-test-metric-k">Failed</div>
                                  <div className="submission-test-metric-v">{parsedTestRun.counts.failed}</div>
                                </div>
                              )}
                              {parsedTestRun.counts.errors !== undefined && (
                                <div className="submission-test-metric error">
                                  <div className="submission-test-metric-k">Errors</div>
                                  <div className="submission-test-metric-v">{parsedTestRun.counts.errors}</div>
                                </div>
                              )}
                              {parsedTestRun.counts.skipped !== undefined && (
                                <div className="submission-test-metric muted">
                                  <div className="submission-test-metric-k">Skipped</div>
                                  <div className="submission-test-metric-v">{parsedTestRun.counts.skipped}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {parsedTestRun && (parsedTestRun.failures.length > 0 || parsedTestRun.errors.length > 0) && (
                            <div className="submission-test-section">
                              <div className="submission-test-section-title">Failures</div>
                              <div className="submission-test-list">
                                {parsedTestRun.failures.map((f) => (
                                  <div key={`fail:${f.nodeid}`} className="submission-test-row">
                                    <div className="submission-test-nodeid">{f.nodeid}</div>
                                    <div className="submission-test-message">{f.message ?? ""}</div>
                                  </div>
                                ))}
                                {parsedTestRun.errors.map((e) => (
                                  <div key={`err:${e.nodeid}`} className="submission-test-row">
                                    <div className="submission-test-nodeid">{e.nodeid}</div>
                                    <div className="submission-test-message">{e.message ?? ""}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <details className="submission-details" open={!testRunResult.ok}>
                            <summary>Raw logs</summary>
                            <pre className="submission-pre submission-pre-output">
                              {testRunResult.output || "(no output)"}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <div className="engine-empty-state">Run pytest to see results from the backend.</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
