import type {
  CRMRecord,
  HealthResponse,
  NBARResponse,
  PaginatedCRMRecordResponse,
} from "./types";
import { clearToken, getToken } from "./auth";

const BASE = "/api/backend";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...init,
  });

  if (res.status === 401 && !path.includes("/auth/login-json")) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function loginJson(
  email: string,
  password: string
): Promise<{ access_token: string; token_type?: string }> {
  return request<{ access_token: string; token_type?: string }>("/api/v1/auth/login-json", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export const getHealth = (): Promise<HealthResponse> =>
  request<HealthResponse>("/api/v1/health");

export const getRecords = (
  page = 1,
  pageSize = 10,
  q?: string
): Promise<PaginatedCRMRecordResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const t = q?.trim();
  if (t) params.set("q", t);
  return request<PaginatedCRMRecordResponse>(`/api/v1/records?${params.toString()}`);
};

export const createRecord = (record: CRMRecord): Promise<CRMRecord> =>
  request<CRMRecord>("/api/v1/records", { method: "POST", body: JSON.stringify(record) });

export const recommend = (
  record: CRMRecord,
  engine: "agentic" | "heuristic" = "agentic",
  forceRefresh = false
): Promise<NBARResponse> =>
  request<NBARResponse>(
    `/api/v1/recommend?engine=${engine}&force_refresh=${forceRefresh}`,
    { method: "POST", body: JSON.stringify(record) }
  );

export const recommendHeuristic = (record: CRMRecord, forceRefresh = false): Promise<NBARResponse> =>
  request<NBARResponse>(
    `/api/v1/recommend/heuristic?force_refresh=${forceRefresh}`,
    { method: "POST", body: JSON.stringify(record) }
  );

export interface SubmissionDocResponse {
  name: string;
  content: string;
  content_type?: string;
}

export interface SubmissionTestFile {
  path: string;
  content: string;
}

export interface SubmissionTestsResponse {
  files: SubmissionTestFile[];
}

export interface TestRunResponse {
  ok: boolean;
  exit_code: number;
  duration_ms: number;
  output: string;
}

export const getSubmissionReadme = (): Promise<SubmissionDocResponse> =>
  request<SubmissionDocResponse>("/api/v1/submission/readme");

export const getSubmissionAIUsage = (): Promise<SubmissionDocResponse> =>
  request<SubmissionDocResponse>("/api/v1/submission/ai-usage");

export const getSubmissionTests = (): Promise<SubmissionTestsResponse> =>
  request<SubmissionTestsResponse>("/api/v1/submission/tests");

export const runSubmissionTests = (): Promise<TestRunResponse> =>
  request<TestRunResponse>("/api/v1/submission/tests/run", { method: "POST" });
