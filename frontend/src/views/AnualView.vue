<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { api } from '../services/api'
import AppLoader from '../components/AppLoader.vue'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const PCT = (v: number) =>
  (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface ResumoMes { fat: number; com: number; lucro: number; rent: number; cargas: number; parcial?: boolean }

const apiDados2025 = ref<ResumoMes[]>([])
const apiDados2026 = ref<ResumoMes[]>([])
const carregando = ref(false)
const CURRENT_MES = new Date().getMonth() + 1

function parseMeses(data: any): ResumoMes[] {
  return data.meses.map((m: any) => ({
    fat: m.faturamento,
    com: m.comissao,
    lucro: m.lucro,
    rent: m.rentabilidadeMedia,
    cargas: m.totalCargas,
    parcial: m.mes === CURRENT_MES,
  }))
}

async function carregar() {
  carregando.value = true
  try {
    const [r25, r26] = await Promise.all([
      api.get('/dashboard/anual?ano=2025'),
      api.get('/dashboard/anual?ano=2026'),
    ])
    apiDados2025.value = parseMeses(r25.data)
    apiDados2026.value = parseMeses(r26.data)
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

const dados2025 = computed(() => apiDados2025.value)
const dados2026 = computed(() => apiDados2026.value.slice(0, CURRENT_MES))
const NULL_PAD = computed(() => Array(12 - dados2026.value.length).fill(null))

const fat2026 = computed(() => dados2026.value.reduce((s, d) => s + d.fat, 0))
const fat2025mesmo = computed(() => dados2025.value.slice(0, dados2026.value.length).reduce((s, d) => s + d.fat, 0))
const variacao = computed(() => fat2025mesmo.value ? (fat2026.value - fat2025mesmo.value) / fat2025mesmo.value : 0)
const com2026 = computed(() => dados2026.value.reduce((s, d) => s + d.com, 0))
const lucro2026 = computed(() => dados2026.value.reduce((s, d) => s + d.lucro, 0))
const melhorMes = computed(() => {
  if (dados2026.value.length === 0) return null
  const completos = dados2026.value.slice(0, -1)
  if (completos.length === 0) return null
  const idx = completos.reduce((best, d, i) => d.fat > completos[best].fat ? i : best, 0)
  return { idx, mes: completos[idx] }
})
const periodoLabel = computed(() => `Jan–${MESES[CURRENT_MES - 1]}`)
const mesAtualNome = computed(() => MESES[CURRENT_MES - 1] + '/2026')

const chartFat = computed(() => ({
  grid: { left: 0, right: 10, bottom: 40, top: 10, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) =>
      `<b>${params[0].name}</b><br/>` +
      params.filter(p => p.value != null).map((p: any) =>
        `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${BRL(p.value)}</b>`
      ).join('<br/>'),
  },
  legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
  xAxis: {
    type: 'category', data: MESES,
    axisLabel: { fontSize: 10, color: '#94a3b8' },
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
      name: '2025', type: 'bar',
      data: dados2025.value.map(d => d.fat),
      itemStyle: { color: '#cbd5e1', borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 24,
    },
    {
      name: '2026', type: 'bar',
      data: [...dados2026.value.map(d => d.fat), ...NULL_PAD.value],
      itemStyle: { color: '#7c3aed', borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 24,
    },
  ],
}))

const chartCom = computed(() => ({
  grid: { left: 0, right: 10, bottom: 40, top: 10, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) =>
      `<b>${params[0].name}</b><br/>` +
      params.filter(p => p.value != null).map((p: any) =>
        `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${BRL(p.value)}</b>`
      ).join('<br/>'),
  },
  legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
  xAxis: {
    type: 'category', data: MESES,
    axisLabel: { fontSize: 10, color: '#94a3b8' },
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
      name: '2025', type: 'line',
      data: dados2025.value.map(d => d.com),
      smooth: true, lineStyle: { color: '#94a3b8', width: 2 },
      itemStyle: { color: '#94a3b8' }, symbol: 'circle', symbolSize: 5,
    },
    {
      name: '2026', type: 'line',
      data: [...dados2026.value.map(d => d.com), ...NULL_PAD.value],
      smooth: true, lineStyle: { color: '#16a34a', width: 2.5 },
      itemStyle: { color: '#16a34a' }, symbol: 'circle', symbolSize: 5,
      areaStyle: { color: 'rgba(22,163,74,0.06)' },
    },
  ],
}))

const chartRent = computed(() => ({
  grid: { left: 0, right: 10, bottom: 40, top: 10, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) =>
      `<b>${params[0].name}</b><br/>` +
      params.filter(p => p.value != null).map((p: any) =>
        `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value.toFixed(1)}%</b>`
      ).join('<br/>'),
  },
  legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
  xAxis: {
    type: 'category', data: MESES,
    axisLabel: { fontSize: 10, color: '#94a3b8' },
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v.toFixed(0) + '%' },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  },
  series: [
    {
      name: '2025', type: 'line',
      data: dados2025.value.map(d => +(d.rent * 100).toFixed(1)),
      smooth: true, lineStyle: { color: '#cbd5e1', width: 2 },
      itemStyle: { color: '#94a3b8' }, symbol: 'circle', symbolSize: 5,
    },
    {
      name: '2026', type: 'line',
      data: [...dados2026.value.map(d => +(d.rent * 100).toFixed(1)), ...NULL_PAD.value],
      smooth: true, lineStyle: { color: '#d97706', width: 2.5 },
      itemStyle: { color: '#d97706' }, symbol: 'circle', symbolSize: 5,
      areaStyle: { color: 'rgba(217,119,6,0.06)' },
    },
  ],
}))
</script>

<template>
  <div class="page">
    <div class="wrap" style="position:relative">
      <AppLoader :loading="carregando" />

      <div class="page-header">
        <div>
          <div class="page-title">Dashboard Anual</div>
          <div class="page-sub">Comparativo 2025 vs 2026 · {{ mesAtualNome }} parcial</div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Faturamento 2026</div>
            <div class="kpi-icon purple"><i class="pi pi-money-bill" /></div>
          </div>
          <div class="kpi-value">{{ BRL(fat2026) }}</div>
          <div class="kpi-sub">acumulado {{ periodoLabel }} ({{ MESES[CURRENT_MES - 1] }} parcial)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">vs 2025 ({{ periodoLabel }})</div>
            <div class="kpi-icon" :class="variacao >= 0 ? 'green' : 'red'">
              <i :class="`pi ${variacao >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`" />
            </div>
          </div>
          <div class="kpi-value" :style="{ color: variacao >= 0 ? '#16a34a' : '#dc2626' }">
            {{ variacao >= 0 ? '+' : '' }}{{ PCT(variacao) }}
          </div>
          <div class="kpi-sub">{{ BRL(fat2025mesmo) }} no mesmo período de 2025</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Comissão 2026</div>
            <div class="kpi-icon green"><i class="pi pi-wallet" /></div>
          </div>
          <div class="kpi-value" style="color:#16a34a">{{ BRL(com2026) }}</div>
          <div class="kpi-sub">total acumulado {{ periodoLabel }}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Melhor mês (completo)</div>
            <div class="kpi-icon amber"><i class="pi pi-star" /></div>
          </div>
          <div class="kpi-value" style="color:#d97706">{{ melhorMes ? MESES[melhorMes.idx] : '—' }}</div>
          <div class="kpi-sub">{{ melhorMes ? BRL(melhorMes.mes.fat) : 'Aguardando dados' }} faturados</div>
        </div>
      </div>

      <!-- Gráfico faturamento -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Faturamento Mensal — 2025 vs 2026</div>
        <VChart :option="chartFat" style="height:230px" autoresize />
      </div>

      <!-- Comissão + Rentabilidade -->
      <div class="dash-row cols-2" style="margin-bottom:16px">
        <div class="card">
          <div class="card-title">Comissão Mensal — 2025 vs 2026</div>
          <VChart :option="chartCom" style="height:200px" autoresize />
        </div>
        <div class="card">
          <div class="card-title">Rentabilidade Média — 2025 vs 2026</div>
          <VChart :option="chartRent" style="height:200px" autoresize />
        </div>
      </div>

      <!-- Tabela de resumo -->
      <div class="card">
        <div class="card-title">Resumo Mensal 2026</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Faturamento</th>
              <th>Comissão</th>
              <th>Lucro</th>
              <th>Rentab.</th>
              <th>Cargas</th>
              <th>vs 2025</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in dados2026" :key="i">
              <td>
                {{ MESES[i] }}
                <span v-if="d.parcial" class="tag-parcial">parcial</span>
              </td>
              <td class="font-bold">{{ BRL(d.fat) }}</td>
              <td class="color-green">{{ BRL(d.com) }}</td>
              <td class="color-blue">{{ BRL(d.lucro) }}</td>
              <td>
                <span class="rent" :class="d.rent >= 0.25 ? 'green' : d.rent >= 0.18 ? 'amber' : 'red'">
                  {{ PCT(d.rent) }}
                </span>
              </td>
              <td class="color-muted">{{ d.cargas }}</td>
              <td>
                <template v-if="dados2025[i]?.fat > 0">
                  <span :class="d.fat >= dados2025[i].fat ? 'color-green' : 'color-red'" style="font-weight:600;font-size:12px">
                    {{ d.fat >= dados2025[i].fat ? '+' : '' }}{{ PCT((d.fat - dados2025[i].fat) / dados2025[i].fat) }}
                  </span>
                </template>
                <span v-else class="color-muted">—</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="foot-label">Total acumulado</td>
              <td class="foot-val">{{ BRL(fat2026) }}</td>
              <td class="foot-com">{{ BRL(com2026) }}</td>
              <td class="foot-lucro">{{ BRL(lucro2026) }}</td>
              <td class="foot-rent">{{ PCT(lucro2026 / fat2026) }}</td>
              <td class="foot-val">{{ dados2026.reduce((s, d) => s + d.cargas, 0) }}</td>
              <td>
                <span v-if="fat2025mesmo > 0" :class="variacao >= 0 ? 'color-green' : 'color-red'" style="font-weight:700;font-size:12px">
                  {{ variacao >= 0 ? '+' : '' }}{{ PCT(variacao) }}
                </span>
                <span v-else class="color-muted">—</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  </div>
</template>

<style scoped>
.wrap { padding: 0 20px; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.data-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: 11px; font-weight: 600; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.04em;
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
.font-bold { font-weight: 600; }
.color-green { color: #16a34a; font-weight: 600; }
.color-blue  { color: #2563eb; font-weight: 600; }
.color-red   { color: #dc2626; }
.color-muted { color: #64748b; }

.foot-label { font-weight: 600; color: #374151; }
.foot-val   { font-weight: 700; color: #0f172a; }
.foot-com   { font-weight: 700; color: #16a34a; }
.foot-lucro { font-weight: 700; color: #2563eb; }
.foot-rent  { font-weight: 700; color: #d97706; }

.tag-parcial {
  display: inline-block;
  font-size: 9.5px; font-weight: 600;
  color: #94a3b8; background: #f1f5f9;
  border-radius: 4px; padding: 1px 5px;
  margin-left: 6px; vertical-align: middle;
  text-transform: uppercase; letter-spacing: 0.04em;
}
</style>
