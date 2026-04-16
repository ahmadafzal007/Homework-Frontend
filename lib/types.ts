export type DealStage =
  | "lead"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type DealPriority = "low" | "medium" | "high";

export type LastActivityType =
  | "email_sent"
  | "email_open"
  | "email_reply"
  | "call"
  | "meeting"
  | "none";

export type ActionType =
  | "send_follow_up_email"
  | "create_call_task"
  | "schedule_meeting"
  | "pause_outreach"
  | "request_more_data"
  | "escalate_to_account_executive"
  | "mark_as_low_priority";

export interface Person {
  id: string;
  name: string;
  role?: string;
  company?: string;
  industry?: string;
}

export interface Deal {
  stage: DealStage;
  deal_value: number;
  priority: DealPriority;
  expected_close_days: number;
}

export interface Activity {
  last_contact_days_ago: number;
  last_activity_type: LastActivityType;
  email_open_rate: number;
  email_reply_rate: number;
  calls_count: number;
  meetings_count: number;
}

export interface Contact {
  email?: string;
  phone?: string;
  has_email: boolean;
  has_phone: boolean;
  consent_to_contact: boolean;
}

export interface DataQuality {
  missing_fields: string[];
  profile_completeness_score: number;
}

export interface Signals {
  is_high_intent: boolean;
  is_unresponsive: boolean;
  is_decision_maker: boolean;
  engagement_score: number;
}

export interface History {
  total_interactions: number;
  days_in_pipeline: number;
}

export interface CRMRecord {
  person: Person;
  deal: Deal;
  activity: Activity;
  contact: Contact;
  data_quality: DataQuality;
  signals: Signals;
  history: History;
}

export interface NextBestAction {
  action_type: ActionType;
  title: string;
  reasoning: string;
  confidence: number;
  evidence: string[];
  risks_or_caveats: string[];
}

export interface NBARResponse {
  record_id: string;
  recommendations: NextBestAction[];
  uncertainty_note?: string;
}

export interface PaginatedCRMRecordResponse {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  invalid_items_skipped: number;
  items: CRMRecord[];
}

export interface HealthResponse {
  status: string;
  engine: string;
  data_store: string;
}

export type EngineType = "agentic" | "heuristic";

export type ViewType = 
  | "overview" 
  | "records" 
  | "analyze" 
  | "heuristic" 
  | "campaigns" 
  | "analytics" 
  | "history"
  | "readme"
  | "ai_usage"
  | "tests";