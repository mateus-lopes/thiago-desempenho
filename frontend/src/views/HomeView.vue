<script setup lang="ts">
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { mockCargas, mockClientes } from '../mocks/data'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const PCT = (v: number) =>
  (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

const hora = new Date().getHours()
const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
const iconeHora = hora < 12 ? 'pi-sun' : hora < 18 ? 'pi-cloud' : 'pi-moon'

const cargas = mockCargas.filter(c => c.data.startsWith('2026-07'))

const totalFaturamento = cargas.reduce((s, c) => s + c.valorEmpresa, 0)
const totalComissao    = cargas.reduce((s, c) => s + c.comissaoValor, 0)
const totalLucro       = cargas.reduce((s, c) => s + c.lucro, 0)
const rentMedia        = totalLucro / totalFaturamento

const totalMeta = mockClientes.reduce((s, c) => s + c.meta, 0)
const diasRestantes = 31 - 13
const falta = totalMeta - totalFaturamento
const necessarioPorDia = falta / diasRestantes

const metaClientes = mockClientes.map(cl => {
  const realizado = cargas.filter(c => c.clienteId === cl.id).reduce((s, c) => s + c.valorEmpresa, 0)
  const pct = realizado / cl.meta
  const cor = pct >= 0.6 ? 'green' : pct >= 0.35 ? 'amber' : 'red'
  return { ...cl, realizado, pct, cor }
}).sort((a, b) => b.realizado - a.realizado)

// Acumulado diário jul/2026
const cumulativeData = computed(() => {
  let acc = 0
  return Array.from({ length: 13 }, (_, i) => {
    const dayStr = `2026-07-${String(i + 1).padStart(2, '0')}`
    acc += cargas.filter(c => c.data === dayStr).reduce((s, c) => s + c.valorEmpresa, 0)
    return acc
  })
})

const targetData = Array.from({ length: 13 }, (_, i) =>
  Math.round((totalMeta / 31) * (i + 1))
)

const chartOption = computed(() => ({
  grid: { left: 0, right: 10, bottom: 28, top: 10, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) =>
      params.map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${BRL(p.value)}</b>`).join('<br/>'),
  },
  legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
  xAxis: {
    type: 'category',
    data: Array.from({ length: 13 }, (_, i) => String(i + 1)),
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
      data: cumulativeData.value,
      smooth: true,
      lineStyle: { color: '#7c3aed', width: 2.5 },
      itemStyle: { color: '#7c3aed' },
      areaStyle: { color: 'rgba(124,58,237,0.07)' },
      symbol: 'circle', symbolSize: 5,
    },
    {
      name: 'Meta (pace)',
      type: 'line',
      data: targetData,
      lineStyle: { color: '#94a3b8', width: 1.5, type: 'dashed' },
      itemStyle: { color: '#94a3b8' },
      symbol: 'none',
    },
  ],
}))
</script>

<template>
  <div class="page">
    <div class="wrap">

    <!-- Saudação -->
    <div class="greeting-header">
      <div>
        <h1 class="greeting-title">
          <i :class="`pi ${iconeHora} greeting-icon`" />
          {{ saudacao }}, Thiago!
        </h1>
        <p class="greeting-sub">Aqui está o resumo do desempenho de julho.</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-label">Faturamento</div>
          <div class="kpi-icon purple"><i class="pi pi-money-bill" /></div>
        </div>
        <div class="kpi-value">{{ BRL(totalFaturamento) }}</div>
        <div class="kpi-sub">{{ cargas.filter(c => c.status === 'entregue').length }} de {{ cargas.length }} cargas entregues</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-label">Sua Comissão</div>
          <div class="kpi-icon green"><i class="pi pi-wallet" /></div>
        </div>
        <div class="kpi-value" style="color:#16a34a">{{ BRL(totalComissao) }}</div>
        <div class="kpi-sub">sua remuneração do mês</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-label">Lucro Total</div>
          <div class="kpi-icon blue"><i class="pi pi-chart-line" /></div>
        </div>
        <div class="kpi-value" style="color:#2563eb">{{ BRL(totalLucro) }}</div>
        <div class="kpi-sub">resultado líquido das cargas</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-label">Rentabilidade Média</div>
          <div class="kpi-icon amber"><i class="pi pi-percentage" /></div>
        </div>
        <div class="kpi-value" style="color:#d97706">{{ PCT(rentMedia) }}</div>
        <div class="kpi-sub">margem média sobre faturamento</div>
      </div>
    </div>

    <!-- Evolução + Meta -->
    <div class="dash-row cols-2-1">
      <div class="card">
        <div class="card-title">Evolução Acumulada em Julho</div>
        <VChart :option="chartOption" style="height:210px" autoresize />
      </div>

      <div class="card">
        <div class="card-title">Meta por Cliente</div>
        <div v-for="cl in metaClientes" :key="cl.id" class="meta-item">
          <div class="meta-header">
            <span class="meta-cliente">{{ cl.nome }}</span>
            <span class="meta-valores">{{ BRL(cl.realizado) }} / {{ BRL(cl.meta) }}</span>
          </div>
          <div class="meta-bar">
            <div
              class="meta-bar-fill"
              :class="cl.cor"
              :style="{ width: Math.min(cl.pct * 100, 100) + '%' }"
            />
          </div>
          <div class="meta-pct" :class="cl.cor">{{ PCT(cl.pct) }}</div>
        </div>
      </div>
    </div>

    <!-- Ranking + Pace -->
    <div class="dash-row cols-2">
      <div class="card">
        <div class="card-title">Ranking de Clientes</div>
        <div v-for="(cl, i) in metaClientes" :key="cl.id" class="ranking-item">
          <div class="rank-pos" :class="i === 0 ? 'top' : ''">{{ i + 1 }}</div>
          <div class="rank-nome">{{ cl.nome }}</div>
          <div class="rank-bar-wrap">
            <div class="rank-bar-fill" :style="{ width: (cl.realizado / metaClientes[0].realizado * 100) + '%' }" />
          </div>
          <div class="rank-valor">{{ BRL(cl.realizado) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Pace do Mês</div>
        <div style="text-align:center;padding:10px 0 14px">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px">Dias restantes em Julho</div>
          <div class="pace-number">{{ diasRestantes }}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">dias para fechar o mês</div>
        </div>
        <div>
          <div class="pace-row">
            <span class="pace-label">Meta total</span>
            <span class="pace-val">{{ BRL(totalMeta) }}</span>
          </div>
          <div class="pace-row">
            <span class="pace-label">Realizado</span>
            <span class="pace-val accent">{{ BRL(totalFaturamento) }}</span>
          </div>
          <div class="pace-row">
            <span class="pace-label">Falta faturar</span>
            <span class="pace-val warn">{{ BRL(falta) }}</span>
          </div>
          <div class="pace-row" style="margin-top:4px">
            <span class="pace-label" style="font-weight:600">Necessário / dia</span>
            <span class="pace-val danger" style="font-size:14px;font-weight:700">{{ BRL(necessarioPorDia) }}</span>
          </div>
        </div>
      </div>
    </div>

    </div><!-- /.wrap -->
  </div>
</template>

<style scoped>
.wrap { padding: 0 20px; }

.greeting-header {
  margin-bottom: 24px;
}

.greeting-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.greeting-icon {
  font-size: 20px;
  color: #f59e0b;
}

.greeting-sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
</style>
