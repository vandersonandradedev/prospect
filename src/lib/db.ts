import fs from 'fs';
import path from 'path';
import {
  BusinessLead,
  CollectionJob,
  Product,
  SuppressionEntry,
  AuditLogEntry,
  DashboardMetrics,
  PipelineStage,
} from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/constants/products';

interface DatabaseSchema {
  products: Product[];
  leads: BusinessLead[];
  jobs: CollectionJob[];
  suppressionList: SuppressionEntry[];
  auditLogs: AuditLogEntry[];
  evolutionConfig?: {
    serverUrl?: string;
    apiKey?: string;
    instanceName?: string;
  };
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'leads_database.json');
const SEED_FILE = path.join(process.cwd(), 'data', 'leads_database.json');

let memoryDb: DatabaseSchema | null = null;

function ensureDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      if (fs.existsSync(SEED_FILE)) {
        try {
          const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
          const seedData = JSON.parse(seedContent) as DatabaseSchema;
          memoryDb = seedData;
          try {
            fs.writeFileSync(DB_FILE, seedContent, 'utf-8');
          } catch (writeErr) {
            console.warn('Não foi possível gravar no disco, operando em memória:', writeErr);
          }
          return seedData;
        } catch (seedErr) {
          console.warn('Falha ao ler arquivo semente:', seedErr);
        }
      }

      const initialData: DatabaseSchema = {
        products: INITIAL_PRODUCTS,
        leads: [],
        jobs: [],
        suppressionList: [],
        auditLogs: [
          {
            id: 'log-init',
            action: 'SYSTEM_INITIALIZED',
            resource: 'DATABASE',
            details: 'Banco de dados operacional inicializado.',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('Não foi possível gravar no disco, operando em memória:', writeErr);
      }
      memoryDb = initialData;
      return initialData;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw) as DatabaseSchema;
    if (!data.products || data.products.length === 0) {
      data.products = INITIAL_PRODUCTS;
      saveDatabase(data);
    }
    memoryDb = data;
    return data;
  } catch (error) {
    console.error('Falha ao ler banco de dados. Usando memória/fallback limpo.', error);
    const fallback: DatabaseSchema = {
      products: INITIAL_PRODUCTS,
      leads: [],
      jobs: [],
      suppressionList: [],
      auditLogs: [],
    };
    memoryDb = fallback;
    return fallback;
  }
}

function saveDatabase(data: DatabaseSchema): void {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Não foi possível persistir no disco (usando memória):', err);
  }
}

// LEADS
export function getLeads(filters?: {
  productId?: string;
  stage?: PipelineStage;
  city?: string;
  state?: string;
  search?: string;
}): BusinessLead[] {
  const db = ensureDatabase();
  let list = db.leads;

  if (filters?.productId) {
    list = list.filter((l) => l.productId === filters.productId);
  }
  if (filters?.stage) {
    list = list.filter((l) => l.pipelineStage === filters.stage);
  }
  if (filters?.city) {
    list = list.filter((l) => l.city.toLowerCase() === filters.city!.toLowerCase());
  }
  if (filters?.state) {
    list = list.filter((l) => l.state.toLowerCase() === filters.state!.toLowerCase());
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        (l.phone && l.phone.includes(term)) ||
        (l.category && l.category.toLowerCase().includes(term)) ||
        (l.website && l.website.toLowerCase().includes(term))
    );
  }

  return list;
}

export function getLeadById(id: string): BusinessLead | null {
  const db = ensureDatabase();
  return db.leads.find((l) => l.id === id) || null;
}

export function saveLead(lead: BusinessLead): BusinessLead {
  const db = ensureDatabase();
  const index = db.leads.findIndex((l) => l.id === lead.id);

  if (index >= 0) {
    db.leads[index] = lead;
  } else {
    db.leads.unshift(lead);
  }

  saveDatabase(db);
  return lead;
}

export function updateLead(id: string, updates: Partial<BusinessLead>): BusinessLead | null {
  const db = ensureDatabase();
  const index = db.leads.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const current = db.leads[index];
  const updated: BusinessLead = {
    ...current,
    ...updates,
    lastVerifiedAt: new Date().toISOString(),
  };

  db.leads[index] = updated;
  saveDatabase(db);
  return updated;
}

export function deleteLead(id: string, reason: string = 'LGPD_REQUEST'): boolean {
  const db = ensureDatabase();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) return false;

  db.leads = db.leads.filter((l) => l.id !== id);

  // Registrar auditoria
  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'LEAD_DELETED_LGPD',
    resource: 'LEAD',
    resourceId: id,
    details: `Lead ${lead.name} removido definitivamente. Motivo: ${reason}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase(db);
  return true;
}

// JOBS
export function getJobs(): CollectionJob[] {
  const db = ensureDatabase();
  return db.jobs.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function getJobById(id: string): CollectionJob | null {
  const db = ensureDatabase();
  return db.jobs.find((j) => j.id === id) || null;
}

export function saveJob(job: CollectionJob): CollectionJob {
  const db = ensureDatabase();
  const idx = db.jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    db.jobs[idx] = job;
  } else {
    db.jobs.unshift(job);
  }
  saveDatabase(db);
  return job;
}

export function updateJob(id: string, updates: Partial<CollectionJob>): CollectionJob | null {
  const db = ensureDatabase();
  const idx = db.jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;

  db.jobs[idx] = { ...db.jobs[idx], ...updates };
  saveDatabase(db);
  return db.jobs[idx];
}

// PRODUCTS
export function getProducts(): Product[] {
  const db = ensureDatabase();
  return db.products;
}

export function getProductById(id: string): Product | null {
  const db = ensureDatabase();
  return db.products.find((p) => p.id === id || p.slug === id) || null;
}

// SUPPRESSION LIST
export function getSuppressionList(): SuppressionEntry[] {
  const db = ensureDatabase();
  return db.suppressionList;
}

export function isSuppressed(identifier: string): boolean {
  if (!identifier) return false;
  const db = ensureDatabase();
  const cleanId = identifier.replace(/\D/g, '').toLowerCase();

  return db.suppressionList.some((entry) => {
    const entryClean = entry.identifier.replace(/\D/g, '').toLowerCase();
    return (
      (cleanId.length >= 8 && entryClean === cleanId) ||
      entry.identifier.toLowerCase() === identifier.toLowerCase()
    );
  });
}

export function addSuppressionEntry(identifier: string, type: 'PHONE' | 'EMAIL' | 'DOMAIN', reason: string): SuppressionEntry {
  const db = ensureDatabase();
  const entry: SuppressionEntry = {
    id: `sup-${Date.now()}`,
    identifier,
    type,
    reason,
    suppressedAt: new Date().toISOString(),
  };

  db.suppressionList.unshift(entry);

  // Colocar leads correspondentes em DO_NOT_CONTACT
  db.leads = db.leads.map((l) => {
    if (
      (l.phone && l.phone.includes(identifier)) ||
      (l.website && l.website.includes(identifier)) ||
      (l.email && l.email.includes(identifier))
    ) {
      return {
        ...l,
        pipelineStage: 'DO_NOT_CONTACT',
        notes: `${l.notes || ''} [SUPRIMIDO LGPD: ${reason}]`,
      };
    }
    return l;
  });

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'SUPPRESSION_ADDED',
    resource: 'SUPPRESSION',
    details: `${type}: ${identifier} adicionado à lista de supressão. Motivo: ${reason}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase(db);
  return entry;
}

// AUDIT LOGS
export function getAuditLogs(): AuditLogEntry[] {
  const db = ensureDatabase();
  return db.auditLogs;
}

export function addAuditLog(action: string, resource: string, details?: string, resourceId?: string): void {
  const db = ensureDatabase();
  db.auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action,
    resource,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  });
  saveDatabase(db);
}

// DASHBOARD METRICS (Calculado estritamente de dados reais persistidos)
export function getDashboardMetrics(): DashboardMetrics {
  const db = ensureDatabase();
  const leads = db.leads;

  const byProduct: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  let leadsWithPhone = 0;
  let leadsWithWebsite = 0;
  let qualifiedLeads = 0;
  let leadsAwaitingReview = 0;
  let contactsMade = 0;
  let responsesReceived = 0;
  let demosScheduled = 0;
  let proposalsSent = 0;
  let convertedClients = 0;

  for (const l of leads) {
    byProduct[l.productName] = (byProduct[l.productName] || 0) + 1;
    byStage[l.pipelineStage] = (byStage[l.pipelineStage] || 0) + 1;
    byCity[l.city] = (byCity[l.city] || 0) + 1;
    bySource[l.source] = (bySource[l.source] || 0) + 1;

    if (l.phone) leadsWithPhone++;
    if (l.website) leadsWithWebsite++;
    if (l.score >= 50) qualifiedLeads++;
    if (l.pipelineStage === 'NEW' || l.pipelineStage === 'VALIDATING') leadsAwaitingReview++;
    if (
      l.pipelineStage === 'CONTACTED' ||
      l.pipelineStage === 'RESPONDED' ||
      l.pipelineStage === 'DEMO_SCHEDULED' ||
      l.pipelineStage === 'PROPOSAL_SENT' ||
      l.pipelineStage === 'NEGOTIATING' ||
      l.pipelineStage === 'CONVERTED'
    ) {
      contactsMade++;
    }
    if (
      l.pipelineStage === 'RESPONDED' ||
      l.pipelineStage === 'DEMO_SCHEDULED' ||
      l.pipelineStage === 'PROPOSAL_SENT' ||
      l.pipelineStage === 'NEGOTIATING' ||
      l.pipelineStage === 'CONVERTED'
    ) {
      responsesReceived++;
    }
    if (l.pipelineStage === 'DEMO_SCHEDULED') demosScheduled++;
    if (l.pipelineStage === 'PROPOSAL_SENT') proposalsSent++;
    if (l.pipelineStage === 'CONVERTED') convertedClients++;
  }

  const failedJobsCount = db.jobs.filter((j) => j.status === 'FAILED').length;
  const conversionRate = contactsMade > 0 ? Number(((convertedClients / contactsMade) * 100).toFixed(1)) : 0;

  return {
    totalFound: leads.length,
    uniqueLeads: leads.length,
    qualifiedLeads,
    leadsWithPhone,
    leadsWithWebsite,
    leadsAwaitingReview,
    contactsMade,
    responsesReceived,
    demosScheduled,
    proposalsSent,
    convertedClients,
    conversionRate,
    byProduct,
    byStage,
    byCity,
    bySource,
    failedJobsCount,
  };
}

export function getStoredEvolutionConfig(): { serverUrl?: string; apiKey?: string; instanceName?: string } | undefined {
  const db = ensureDatabase();
  return db.evolutionConfig;
}

export function saveStoredEvolutionConfig(config: { serverUrl?: string; apiKey?: string; instanceName?: string }) {
  const db = ensureDatabase();
  db.evolutionConfig = { ...(db.evolutionConfig || {}), ...config };
  saveDatabase(db);
  return db.evolutionConfig;
}
