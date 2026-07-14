<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, FunnelChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { mockCargas, mockClientes, mockIndicadores, type IndicadorSemanal } from '../mocks/data'
import { useLocalStorage } from '../composables/useLocalStorage'

use([CanvasRenderer, BarChart, FunnelChart, GridComponent, TooltipComponent, LegendComponent])

// ── Indicadores de prospecção (funil) ─────────────────────────────────────

const defaultIndicadores: Record<string, IndicadorSemanal> = {}
for (const ind of mockIndicadores) {
  defaultIndicadores[`${ind.mes}_${ind.semana}`] = ind
}
const indicadores = useLocalStorage<Record<string, IndicadorSemanal>>('thiago_indicadores', defaultIndicadores)

const indicKey = computed(() => `${mesSelecionado.value}_${semanaAtiva.value}`)
const indicAtivo = computed<IndicadorSemanal>(() =>
  indicadores.value[indicKey.value] ?? {
    mes: mesSelecionado.value, semana: semanaAtiva.value,
    ligacoes: 0, leadsAdicionados: 0, leadsDeclinados: 0, clientesFechados: 0,
  }
)

function setIndic(field: keyof Omit<IndicadorSemanal, 'mes' | 'semana'>, value: number) {
  indicadores.value = {
    ...indicadores.value,
    [indicKey.value]: { ...indicAtivo.value, [field]: Math.max(0, value || 0) },
  }
}

const leadsAceitos = computed(() =>
  Math.max(0, indicAtivo.value.leadsAdicionados - indicAtivo.value.leadsDeclinados)
)

const taxaConversao = computed(() => {
  const lig = indicAtivo.value.ligacoes
  const fec = indicAtivo.value.clientesFechados
  return lig > 0 ? fec / lig : 0
})

const temDadosFunil = computed(() => indicAtivo.value.ligacoes > 0)

const chartFunil = computed(() => {
  const d = indicAtivo.value
  const max = Math.max(d.ligacoes, 1)
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `<b>${p.name}</b>: ${p.value}` },
    series: [{
      type: 'funnel',
      sort: 'none',
      min: 0, max,
      minSize: '10%', maxSize: '100%',
      gap: 6,
      left: '20%', width: '60%',
      label: {
        show: true, position: 'inside',
        color: 'white', fontWeight: 600, fontSize: 12,
        formatter: (p: any) => `${p.name}\n${p.value}`,
      },
      itemStyle: { borderWidth: 0 },
      data: [
        { value: d.ligacoes,          name: 'Ligações',   itemStyle: { color: '#7c3aed' } },
        { value: d.leadsAdicionados,  name: 'Leads (+)',  itemStyle: { color: '#2563eb' } },
        { value: leadsAceitos.value,  name: 'Aceitos',    itemStyle: { color: '#0891b2' } },
        { value: d.clientesFechados,  name: 'Fechados',   itemStyle: { color: '#16a34a' } },
      ],
    }],
  }
})

const meses = [
  { label: 'Jan', val: '2026-01' }, { label: 'Fev', val: '2026-02' },
  { label: 'Mar', val: '2026-03' }, { label: 'Abr', val: '2026-04' },
  { label: 'Mai', val: '2026-05' }, { label: 'Jun', val: '2026-06' },
  { label: 'Jul', val: '2026-07' }, { label: 'Ago', val: '2026-08' },
  { label: 'Set', val: '2026-09' }, { label: 'Out', val: '2026-10' },
  { label: 'Nov', val: '2026-11' }, { label: 'Dez', val: '2026-12' },
]
const mesSelecionado = ref('2026-07')
const semanaAtiva = ref(1)

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const PCT = (v: number) =>
  (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

// Faixas das semanas do mês (1-7, 8-14, 15-21, 22-fim)
const semanas = [
  { num: 1, label: 'Semana 1', de: 1, ate: 7 },
  { num: 2, label: 'Semana 2', de: 8, ate: 14 },
  { num: 3, label: 'Semana 3', de: 15, ate: 21 },
  { num: 4, label: 'Semana 4', de: 22, ate: 31 },
]

function cargasDaSemana(semana: typeof semanas[number]) {
  return mockCargas.filter(c => {
    if (!c.data.startsWith(mesSelecionado.value)) return false
    const dia = parseInt(c.data.split('-')[2])
    return dia >= semana.de && dia <= semana.ate
  })
}

const dadosSemanas = computed(() =>
  semanas.map(s => {
    const cargas = cargasDaSemana(s)
    const faturamento = cargas.reduce((sum, c) => sum + c.valorEmpresa, 0)
    const comissao    = cargas.reduce((sum, c) => sum + c.comissaoValor, 0)
    const lucro       = cargas.reduce((sum, c) => sum + c.lucro, 0)
    const rentMedia   = faturamento > 0 ? lucro / faturamento : 0
    const entregues   = cargas.filter(c => c.status === 'entregue').length
    return { ...s, cargas, faturamento, comissao, lucro, rentMedia, total: cargas.length, entregues }
  })
)

const semanaInfo = computed(() =>
  dadosSemanas.value.find(s => s.num === semanaAtiva.value)!
)

// Top clientes da semana
const topClientesSemana = computed(() => {
  const cargas = semanaInfo.value.cargas
  return mockClientes.map(cl => ({
    nome: cl.nome,
    fat: cargas.filter(c => c.clienteId === cl.id).reduce((s, c) => s + c.valorEmpresa, 0),
  }))
    .filter(x => x.fat > 0)
    .sort((a, b) => b.fat - a.fat)
})

const chartOption = computed(() => ({
  grid: { left: 0, right: 10, bottom: 28, top: 10, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) =>
      params.map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${BRL(p.value)}</b>`).join('<br/>'),
  },
  xAxis: {
    type: 'category',
    data: semanas.map(s => s.label),
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  },
  series: [
    {
      name: 'Faturamento',
      type: 'bar',
      data: dadosSemanas.value.map((s, i) => ({
        value: s.faturamento,
        itemStyle: { color: i + 1 === semanaAtiva.value ? '#7c3aed' : '#e2e8f0', borderRadius: [4, 4, 0, 0] },
      })),
      barMaxWidth: 48,
    },
  ],
}))

const mesLabel = computed(() =>
  meses.find(m => m.val === mesSelecionado.value)?.label + '/2026'
)
</script>

<template>
  <div class="page">
    <div class="wrap">

      <div class="page-header">
        <div>
          <div class="page-title">Indicadores</div>
          <div class="page-sub">Desempenho semanal · {{ mesLabel }}</div>
        </div>
      </div>

      <!-- Seletor de mês -->
      <div class="meses-selector" style="margin-bottom: 20px">
        <button
          v-for="m in meses"
          :key="m.val"
          class="mes-btn"
          :class="{ ativo: mesSelecionado === m.val }"
          @click="mesSelecionado = m.val"
        >{{ m.label }}</button>
      </div>

      <!-- Abas de semana -->
      <div class="semana-tabs">
        <button
          v-for="s in dadosSemanas"
          :key="s.num"
          class="semana-tab"
          :class="{ ativo: semanaAtiva === s.num, vazia: s.total === 0 }"
          @click="semanaAtiva = s.num"
        >
          <span class="semana-tab-label">{{ s.label }}</span>
          <span class="semana-tab-dias">dias {{ s.de }}–{{ s.ate > 28 ? 'fim' : s.ate }}</span>
          <span v-if="s.total > 0" class="semana-tab-badge">{{ s.total }}</span>
        </button>
      </div>

      <!-- KPIs da semana -->
      <div class="kpi-grid" style="margin-top: 20px">
        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Cargas</div>
            <div class="kpi-icon purple"><i class="pi pi-box" /></div>
          </div>
          <div class="kpi-value">{{ semanaInfo.total }}</div>
          <div class="kpi-sub">{{ semanaInfo.entregues }} entregue{{ semanaInfo.entregues !== 1 ? 's' : '' }}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Faturamento</div>
            <div class="kpi-icon blue"><i class="pi pi-money-bill" /></div>
          </div>
          <div class="kpi-value">{{ BRL(semanaInfo.faturamento) }}</div>
          <div class="kpi-sub">valor empresa no período</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Comissão</div>
            <div class="kpi-icon green"><i class="pi pi-wallet" /></div>
          </div>
          <div class="kpi-value" style="color:#16a34a">{{ BRL(semanaInfo.comissao) }}</div>
          <div class="kpi-sub">sua remuneração</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Rentabilidade</div>
            <div class="kpi-icon amber"><i class="pi pi-percentage" /></div>
          </div>
          <div class="kpi-value" style="color:#d97706">{{ PCT(semanaInfo.rentMedia) }}</div>
          <div class="kpi-sub">margem média do período</div>
        </div>
      </div>

      <!-- Gráfico + resumo por cliente -->
      <div class="dash-row cols-2-1">
        <div class="card">
          <div class="card-title">Faturamento por Semana — {{ mesLabel }}</div>
          <VChart :option="chartOption" style="height: 200px" autoresize />
        </div>

        <div class="card">
          <div class="card-title">Clientes na {{ semanaInfo.label }}</div>
          <div v-if="topClientesSemana.length === 0" class="empty-msg">
            Nenhuma carga nesse período
          </div>
          <div v-else>
            <div v-for="(cl, i) in topClientesSemana" :key="cl.nome" class="ranking-item">
              <div class="rank-pos" :class="i === 0 ? 'top' : ''">{{ i + 1 }}</div>
              <div class="rank-nome">{{ cl.nome }}</div>
              <div class="rank-bar-wrap">
                <div
                  class="rank-bar-fill"
                  :style="{ width: (cl.fat / topClientesSemana[0].fat * 100) + '%' }"
                />
              </div>
              <div class="rank-valor">{{ BRL(cl.fat) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de cargas da semana -->
      <div class="card">
        <div class="card-title">Cargas da {{ semanaInfo.label }}</div>
        <table v-if="semanaInfo.cargas.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>CTE</th>
              <th>Origem → Destino</th>
              <th>Cliente</th>
              <th class="col-right">Faturamento</th>
              <th class="col-right">Comissão</th>
              <th class="col-right">Rentab.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in semanaInfo.cargas" :key="c.id">
              <td class="td-mono">{{ c.data.split('-').reverse().join('/') }}</td>
              <td class="td-mono">{{ c.cte }}</td>
              <td class="td-rota">{{ c.origem }} <span class="arrow">→</span> {{ c.destino }}</td>
              <td>
                <span class="cliente-tag">
                  {{ mockClientes.find(cl => cl.id === c.clienteId)?.nome ?? '—' }}
                </span>
              </td>
              <td class="col-right td-val">{{ BRL(c.valorEmpresa) }}</td>
              <td class="col-right td-comissao">{{ BRL(c.comissaoValor) }}</td>
              <td class="col-right">
                <span class="rent" :class="c.percentRentabilidade >= 0.25 ? 'green' : c.percentRentabilidade >= 0.15 ? 'amber' : 'red'">
                  {{ PCT(c.percentRentabilidade) }}
                </span>
              </td>
              <td>
                <span class="status-tag" :class="c.status">
                  {{ c.status === 'entregue' ? 'Entregue' : 'Em andamento' }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="foot-label">Total da semana</td>
              <td class="col-right foot-val">{{ BRL(semanaInfo.faturamento) }}</td>
              <td class="col-right foot-comissao">{{ BRL(semanaInfo.comissao) }}</td>
              <td class="col-right foot-rent">{{ PCT(semanaInfo.rentMedia) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        <div v-else class="empty-msg">Nenhuma carga registrada nessa semana.</div>
      </div>

      <!-- ── Funil de Prospecção ──────────────────────────────────────────── -->
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:18px">
          Prospecção Comercial — {{ semanaInfo.label }}
          <span style="font-size:11px;font-weight:400;color:#94a3b8;margin-left:8px">edite os valores abaixo</span>
        </div>

        <!-- Inputs -->
        <div class="funil-inputs">
          <div class="funil-input-item">
            <div class="funil-dot" style="background:#7c3aed" />
            <label>Ligações realizadas</label>
            <input
              type="number" min="0"
              class="funil-num"
              :value="indicAtivo.ligacoes"
              @input="setIndic('ligacoes', +($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="funil-input-item">
            <div class="funil-dot" style="background:#2563eb" />
            <label>Leads adicionados</label>
            <input
              type="number" min="0"
              class="funil-num"
              :value="indicAtivo.leadsAdicionados"
              @input="setIndic('leadsAdicionados', +($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="funil-input-item">
            <div class="funil-dot" style="background:#94a3b8" />
            <label>Leads declinados</label>
            <input
              type="number" min="0"
              class="funil-num"
              :value="indicAtivo.leadsDeclinados"
              @input="setIndic('leadsDeclinados', +($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="funil-input-item">
            <div class="funil-dot" style="background:#16a34a" />
            <label>Clientes fechados</label>
            <input
              type="number" min="0"
              class="funil-num"
              :value="indicAtivo.clientesFechados"
              @input="setIndic('clientesFechados', +($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <!-- Funil + Taxas -->
        <div class="funil-body">
          <div class="funil-chart-wrap">
            <div v-if="!temDadosFunil" class="empty-msg" style="height:320px;display:flex;align-items:center;justify-content:center">
              Preencha as ligações para ver o funil
            </div>
            <VChart v-else :option="chartFunil" style="height:320px" autoresize />
          </div>

          <div class="funil-taxas">
            <div class="taxa-row">
              <span class="taxa-label">Ligações → Leads</span>
              <span class="taxa-val" :style="{ color: indicAtivo.ligacoes > 0 ? '#2563eb' : '#94a3b8' }">
                {{ indicAtivo.ligacoes > 0
                  ? ((indicAtivo.leadsAdicionados / indicAtivo.ligacoes) * 100).toFixed(1) + '%'
                  : '—' }}
              </span>
            </div>
            <div class="taxa-row">
              <span class="taxa-label">Leads aceitos</span>
              <span class="taxa-val" style="color:#0891b2">
                {{ indicAtivo.leadsAdicionados > 0
                  ? ((leadsAceitos / indicAtivo.leadsAdicionados) * 100).toFixed(1) + '%'
                  : '—' }}
                <span style="font-size:11px;color:#94a3b8;font-weight:400">({{ leadsAceitos }} de {{ indicAtivo.leadsAdicionados }})</span>
              </span>
            </div>
            <div class="taxa-row">
              <span class="taxa-label">Leads → Fechado</span>
              <span class="taxa-val" style="color:#16a34a">
                {{ indicAtivo.leadsAdicionados > 0
                  ? ((indicAtivo.clientesFechados / indicAtivo.leadsAdicionados) * 100).toFixed(1) + '%'
                  : '—' }}
              </span>
            </div>
            <div class="taxa-row taxa-destaque">
              <span class="taxa-label">Conversão geral</span>
              <span class="taxa-val" :style="{ color: taxaConversao > 0.1 ? '#16a34a' : taxaConversao > 0.05 ? '#d97706' : '#94a3b8' }">
                {{ indicAtivo.ligacoes > 0 ? (taxaConversao * 100).toFixed(1) + '%' : '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.wrap { padding: 0 20px; }

/* ── Funil de prospecção ── */
.funil-inputs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.funil-input-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.funil-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.funil-input-item label {
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
}

.funil-num {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  font-family: inherit;
  background: #f8fafc;
  text-align: center;
  transition: border-color 0.14s;
  -moz-appearance: textfield;
}
.funil-num::-webkit-outer-spin-button,
.funil-num::-webkit-inner-spin-button { -webkit-appearance: none; }
.funil-num:focus { outline: none; border-color: #7c3aed; background: white; }

.funil-body {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  align-items: center;
}

.funil-chart-wrap { min-height: 320px; }

.funil-taxas {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.taxa-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12.5px;
}
.taxa-row:last-child { border-bottom: none; }

.taxa-row.taxa-destaque {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
}

.taxa-label { color: #64748b; }
.taxa-val { font-weight: 700; font-size: 14px; }

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

/* Abas de semana */
.semana-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
}

.semana-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: white;
  cursor: pointer;
  transition: all 0.14s;
  position: relative;
}

.semana-tab:hover { border-color: #a78bfa; }
.semana-tab.ativo { border-color: #7c3aed; background: #f3e8ff; }
.semana-tab.vazia { opacity: 0.5; }

.semana-tab-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.semana-tab.ativo .semana-tab-label { color: #7c3aed; }

.semana-tab-dias {
  font-size: 11px;
  color: #94a3b8;
}

.semana-tab-badge {
  position: absolute;
  top: 8px; right: 10px;
  min-width: 18px; height: 18px;
  background: #7c3aed;
  color: white;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* tabela */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.data-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
  white-space: nowrap;
}

.data-table tbody td {
  padding: 10px 12px;
  color: #1e293b;
  border-bottom: 1px solid #f8fafc;
}

.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: #fafbfc; }

.data-table tfoot td {
  padding: 10px 12px;
  border-top: 1px solid #e2e8f0;
  background: #fafafa;
}

.col-right { text-align: right; }

.td-mono { font-family: 'Courier New', monospace; font-size: 12px; color: #64748b; }
.td-rota { font-size: 12px; color: #374151; white-space: nowrap; }
.td-val { font-weight: 600; color: #0f172a; }
.td-comissao { font-weight: 600; color: #16a34a; }
.arrow { color: #94a3b8; font-size: 11px; }

.cliente-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: #374151;
}

.foot-label { font-weight: 600; color: #374151; }
.foot-val { font-weight: 700; color: #0f172a; text-align: right; }
.foot-comissao { font-weight: 700; color: #16a34a; text-align: right; }
.foot-rent { font-weight: 700; color: #d97706; text-align: right; }

.empty-msg {
  text-align: center;
  padding: 28px;
  color: #94a3b8;
  font-style: italic;
  font-size: 13px;
}
</style>
