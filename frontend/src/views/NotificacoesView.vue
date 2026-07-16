<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../services/api'
import type { Notif } from '../stores/notifications'
import AppLoader from '../components/AppLoader.vue'

const notifs = ref<Notif[]>([])
const carregando = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get<Notif[]>('/notificacoes/historico')
    notifs.value = data.slice().reverse()
  } catch {
    // silencioso
  } finally {
    carregando.value = false
  }
})

const TIPO_LABEL: Record<string, string> = {
  danger: 'Alerta',
  warn: 'Atenção',
  success: 'Sucesso',
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Notificações</h1>
      <span class="dev-badge"><i class="pi pi-wrench" /> Em desenvolvimento</span>
    </div>

    <AppLoader :loading="carregando" />

    <div v-if="!carregando" class="card">
      <table v-if="notifs.length > 0" class="tabela">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Título</th>
            <th>Descrição</th>
            <th>Horário</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in notifs" :key="n.id" :class="{ descartada: n.descartada }">
            <td>
              <span class="badge" :class="n.tipo">{{ TIPO_LABEL[n.tipo] }}</span>
            </td>
            <td class="col-titulo">{{ n.titulo }}</td>
            <td class="col-corpo">{{ n.corpo }}</td>
            <td class="col-data">{{ formatarData(n.createdAt) }}</td>
            <td>
              <span v-if="n.descartada" class="status descartada">Descartada</span>
              <span v-else-if="n.lida" class="status lida">Lida</span>
              <span v-else class="status nova">Nova</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="vazia">
        <i class="pi pi-bell" />
        <p>Nenhuma notificação no histórico</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 28px 32px; max-width: 1100px; margin: 0 auto; }

.page-header {
  display: flex; align-items: center; gap: 14px; margin-bottom: 24px;
}
.page-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }

.dev-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  background: #fef3c7; color: #92400e;
  border: 1px solid #fcd34d; border-radius: 99px;
  font-size: 11px; font-weight: 600;
}
.dev-badge .pi { font-size: 10px; }

.card {
  background: white; border: 1px solid #e2e8f0;
  border-radius: 12px; overflow: hidden;
}

.tabela { width: 100%; border-collapse: collapse; }

.tabela thead tr {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.tabela th {
  padding: 11px 16px;
  font-size: 11px; font-weight: 600; color: #64748b;
  text-align: left; text-transform: uppercase; letter-spacing: 0.05em;
}
.tabela tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}
.tabela tbody tr:last-child { border-bottom: none; }
.tabela tbody tr:hover { background: #f8fafc; }
.tabela tbody tr.descartada { opacity: 0.5; }
.tabela td { padding: 12px 16px; font-size: 13px; color: #374151; vertical-align: middle; }

.col-titulo { font-weight: 600; color: #1e293b; min-width: 180px; }
.col-corpo  { color: #64748b; max-width: 360px; }
.col-data   { white-space: nowrap; color: #94a3b8; font-size: 12px; }

/* Badges de tipo */
.badge {
  display: inline-block; padding: 3px 9px; border-radius: 99px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
}
.badge.danger  { background: #fee2e2; color: #b91c1c; }
.badge.warn    { background: #fef3c7; color: #92400e; }
.badge.success { background: #dcfce7; color: #15803d; }

/* Status */
.status {
  display: inline-block; padding: 3px 9px; border-radius: 99px;
  font-size: 11px; font-weight: 600;
}
.status.nova       { background: #ede9fe; color: #7c3aed; }
.status.lida       { background: #f1f5f9; color: #64748b; }
.status.descartada { background: #f1f5f9; color: #94a3b8; }

.vazia {
  padding: 60px; text-align: center; color: #94a3b8;
}
.vazia .pi { font-size: 36px; margin-bottom: 12px; display: block; }
.vazia p { font-size: 14px; margin: 0; }
</style>
