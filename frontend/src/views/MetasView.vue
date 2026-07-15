<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { api } from '../services/api'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent])

interface Cliente { id: number; nome: string; meta: number }
interface Carga { id: number; data: string; clienteId: number; valorEmpresa: number }
interface ProgressoMeta { clienteId: number; clienteNome: string; faturamento: number; meta: number; percent: number }

const clientes = ref<Cliente[]>([])
const cargas = ref<Carga[]>([])
const progressoMetas = ref<ProgressoMeta[]>([])

const meses = [
  { label: 'Jan', val: '2026-01' }, { label: 'Fev', val: '2026-02' },
  { label: 'Mar', val: '2026-03' }, { label: 'Abr', val: '2026-04' },
  { label: 'Mai', val: '2026-05' }, { label: 'Jun', val: '2026-06' },
  { label: 'Jul', val: '2026-07' }, { label: 'Ago', val: '2026-08' },
  { label: 'Set', val: '2026-09' }, { label: 'Out', val: '2026-10' },
  { label: 'Nov', val: '2026-11' }, { label: 'Dez', val: '2026-12' },
]
const mesSelecionado = ref('2026-07')

const showEditMeta = ref(false)
const editingCliente = ref<{ id: number; nome: string } | null>(null)
const novaMetaValor = ref(0)

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const PCT = (v: number) =>
  (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

async function carregarDados() {
  const [clientesRes, dashRes, cargasRes] = await Promise.all([
    api.get('/clientes'),
    api.get(`/dashboard?mes=${mesSelecionado.value}`),
    api.get(`/cargas?mes=${mesSelecionado.value}`),
  ])
  clientes.value = clientesRes.data
  progressoMetas.value = dashRes.data.progressoMeta ?? []
  cargas.value = cargasRes.data
}

watch(mesSelecionado, carregarDados)
onMounted(carregarDados)

function getMetaCliente(clienteId: number): number {
  const prog = progressoMetas.value.find(p => p.clienteId === clienteId)
  if (prog) return prog.meta
  return clientes.value.find(c => c.id === clienteId)?.meta ?? 0
}

function getRealizadoCliente(clienteId: number): number {
  return cargas.value
    .filter(c => c.clienteId === clienteId)
    .reduce((s, c) => s + c.valorEmpresa, 0)
}

const dadosClientes = computed(() =>
  clientes.value.map(cl => {
    const meta = getMetaCliente(cl.id)
    const realizado = getRealizadoCliente(cl.id)
    const pct = meta > 0 ? realizado / meta : 0
    const cor = pct >= 0.6 ? 'green' : pct >= 0.35 ? 'amber' : 'red'
    const falta = Math.max(0, meta - realizado)
    return { ...cl, meta, realizado, pct, cor, falta }
  })
)

const resumo = computed(() => {
  const metaTotal = dadosClientes.value.reduce((s, c) => s + c.meta, 0)
  const realizadoTotal = dadosClientes.value.reduce((s, c) => s + c.realizado, 0)
  const faltaTotal = dadosClientes.value.reduce((s, c) => s + c.falta, 0)
  const pctTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0
  return { metaTotal, realizadoTotal, faltaTotal, pctTotal }
})

function openEditMeta(cl: { id: number; nome: string }) {
  editingCliente.value = cl
  novaMetaValor.value = getMetaCliente(cl.id)
  showEditMeta.value = true
}

async function salvarMeta() {
  if (!editingCliente.value) return
  const [ano, mes] = mesSelecionado.value.split('-').map(Number)
  try {
    await api.put('/metas', {
      clienteId: editingCliente.value.id,
      mes,
      ano,
      valorMeta: novaMetaValor.value,
    })
    await carregarDados()
    showEditMeta.value = false
  } catch {
    console.error('Erro ao salvar meta')
  }
}

const mesLabel = computed(() =>
  meses.find(m => m.val === mesSelecionado.value)?.label + '/2026'
)

function diasNoMes(anoMes: string): number {
  const [ano, mes] = anoMes.split('-').map(Number)
  return new Date(ano, mes, 0).getDate()
}

const chartOption = computed(() => {
  const totalMeta = resumo.value.metaTotal
  const dias = diasNoMes(mesSelecionado.value)

  const paceData = Array.from({ length: dias }, (_, i) =>
    Math.round(totalMeta / dias * (i + 1))
  )

  let acc = 0
  const ultimoDiaComDado = cargas.value
    .reduce((max, c) => Math.max(max, parseInt(c.data.split('-')[2])), 0)

  const realizadoData: (number | null)[] = Array.from({ length: dias }, (_, i) => {
    const dia = i + 1
    const dayStr = `${mesSelecionado.value}-${String(dia).padStart(2, '0')}`
    acc += cargas.value.filter(c => c.data === dayStr).reduce((s, c) => s + c.valorEmpresa, 0)
    return dia <= ultimoDiaComDado ? acc : null
  })

  return {
    grid: { left: 0, right: 12, bottom: 28, top: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) =>
        `Dia ${params[0].axisValue}<br/>` +
        params
          .filter((p: any) => p.value !== null)
          .map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${BRL(p.value)}</b>`)
          .join('<br/>'),
    },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
    xAxis: {
      type: 'category',
      data: Array.from({ length: dias }, (_, i) => String(i + 1)),
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
        name: 'Realizado',
        type: 'line',
        data: realizadoData,
        smooth: true,
        connectNulls: false,
        lineStyle: { color: '#7c3aed', width: 2.5 },
        itemStyle: { color: '#7c3aed' },
        areaStyle: { color: 'rgba(124,58,237,0.08)' },
        symbol: 'circle',
        symbolSize: 5,
        markLine: ultimoDiaComDado > 0 ? {
          silent: true,
          symbol: 'none',
          data: [{ xAxis: String(ultimoDiaComDado) }],
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          label: { formatter: 'Hoje', color: '#94a3b8', fontSize: 10 },
        } : undefined,
      },
      {
        name: 'Meta (pace)',
        type: 'line',
        data: paceData,
        smooth: false,
        lineStyle: { color: '#e2e8f0', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
        symbol: 'none',
      },
    ],
  }
})
</script>

<template>
  <div class="page">
    <div class="wrap">

      <div class="page-header">
        <div>
          <div class="page-title">Metas Mensais</div>
          <div class="page-sub">Acompanhamento por cliente · {{ mesLabel }}</div>
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

      <!-- Resumo do mês -->
      <div class="card resumo-card">
        <div class="resumo-grid">
          <div class="resumo-item">
            <div class="resumo-label">Meta Total</div>
            <div class="resumo-val">{{ BRL(resumo.metaTotal) }}</div>
          </div>
          <div class="resumo-item">
            <div class="resumo-label">Realizado</div>
            <div class="resumo-val accent">{{ BRL(resumo.realizadoTotal) }}</div>
          </div>
          <div class="resumo-item">
            <div class="resumo-label">Faltando</div>
            <div class="resumo-val warn">{{ BRL(resumo.faltaTotal) }}</div>
          </div>
          <div class="resumo-item">
            <div class="resumo-label">Progresso</div>
            <div class="resumo-val" :class="resumo.pctTotal >= 0.6 ? 'ok' : resumo.pctTotal >= 0.35 ? 'warn' : 'danger'">
              {{ PCT(resumo.pctTotal) }}
            </div>
          </div>
        </div>
        <!-- barra geral -->
        <div class="resumo-barra-wrap">
          <div
            class="resumo-barra-fill"
            :class="resumo.pctTotal >= 0.6 ? 'green' : resumo.pctTotal >= 0.35 ? 'amber' : 'red'"
            :style="{ width: Math.min(resumo.pctTotal * 100, 100) + '%' }"
          />
        </div>
      </div>

      <!-- Gráfico de ritmo -->
      <div class="card" style="margin-bottom: 20px">
        <div class="card-title">Ritmo de Faturamento — {{ mesLabel }}</div>
        <div class="chart-legenda-extra">
          <span class="legenda-dot" style="background:#7c3aed"></span>
          <span>Realizado acumulado</span>
          <span class="legenda-sep">·</span>
          <span class="legenda-dot dashed"></span>
          <span>Pace necessário para bater a meta</span>
          <template v-if="resumo.pctTotal > 0">
            <span class="legenda-sep">·</span>
            <span
              class="legenda-status"
              :class="resumo.realizadoTotal >= resumo.metaTotal / diasNoMes(mesSelecionado) * (new Date().getDate()) ? 'ok' : 'atras'"
            >
              {{ resumo.realizadoTotal >= (resumo.metaTotal / diasNoMes(mesSelecionado) * 14)
                  ? '↑ Acima do pace'
                  : '↓ Abaixo do pace' }}
            </span>
          </template>
        </div>
        <VChart :option="chartOption" style="height: 220px; margin-top: 8px" autoresize />
      </div>

      <!-- Cards por cliente -->
      <div class="clientes-grid">
        <div v-for="cl in dadosClientes" :key="cl.id" class="card cliente-card">
          <div class="cc-header">
            <div class="cc-nome">{{ cl.nome }}</div>
            <button class="icon-btn edit" @click="openEditMeta(cl)" title="Editar meta">
              <i class="pi pi-pencil" />
            </button>
          </div>

          <div class="cc-meta-row">
            <span class="cc-label">Meta</span>
            <span class="cc-meta-val">{{ BRL(cl.meta) }}</span>
          </div>
          <div class="cc-meta-row">
            <span class="cc-label">Realizado</span>
            <span class="cc-real-val" :class="cl.cor">{{ BRL(cl.realizado) }}</span>
          </div>
          <div class="cc-meta-row">
            <span class="cc-label">Faltando</span>
            <span class="cc-falta-val">{{ BRL(cl.falta) }}</span>
          </div>

          <div class="cc-bar-wrap">
            <div
              class="cc-bar-fill"
              :class="cl.cor"
              :style="{ width: Math.min(cl.pct * 100, 100) + '%' }"
            />
          </div>

          <div class="cc-pct-row">
            <span class="cc-pct" :class="cl.cor">{{ PCT(cl.pct) }} da meta</span>
            <span class="cc-status-tag" :class="cl.cor">
              {{ cl.cor === 'green' ? 'No ritmo' : cl.cor === 'amber' ? 'Atenção' : 'Abaixo' }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <Dialog
    v-model:visible="showEditMeta"
    :header="`Meta de ${editingCliente?.nome ?? ''}`"
    modal
    style="width: 360px"
  >
    <div class="modal-body">
      <div class="modal-subtitle">Mês: <strong>{{ mesLabel }}</strong></div>
      <div class="form-field" style="margin-top: 14px">
        <label>Valor da Meta (R$)</label>
        <InputNumber
          v-model="novaMetaValor"
          mode="currency"
          currency="BRL"
          locale="pt-BR"
          :min="0"
          fluid
        />
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="showEditMeta = false" />
      <Button label="Salvar" icon="pi pi-check" @click="salvarMeta" />
    </template>
  </Dialog>
</template>

<style scoped>
.wrap { padding: 0 20px; }

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

/* Resumo */
.resumo-card { margin-bottom: 20px; }

.resumo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-bottom: 16px;
}

.resumo-item { text-align: center; padding: 4px 8px; }
.resumo-item + .resumo-item { border-left: 1px solid #f1f5f9; }

.resumo-label {
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.resumo-val { font-size: 22px; font-weight: 700; color: #0f172a; }
.resumo-val.accent { color: #7c3aed; }
.resumo-val.warn   { color: #d97706; }
.resumo-val.ok     { color: #16a34a; }
.resumo-val.danger { color: #dc2626; }

.resumo-barra-wrap {
  height: 8px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}
.resumo-barra-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease;
}
.resumo-barra-fill.green { background: linear-gradient(90deg, #22c55e, #4ade80); }
.resumo-barra-fill.amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.resumo-barra-fill.red   { background: linear-gradient(90deg, #ef4444, #f87171); }

/* Grid de cards */
.clientes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.cliente-card { padding: 18px 20px; }

.cc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.cc-nome { font-size: 15px; font-weight: 700; color: #0f172a; }

.cc-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  padding: 4px 0;
}
.cc-label { color: #64748b; }
.cc-meta-val { font-weight: 600; color: #374151; }
.cc-real-val { font-weight: 700; }
.cc-real-val.green { color: #16a34a; }
.cc-real-val.amber { color: #d97706; }
.cc-real-val.red   { color: #dc2626; }
.cc-falta-val { font-weight: 500; color: #94a3b8; font-size: 12px; }

.cc-bar-wrap {
  height: 7px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
  margin: 12px 0 8px;
}
.cc-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease;
}
.cc-bar-fill.green { background: #22c55e; }
.cc-bar-fill.amber { background: #f59e0b; }
.cc-bar-fill.red   { background: #ef4444; }

.cc-pct-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cc-pct { font-size: 12px; font-weight: 600; }
.cc-pct.green { color: #16a34a; }
.cc-pct.amber { color: #d97706; }
.cc-pct.red   { color: #dc2626; }

.cc-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
}
.cc-status-tag.green { background: #dcfce7; color: #15803d; }
.cc-status-tag.amber { background: #fef3c7; color: #a16207; }
.cc-status-tag.red   { background: #fee2e2; color: #b91c1c; }

.icon-btn {
  width: 28px; height: 28px;
  border: none; background: none; cursor: pointer;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
  transition: background 0.12s, color 0.12s;
  color: #94a3b8;
}
.icon-btn.edit:hover { background: #f3e8ff; color: #7c3aed; }

.modal-body { padding: 4px 0 8px; }
.modal-subtitle { font-size: 13px; color: #64748b; }

/* legenda customizada do gráfico */
.chart-legenda-extra {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #64748b;
  flex-wrap: wrap;
}
.legenda-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legenda-dot.dashed {
  background: none;
  border: 1.5px dashed #94a3b8;
  border-radius: 0;
  width: 16px; height: 0;
  border-bottom: 1.5px dashed #94a3b8;
}
.legenda-sep { color: #cbd5e1; }
.legenda-status { font-weight: 600; }
.legenda-status.ok { color: #16a34a; }
.legenda-status.atras { color: #dc2626; }
</style>
