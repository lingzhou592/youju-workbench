export type ISODate = string;

export const FACT_CATEGORIES = [
  "品牌信息",
  "产品信息",
  "时间排期",
  "价格政策",
  "人群洞察",
  "体验细节",
  "交通提示",
  "服务承诺",
  "用户反馈",
] as const;

export type FactCategory = (typeof FACT_CATEGORIES)[number];

export type FactStatus = "active" | "archived";

export type FactSourceType = "模拟资料" | "官方资料" | "内部文档" | "公开资料";

export type FactCard = {
  id: string;
  title: string;
  content: string;
  category: FactCategory;
  sourceName: string;
  sourceType: FactSourceType;
  tags: string[];
  status: FactStatus;
  updatedAt: ISODate;
};

export type MandatoryPoint = {
  id: string;
  text: string;
  keywords: string[];
  match: "all" | "any";
};

export type BrandConfig = {
  name: string;
  tagline: string;
  audience: string;
  toneKeywords: string[];
  toneNote: string;
  mandatoryPoints: MandatoryPoint[];
  bannedPhrases: string[];
  writingRules: string[];
  updatedAt: ISODate;
};

export type Brief = {
  campaignName: string;
  product: string;
  goal: string;
  audience: string;
  sellingPoints: string;
  toneOverride: string;
  constraints: string;
  channel: "小红书";
};

export type BriefTemplate = {
  id: string;
  label: string;
  description: string;
  brief: Brief;
  recommendedFactIds: string[];
};

export type TitleCandidate = {
  id: "A" | "B";
  angle: string;
  title: string;
  rationale: string;
  hypothesis: string;
};

export type Citation = {
  factId: string;
  quote: string;
  usedFor?: string;
};

export type ModelUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ModelMeta = {
  model: string;
  provider: string;
  latencyMs: number;
  usage?: ModelUsage;
  at: ISODate;
  source: "live" | "mock" | "sample";
};

export type GenerationResult = {
  titles: [TitleCandidate, TitleCandidate];
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
  selfCheck: string[];
  source: "live" | "mock" | "sample";
  modelMeta?: ModelMeta;
};

export type DocumentVersion = {
  id: string;
  parentVersionId: string | null;
  candidate: "A" | "B";
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
  contentHash: string;
  source: "generation" | "candidate-switch" | "manual-edit" | "revision" | "restore";
  revisionNotes?: string[];
  createdAt: ISODate;
};

export type RuleStatus = "pass" | "warn" | "fail";

export type RuleCheck = {
  id: string;
  label: string;
  status: RuleStatus;
  detail: string;
  evidence?: string;
};

export type IssueCategory =
  | "事实依据"
  | "品牌语气"
  | "人群匹配"
  | "结构表达"
  | "合规风险"
  | "其他";

export type IssueSeverity = "error" | "warning" | "info";

export type ModelIssue = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  quote: string;
  problem: string;
  evidenceFactIds: string[];
  suggestion: string;
  confidence: "high" | "medium" | "low";
  status: "open" | "dismissed" | "resolved";
  dismissReason?: string;
};

export type ReviewRecord = {
  id: string;
  versionId: string;
  contentHash: string;
  ruleChecks: RuleCheck[];
  modelIssues: ModelIssue[] | null;
  modelError?: ApiError | null;
  ruleVersion: string;
  promptVersion: string;
  createdAt: ISODate;
};

export type ConfirmationChecklist = {
  factsAccurate: boolean;
  toneFits: boolean;
  informationComplete: boolean;
  readyToPublish: boolean;
  modelAcknowledged?: boolean;
};

export type ConfirmationRecord = {
  id: string;
  versionId: string;
  contentHash: string;
  checklist: ConfirmationChecklist;
  note: string;
  overrideReason?: string;
  createdAt: ISODate;
};

export type Run = {
  id: string;
  title: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  input: {
    brief: Brief;
    brand: BrandConfig;
    facts: FactCard[];
  };
  generation: GenerationResult;
  versions: DocumentVersion[];
  activeVersionId: string;
  reviews: ReviewRecord[];
  confirmations: ConfirmationRecord[];
  sample?: boolean;
};

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "MISSING_API_KEY"
  | "LLM_UNAUTHORIZED"
  | "LLM_RATE_LIMITED"
  | "LLM_TIMEOUT"
  | "LLM_UPSTREAM_ERROR"
  | "LLM_FORMAT_ERROR"
  | "LLM_SCHEMA_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  hint?: string;
  retryable?: boolean;
  raw?: string;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    model?: string;
    latencyMs?: number;
    usage?: ModelUsage;
    promptVersion?: string;
  };
};

export type ApiFailure = {
  ok: false;
  error: ApiError;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type GenerateResponse = {
  generation: GenerationResult;
  ruleChecks: RuleCheck[];
};

export type ReviewResponse = {
  issues: ModelIssue[];
  summary: string;
};

export type ReviseResponse = {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
  changeNotes: string[];
  unresolved: string[];
};

export type DirectResponse = {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  raw: string;
  parseWarnings: string[];
};

export type HealthResponse = {
  configured: boolean;
  model: string | null;
  baseHost: string | null;
  timeoutMs: number;
  message: string;
};

export type EvaluationSide = {
  output: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion: string[];
    raw?: string;
  };
  structureComplete: boolean;
  parseWarnings: string[];
  ruleChecks: RuleCheck[];
  passedRules: number;
  totalRules: number;
  citationValidRate: number | null;
  unsupportedNumberCount: number;
  latencyMs: number;
  modelMeta?: ModelMeta;
};

export type EvaluationHumanScores = {
  directFactual: number | null;
  workbenchFactual: number | null;
  directBrand: number | null;
  workbenchBrand: number | null;
  note: string;
};

export type EvaluationRunStatus = "complete" | "partial" | "failed";

export type EvaluationRecord = {
  id: string;
  createdAt: ISODate;
  testCaseId: string;
  testTitle: string;
  testCategory?: string;
  model: string;
  source: "live" | "mock";
  status?: EvaluationRunStatus;
  direct: EvaluationSide;
  workbench: EvaluationSide;
  human: EvaluationHumanScores;
  errors?: {
    direct?: ApiError;
    workbench?: ApiError;
  };
};

export type TestCase = {
  id: string;
  category: string;
  title: string;
  purpose: string;
  priority: "P0" | "P1";
  brief: Brief | null;
  factIds: string[];
  expected: string[];
  comparison: boolean;
  manual?: string;
  setup?: string;
};

export type AppState = {
  version: 1;
  brand: BrandConfig;
  facts: FactCard[];
  runs: Run[];
  evaluations: EvaluationRecord[];
  workbench: {
    step: WorkbenchStepId;
    brief: Brief;
    selectedFactIds: string[];
    activeRunId: string | null;
    activeCandidate: "A" | "B";
    updatedAt: ISODate;
  };
  settings: {
    demoBrand: boolean;
    startWithSample: boolean;
  };
  updatedAt: ISODate;
};

export type WorkbenchStepId = "brief" | "evidence" | "generate" | "review" | "export";

export type RuleContext = {
  version: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion?: string[];
    citations: Citation[];
  };
  brand: BrandConfig;
  brief: Brief;
  facts: FactCard[];
  titles?: [TitleCandidate, TitleCandidate];
};

export const RULE_VERSION = "rules-1.0.0";
export const PROMPT_VERSION = "prompts-1.0.0";
export const STATE_VERSION = 1;
export const STORAGE_KEY = "youju.state.v1";
