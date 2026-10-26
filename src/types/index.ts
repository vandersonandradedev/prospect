export type PipelineStage =
  | 'NEW'                // 1. Novo lead
  | 'VALIDATING'         // 2. Dados em validação
  | 'QUALIFIED'          // 3. Qualificado
  | 'READY_TO_CONTACT'   // 4. Pronto para contato
  | 'CONTACTED'          // 5. Contato realizado
  | 'RESPONDED'          // 6. Respondeu
  | 'DEMO_SCHEDULED'     // 7. Demonstração agendada
  | 'PROPOSAL_SENT'      // 8. Proposta enviada
  | 'NEGOTIATING'        // 9. Em negociação
  | 'CONVERTED'          // 10. Convertido
  | 'LOST'               // 11. Perdido
  | 'DO_NOT_CONTACT';    // 12. Não contatar / Supressão LGPD

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type DataConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'WEBSITE_VERIFIED'
  | 'PHONE_VERIFIED'
  | 'CONTACT_CONFIRMED'
  | 'FAILED_VERIFICATION';

export type LeadSource =
  | 'GMAPS_SCRAPER_KIT'
  | 'GOOGLE_PLACES_API'
  | 'OPENSTREETMAP_OVERPASS'
  | 'BRASIL_API_CNPJ'
  | 'MANUAL_ENTRY';

export interface RawBusinessLead {
  externalId: string;
  name: string;
  category: string;
  address?: string | null;
  city: string;
  state: string;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  source: LeadSource;
  sourceUrl?: string | null;
}

export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED'
  | 'CANCELLED';

export interface Product {
  id: string;
  name: string;           // MesaGo | TorqueOS | Software Fiscal
  slug: string;
  description: string;
  targetSegments: string[]; // ['Hamburgueria', 'Pizzaria', ...]
  keyFeatures: string[];
}

export interface LeadEvidence {
  id: string;
  category: string;       // 'CARDAPIO_DIGITAL' | 'PEDIDOS_ONLINE' | 'OFICINA_SERVICOS' | 'WEBSITE_ATIVO' | 'TELEFONE_PUBLICADO'
  description: string;    // Fato observável comprovado
  evidenceUrl?: string | null;
  detectedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'NOTE' | 'PHONE_CALL' | 'WHATSAPP_SENT' | 'EMAIL_SENT' | 'STAGE_CHANGE' | 'STATUS_UPDATE';
  title: string;
  description: string;
  createdAt: string;
  operatorName?: string;
}

export interface LeadStageHistory {
  id: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  reason?: string | null;
  changedAt: string;
}

export interface AiAnalysisResult {
  summary: string;
  suggestedProduct: string;
  observedFacts: string[];
  unconfirmedHypotheses: string[];
  confidenceLevel: DataConfidence;
  pitch: string;
  diagnosticQuestions: string[];
  nextAction: string;
  missingInformation: string[];
  generatedAt: string;
}

export interface BusinessLead {
  id: string;
  name: string;                   // Nome comercial verificado
  legalName?: string | null;      // Razão Social (quando disponível)
  cnpj?: string | null;           // CNPJ formatado
  category: string;               // Categoria empresarial observada
  productId: string;              // MesaGo | TorqueOS | Software Fiscal
  productName: string;
  address?: string | null;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;          // Telefone comercial publicado
  website?: string | null;        // Site oficial verificado
  email?: string | null;          // E-mail comercial verificado
  rating?: number | null;         // Avaliação observada
  reviewsCount?: number | null;   // Quantidade de avaliações
  source: LeadSource;
  sourceUrl?: string | null;
  sourceExternalId?: string | null;
  collectionJobId?: string | null;
  dataConfidence: DataConfidence;
  verificationStatus: VerificationStatus;
  pipelineStage: PipelineStage;
  priority: PriorityLevel;
  score: number;
  scoreFactors: string[];
  firstCollectedAt: string;
  lastVerifiedAt: string;
  notes?: string | null;
  evidences: LeadEvidence[];
  activities: LeadActivity[];
  stageHistory: LeadStageHistory[];
  aiAnalysis?: AiAnalysisResult | null;
}

export interface CollectionJob {
  id: string;
  provider: LeadSource;
  searchQuery: string;
  targetProduct: string;
  targetCategory: string;
  targetCity: string;
  targetState: string;
  maxResults: number;
  status: JobStatus;
  itemsFound: number;
  itemsImported: number;
  errorMessage?: string | null;
  warningMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}

export interface SuppressionEntry {
  id: string;
  identifier: string; // Telefone normalizado, domínio ou e-mail
  type: 'PHONE' | 'EMAIL' | 'DOMAIN';
  reason: string;
  suppressedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

export interface SearchParams {
  productId?: string;
  category: string;
  city: string;
  state: string;
  maxResults?: number;
  provider?: LeadSource;
}

export interface DashboardMetrics {
  totalFound: number;
  uniqueLeads: number;
  qualifiedLeads: number;
  leadsWithPhone: number;
  leadsWithWebsite: number;
  leadsAwaitingReview: number;
  contactsMade: number;
  responsesReceived: number;
  demosScheduled: number;
  proposalsSent: number;
  convertedClients: number;
  conversionRate: number;
  byProduct: Record<string, number>;
  byStage: Record<string, number>;
  byCity: Record<string, number>;
  bySource: Record<string, number>;
  failedJobsCount: number;
}
