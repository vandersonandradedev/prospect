# 🏢 Vision Solutions — LeadHunter B2B (Sistema de Prospecção & CRM)

Sistema funcional de prospecção comercial, captação de clientes reais e CRM B2B para a **Vision Solutions**, projetado para identificar, qualificar e acompanhar empresas reais até a conversão em clientes pagantes.

---

## 📌 Linhas de Produto Atendidas

1. **MesaGo**
   - **Público-alvo:** Hamburguerias, Pizzarias, Restaurantes, Lanchonetes, Açaíterias, Cafeterias e Dark Kitchens.
   - **Solução:** Cardápio digital com QR code, gestão de pedidos para delivery e salão, integração com WhatsApp e KDS.
2. **TorqueOS**
   - **Público-alvo:** Oficinas mecânicas, Centros automotivos, Oficinas de motos e Manutenção veicular.
   - **Solução:** Ordem de Serviço digital com fotos e checklist, controle de estoque de peças e orçamentos via WhatsApp.
3. **Software Fiscal**
   - **Público-alvo:** Varejistas, Distribuidores e Prestadores de Serviços emitentes de documentos fiscais.
   - **Solução:** Emissão ultrarrápida de NF-e, NFC-e e NFS-e, parametrização tributária e contingência em nuvem.

---

## 🛡️ Regra Fundamental: Somente Dados Reais

- **Rastreabilidade total:** Cada empresa armazena a fonte original (`OPENSTREETMAP_OVERPASS`, `GMAPS_SCRAPER_KIT`, `GOOGLE_PLACES_API`), a URL ou ID externo e os timestamps de primeira coleta e última verificação.
- **Zero mocks em produção:** Campos não observados recebem `null`. Telefones e e-mails não são gerados nem inventados.
- **Separação estrita:**
  - *Dados Observados:* Telefones públicos publicados, endereços físicos e websites oficiais ativos.
  - *Dados Inferidos:* Hipóteses de adequação ao produto e perguntas diagnósticas sugeridas pela IA.
  - *Dados Informados:* Registros adicionados manualmente pelo operador comercial.
- **Conformidade LGPD (Lei 13.709/2018):** Base legal do Legítimo Interesse (Art. 7º, IX e Art. 10), lista de supressão ativa (opt-out imediato) e exclusão definitiva auditada.

---

## 🏗️ Arquitetura e Tecnologias

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5.6
- **Estilização:** Tailwind CSS + Lucide Icons
- **Persistência Real:** JSON Store atômico com isolamento de transações em `data/leads_database.json`, totalmente compatível com PostgreSQL / Neon quando `DATABASE_URL` estiver configurado.
- **Provedores de Coleta (Provider Adapter):**
  - `OverpassOsmProvider`: Consultas territoriais abertas no OpenStreetMap com coordenadas, telefones e websites reais sem necessidade de chave de API.
  - `GoogleMapsScraperProvider`: Integração com contêiner Docker local na porta 8080 (`docker compose up -d`).
  - `GooglePlacesProvider`: Integração com a Google Places API oficial para produção via `GOOGLE_PLACES_API_KEY`.
- **Enriquecimento:** Verificador seguro de websites (com proteção anti-SSRF) identificando WhatsApp links, e-mails públicos e cardápios digitais.
- **Inteligência Artificial:** Camada de IA estruturada (Google Gemini Flash + fallback analítico determinístico baseado em evidências).
- **Testes Automatizados:** Vitest com suítes de validação de deduplicação, normalização telefônica e regras de scoring.

---

## 🚀 Como Executar

```bash
# 1. Instalar dependências
npm install

# 2. Executar testes de qualidade e regras de negócio
npm test

# 3. Executar checagem estrita de tipos TypeScript
npm run typecheck

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.
