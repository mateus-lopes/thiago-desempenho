<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isPublic = computed(() => Boolean(route.meta.public))

function logout() {
  auth.logout()
  router.push('/login')
}

const dashboardDropdown = [
  { to: '/', icon: 'pi-chart-line', label: 'Visão Geral', exact: true },
  { to: '/anual', icon: 'pi-calendar', label: 'Anual' },
  { to: '/metas', icon: 'pi-flag', label: 'Metas' },
  { to: '/indicadores', icon: 'pi-chart-bar', label: 'Indicadores' },
]

const navItems = [
  { to: '/cotacoes', icon: 'pi-file-edit', label: 'Cotações' },
  { to: '/cargas', icon: 'pi-list', label: 'Cargas' },
  { to: '/clientes', icon: 'pi-users', label: 'Clientes' },
  { to: '/motoristas', icon: 'pi-car', label: 'Motoristas' },
]

const dashboardPaths = dashboardDropdown.map(i => i.to)
const isDashboardActive = computed(() => dashboardPaths.some(p => p === '/' ? route.path === '/' : route.path.startsWith(p)))

const showDashDropdown = ref(false)

function toggleDashDropdown(e: MouseEvent) {
  e.stopPropagation()
  showDashDropdown.value = !showDashDropdown.value
}

function navToDash(item: { to: string }) {
  router.push(item.to)
  showDashDropdown.value = false
}

function fecharDashDropdown() { showDashDropdown.value = false }

function isActive(item: { to: string; exact?: boolean }) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

// ── Notificações ──────────────────────────────────────────────────────────
interface Notif { id: number; tipo: 'danger' | 'warn' | 'success'; titulo: string; corpo: string; lida: boolean }

const showNotif = ref(false)
const notificacoes = ref<Notif[]>([
  { id: 1, tipo: 'danger',  titulo: 'Ritmo abaixo da meta', corpo: 'FRIBAL está em 34% — faltam 18 dias úteis para fechar julho.', lida: false },
  { id: 2, tipo: 'warn',    titulo: 'Canhoto pendente', corpo: 'CTE-10008 sem canhoto enviado há 5 dias.', lida: false },
  { id: 3, tipo: 'warn',    titulo: 'Carga sem atualização', corpo: 'CTE-10009 em andamento há 4 dias sem mudança de status.', lida: false },
  { id: 4, tipo: 'success', titulo: 'SPAL no ritmo certo!', corpo: 'SPAL atingiu 87% da meta de julho — no caminho certo.', lida: true },
])

const naoLidas = computed(() => notificacoes.value.filter(n => !n.lida).length)

function marcarLida(id: number) {
  const n = notificacoes.value.find(n => n.id === id)
  if (n) n.lida = true
}

function marcarTodasLidas() {
  notificacoes.value.forEach(n => { n.lida = true })
}

function fecharNotif() { showNotif.value = false }

// Fecha dropdowns ao clicar fora
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => { fecharNotif(); fecharDashDropdown() })
}
</script>

<template>
  <router-view v-if="isPublic" />
  <div v-else class="layout">

    <header class="topbar">
      <div class="topbar-brand">
        <span class="dev-badge"><i class="pi pi-wrench" /> Em desenvolvimento</span>
      </div>

      <nav class="topbar-nav">

        <!-- Dashboard com dropdown -->
        <div class="nav-dropdown-wrap" @click.stop>
          <a
            class="nav-item nav-item-dropdown"
            :class="{ active: isDashboardActive }"
            @click="toggleDashDropdown"
          >
            <i class="pi pi-chart-line" />
            Dashboards
            <i class="pi pi-chevron-down dash-chevron" :class="{ open: showDashDropdown }" />
          </a>
          <div v-if="showDashDropdown" class="dash-dropdown">
            <a
              v-for="item in dashboardDropdown"
              :key="item.to"
              class="dash-dropdown-item"
              :class="{ active: isActive(item) }"
              @click="navToDash(item)"
            >
              <i :class="`pi ${item.icon}`" />
              {{ item.label }}
            </a>
          </div>
        </div>

        <!-- Separador vertical -->
        <div class="nav-sep" />

        <!-- Itens restantes -->
        <a
          v-for="item in navItems"
          :key="item.to"
          class="nav-item"
          :class="{ active: isActive(item) }"
          @click="router.push(item.to)"
        >
          <i :class="`pi ${item.icon}`" />
          {{ item.label }}
        </a>
      </nav>

      <!-- Sininho de notificações -->
      <div class="notif-wrap" @click.stop>
        <button class="notif-btn" @click="showNotif = !showNotif" title="Notificações">
          <i class="pi pi-bell" />
          <span v-if="naoLidas > 0" class="notif-badge">{{ naoLidas }}</span>
        </button>

        <div v-if="showNotif" class="notif-dropdown">
          <div class="notif-header">
            <span>Notificações</span>
            <button v-if="naoLidas > 0" class="notif-marcar-btn" @click="marcarTodasLidas">
              Marcar todas como lidas
            </button>
          </div>
          <div class="notif-list">
            <div
              v-for="n in notificacoes"
              :key="n.id"
              class="notif-item"
              :class="[n.tipo, { lida: n.lida }]"
              @click="marcarLida(n.id)"
            >
              <div class="notif-dot" :class="n.tipo" />
              <div class="notif-content">
                <div class="notif-titulo">{{ n.titulo }}</div>
                <div class="notif-corpo">{{ n.corpo }}</div>
              </div>
              <div v-if="!n.lida" class="notif-unread-dot" />
            </div>
          </div>
          <div v-if="notificacoes.length === 0" class="notif-vazia">
            Nenhuma notificação
          </div>
        </div>
      </div>

      <button class="nav-logout" @click="logout" title="Sair">
        <i class="pi pi-sign-out" />
        Sair
      </button>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* ── Dashboard dropdown ── */
.nav-dropdown-wrap { position: relative; flex-shrink: 0; }

.nav-item-dropdown { gap: 6px; padding-right: 10px; }

.dash-chevron {
  font-size: 9px; margin-left: 2px;
  transition: transform 0.18s;
}
.dash-chevron.open { transform: rotate(180deg); }

.dash-dropdown {
  position: absolute; top: calc(100% + 8px); left: 0;
  background: white; border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05);
  z-index: 500; overflow: hidden; min-width: 170px;
  padding: 4px;
}

.dash-dropdown-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 12px;
  font-size: 13px; color: #374151; font-weight: 500;
  border-radius: 7px; cursor: pointer;
  transition: background 0.12s, color 0.12s;
  text-decoration: none;
}
.dash-dropdown-item .pi { font-size: 13px; color: #94a3b8; width: 14px; text-align: center; }
.dash-dropdown-item:hover { background: #f3e8ff; color: #7c3aed; }
.dash-dropdown-item:hover .pi { color: #7c3aed; }
.dash-dropdown-item.active { background: #ede9fe; color: #7c3aed; font-weight: 600; }
.dash-dropdown-item.active .pi { color: #7c3aed; }

.nav-sep {
  width: 1px; height: 22px; background: #e2e8f0;
  align-self: center; flex-shrink: 0; margin: 0 4px;
}

/* ── Badge de desenvolvimento ── */
.dev-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  background: #fef3c7; color: #92400e;
  border: 1px solid #fcd34d;
  border-radius: 99px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.dev-badge .pi { font-size: 10px; }

/* ── Notificações ── */
.notif-wrap { position: relative; flex-shrink: 0; }

.notif-btn {
  position: relative;
  width: 36px; height: 36px;
  border-radius: 9px; border: 1px solid #e2e8f0;
  background: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; font-size: 15px;
  transition: all 0.14s;
}
.notif-btn:hover { border-color: #7c3aed; color: #7c3aed; background: #f3e8ff; }

.notif-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 17px; height: 17px;
  background: #ef4444; color: white;
  border-radius: 99px; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px; border: 2px solid white;
}

.notif-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: 320px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 500;
  overflow: hidden;
}

.notif-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px; font-weight: 600; color: #374151;
}

.notif-marcar-btn {
  font-size: 11px; color: #7c3aed; background: none;
  border: none; cursor: pointer; font-family: inherit;
  padding: 2px 6px; border-radius: 5px;
  transition: background 0.12s;
}
.notif-marcar-btn:hover { background: #f3e8ff; }

.notif-list { max-height: 300px; overflow-y: auto; }

.notif-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer; transition: background 0.12s;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #f8fafc; }
.notif-item.lida { opacity: 0.55; }

.notif-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
}
.notif-dot.danger  { background: #ef4444; }
.notif-dot.warn    { background: #f59e0b; }
.notif-dot.success { background: #22c55e; }

.notif-content { flex: 1; min-width: 0; }
.notif-titulo  { font-size: 12.5px; font-weight: 600; color: #1e293b; margin-bottom: 2px; }
.notif-corpo   { font-size: 11.5px; color: #64748b; line-height: 1.4; }

.notif-unread-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7c3aed; flex-shrink: 0; margin-top: 4px;
}

.notif-vazia {
  padding: 20px; text-align: center;
  font-size: 13px; color: #94a3b8; font-style: italic;
}
</style>
