'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building2,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  Loader2,
  Layers,
} from 'lucide-react';
import { Product, LeadSource } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/constants/products';
import { BRAZILIAN_STATES } from '@/lib/constants/states';

export default function SearchPage() {
  const router = useRouter();

  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-mesago');
  const [selectedCategory, setSelectedCategory] = useState<string>('Hamburgueria');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [state, setState] = useState<string>('SP');
  const [city, setCity] = useState<string>('São Paulo');
  const [cities, setCities] = useState<string[]>([]);
  const [citySearchFilter, setCitySearchFilter] = useState<string>('');
  const [loadingCities, setLoadingCities] = useState<boolean>(false);
  const [maxResults, setMaxResults] = useState<number>(20);
  const [provider, setProvider] = useState<LeadSource>('GOOGLE_PLACES_API');

  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  useEffect(() => {
    // Quando troca o produto, define a primeira categoria padrão
    if (currentProduct.targetSegments.length > 0) {
      setSelectedCategory(currentProduct.targetSegments[0]);
    }
  }, [selectedProductId, currentProduct]);

  // Carregar cidades oficiais do IBGE quando o estado selecionado muda
  useEffect(() => {
    let active = true;
    setLoadingCities(true);
    setCitySearchFilter('');

    fetch(`/api/cities?uf=${state}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.cities && Array.isArray(data.cities) && data.cities.length > 0) {
          setCities(data.cities);

          // Se a cidade atual não pertence ao novo estado, selecionar a capital ou primeira cidade
          if (!data.cities.includes(city)) {
            const defaultCity = data.capital || data.cities[0];
            setCity(defaultCity);
          }
        }
      })
      .catch((e) => {
        console.error('Erro ao carregar cidades do IBGE:', e);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [state]);

  const filteredCities = useMemo(() => {
    if (!citySearchFilter.trim()) return cities;
    const term = citySearchFilter.toLowerCase();
    const matches = cities.filter((c) => c.toLowerCase().includes(term));
    return matches.length > 0 ? matches : cities;
  }, [cities, citySearchFilter]);

  useEffect(() => {
    // Buscar status das fontes e auto-selecionar a fonte operacional mais rica
    fetch('/api/sources/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.sources) {
          setSourcesHealth(data.sources);
          const google = data.sources.find((s: any) => s.id === 'GOOGLE_PLACES_API');
          const docker = data.sources.find((s: any) => s.id === 'GMAPS_SCRAPER_KIT');
          if (google?.available) {
            setProvider('GOOGLE_PLACES_API');
          } else if (docker?.available) {
            setProvider('GMAPS_SCRAPER_KIT');
          } else {
            setProvider('OPENSTREETMAP_OVERPASS');
          }
        }
      })
      .catch((e) => console.error('Erro ao verificar fontes:', e));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const finalCategory = customCategory.trim() || selectedCategory;

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          category: finalCategory,
          city,
          state,
          maxResults,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao executar consulta na fonte selecionada.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado na coleta de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-sky-600" />
          Nova Pesquisa de Leads Reais
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Coleta verificável por segmento, cidade e provedor autorizado para as linhas de produto da Vision Solutions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Principal */}
        <form onSubmit={handleSearch} className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* 1. Seleção do Produto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Produto Alvo da Prospecção
            </label>
            <div className="grid grid-cols-3 gap-3">
              {products.map((prod) => (
                <button
                  type="button"
                  key={prod.id}
                  onClick={() => setSelectedProductId(prod.id)}
                  className={`p-3 text-left rounded-lg border text-sm transition-all ${
                    selectedProductId === prod.id
                      ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="font-bold text-slate-900">{prod.name}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.targetSegments.slice(0, 2).join(', ')}...</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Segmento / Categoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Segmento Empresarial Recomendado
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {currentProduct.targetSegments.map((seg) => (
                <button
                  type="button"
                  key={seg}
                  onClick={() => {
                    setSelectedCategory(seg);
                    setCustomCategory('');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedCategory === seg && !customCategory
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Ou digite uma categoria específica (ex: Hamburgueria Artesanal, Centro de Estética Automotiva)..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* 3. Localização (Estado e Cidade Real do IBGE) */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Estado (UF)
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold text-slate-800"
                >
                  {BRAZILIAN_STATES.map((s) => (
                    <option key={s.uf} value={s.uf}>
                      {s.uf} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cidade Oficial (IBGE)
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {loadingCities ? (
                      <span className="flex items-center gap-1 text-sky-600">
                        <Loader2 className="w-3 h-3 animate-spin" /> Carregando municípios...
                      </span>
                    ) : (
                      `${cities.length} municípios reais`
                    )}
                  </span>
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 z-10 pointer-events-none" />
                  <select
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={loadingCities || cities.length === 0}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:bg-slate-100 font-medium text-slate-900"
                  >
                    {filteredCities.map((cityName) => (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campo auxiliar de filtro rápido para estados com centenas de cidades */}
            {cities.length > 15 && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Filtrar lista de cidades em ${state}... (ex: ${cities.slice(0, 3).join(', ')}...)`}
                  value={citySearchFilter}
                  onChange={(e) => setCitySearchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50/50"
                />
                {citySearchFilter && (
                  <button
                    type="button"
                    onClick={() => setCitySearchFilter('')}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 border border-slate-200 rounded-md whitespace-nowrap"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Fonte de Dados e Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                4. Provedor / Fonte de Coleta
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as LeadSource)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-800"
              >
                <option value="GOOGLE_PLACES_API">Google Places API Oficial (⭐ Telefones, Sites e Avaliações)</option>
                <option value="GMAPS_SCRAPER_KIT">Google Maps Scraper Kit (Docker Local)</option>
                <option value="OPENSTREETMAP_OVERPASS">OpenStreetMap Overpass (Aberta / Coleta Base)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quantidade Máxima
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value={10}>10 estabelecimentos</option>
                <option value={20}>20 estabelecimentos (Recomendado)</option>
                <option value={30}>30 estabelecimentos</option>
                <option value={50}>50 estabelecimentos</option>
              </select>
            </div>
          </div>

          {/* Botão de Disparo */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-all shadow-md shadow-sky-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando Fonte Real e Deduplicando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Executar Coleta Controlada
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sidebar com Instruções e Status das Fontes */}
        <div className="space-y-6">
          {/* Status das Fontes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-600" />
              Disponibilidade das Fontes
            </h2>

            <div className="space-y-3 text-xs">
              {sourcesHealth.map((src) => (
                <div key={src.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{src.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        src.available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {src.available ? 'OPERACIONAL' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{src.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Garantia de Dados Reais */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-5 text-xs space-y-3 shadow-sm">
            <div className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Garantia de Dados Reais
            </div>
            <p className="text-slate-400 leading-relaxed">
              O sistema consulta exclusivamente diretórios territoriais públicos e oficiais. Nenhum registro é mockado, simulado ou gerado aleatoriamente.
            </p>
            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-2">
              Identificadores originais, coordenadas e telefones publicados são rastreados com timestamp de coleta.
            </div>
          </div>
        </div>
      </div>

      {/* Exibição do Resultado da Coleta */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Falha na Coleta</div>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-base">Coleta Real Concluída com Sucesso!</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Trabalho #{result.job?.id} executado na fonte {result.job?.provider}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/80 p-4 rounded-lg border border-emerald-100 text-slate-800 text-sm">
            <div>
              <div className="text-xs text-slate-500 font-medium">Encontrados na Fonte</div>
              <div className="text-xl font-bold text-slate-900">{result.itemsFound}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Novos Leads Ingeridos</div>
              <div className="text-xl font-bold text-emerald-600">+{result.newCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Leads Já Existentes Atualizados</div>
              <div className="text-xl font-bold text-sky-600">{result.updatedCount}</div>
            </div>
          </div>

          {result.job?.warningMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{result.job.warningMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => router.push('/leads')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Ver Leads na Base
            </button>
            <button
              onClick={() => router.push('/crm')}
              className="px-4 py-2 bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 rounded-lg text-sm font-semibold transition-colors"
            >
              Abrir Pipeline no CRM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
