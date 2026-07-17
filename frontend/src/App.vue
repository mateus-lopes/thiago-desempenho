<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useNotifStore } from './stores/notifications'
import { useAutosaveStore } from './stores/autosave'
import { useToast } from './composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifStore = useNotifStore()
const autosave = useAutosaveStore()
const { toastMsg } = useToast()

const isPublic = computed(() => Boolean(route.meta.public))

// Carrega notificações quando o usuário está autenticado
watch(() => auth.isAuthenticated, (authenticated) => {
  if (authenticated) notifStore.carregar()
}, { immediate: true })

async function logout() {
  await auth.logout()
  router.push('/login')
}

const dashboardDropdown = [
  { to: '/', icon: 'pi-objects-column', label: 'Visão Geral', exact: true },
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
const showNotif = ref(false)

function fecharNotif() { showNotif.value = false }

// ── Menu mobile ───────────────────────────────────────────────────────────
const showMobileMenu = ref(false)

// Fecha tudo ao navegar
watch(route, () => { showMobileMenu.value = false; showDashDropdown.value = false; showNotif.value = false })

// Fecha dropdowns ao clicar fora
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => { fecharNotif(); fecharDashDropdown(); showMobileMenu.value = false })
}
</script>

<template>
  <router-view v-if="isPublic" />
  <div v-else class="layout">

    <header class="topbar">
      <div class="topbar-brand">
        <span class="dev-badge"><i class="pi pi-wrench" /> Em fase de testes</span>
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

        <!-- Item de gerenciamento de usuários — só admin -->
        <template v-if="auth.isAdmin">
          <div class="nav-sep" />
          <a
            class="nav-item nav-item-admin"
            :class="{ active: route.path === '/usuarios' }"
            @click="router.push('/usuarios')"
            title="Gerenciar usuários do sistema"
          >
            <i class="pi pi-shield" />
            Usuários
          </a>
        </template>
      </nav>

      <!-- Hambúrguer (só mobile) -->
      <button class="hamburger-btn" @click.stop="showMobileMenu = !showMobileMenu" title="Menu">
        <i class="pi" :class="showMobileMenu ? 'pi-times' : 'pi-bars'" />
      </button>

      <!-- Menu mobile expandido -->
      <nav v-if="showMobileMenu" class="mobile-menu" @click.stop>
        <a v-for="item in dashboardDropdown" :key="item.to"
          class="mobile-nav-item" :class="{ active: isActive(item) }"
          @click="router.push(item.to); showMobileMenu = false"
        >
          <i :class="`pi ${item.icon}`" /> {{ item.label }}
        </a>
        <div class="mobile-nav-sep" />
        <a v-for="item in navItems" :key="item.to"
          class="mobile-nav-item" :class="{ active: isActive(item) }"
          @click="router.push(item.to); showMobileMenu = false"
        >
          <i :class="`pi ${item.icon}`" /> {{ item.label }}
        </a>
        <template v-if="auth.isAdmin">
          <div class="mobile-nav-sep" />
          <a class="mobile-nav-item" :class="{ active: route.path === '/usuarios' }"
            @click="router.push('/usuarios'); showMobileMenu = false">
            <i class="pi pi-shield" /> Usuários
          </a>
        </template>
        <div class="mobile-nav-sep" />
        <a class="mobile-nav-item mobile-nav-logout" @click="logout(); showMobileMenu = false">
          <i class="pi pi-sign-out" /> Sair
        </a>
      </nav>

      <!-- Sininho de notificações -->
      <div class="notif-wrap" @click.stop>
        <button class="notif-btn" @click="showNotif = !showNotif" title="Notificações">
          <i class="pi pi-bell" />
          <span v-if="notifStore.naoLidas > 0" class="notif-badge">{{ notifStore.naoLidas }}</span>
        </button>

        <div v-if="showNotif" class="notif-dropdown">
          <div class="notif-header">
            <span>Notificações</span>
            <button v-if="notifStore.naoLidas > 0" class="notif-marcar-btn" @click="notifStore.marcarTodasLidas()">
              Marcar todas como lidas
            </button>
          </div>
          <div class="notif-list">
            <div
              v-for="n in notifStore.notifs"
              :key="n.id"
              class="notif-item"
              :class="[n.tipo, { lida: n.lida }]"
              @click="notifStore.marcarLida(n.id)"
            >
              <div class="notif-dot" :class="n.tipo" />
              <div class="notif-content">
                <div class="notif-titulo">{{ n.titulo }}</div>
                <div class="notif-corpo">{{ n.corpo }}</div>
              </div>
              <div v-if="!n.lida" class="notif-unread-dot" />
              <button
                class="notif-descartar"
                title="Remover"
                @click.stop="notifStore.descartar(n.id)"
              >
                <i class="pi pi-times" />
              </button>
            </div>
          </div>
          <div v-if="notifStore.notifs.length === 0" class="notif-vazia">
            <span v-if="notifStore.carregando">Carregando...</span>
            <span v-else>Nenhuma notificação ativa</span>
          </div>
          <div class="notif-footer" @click="router.push('/notificacoes'); fecharNotif()">
            <i class="pi pi-history" /> Ver histórico completo
          </div>
        </div>
      </div>

      <!-- Indicador de autosave -->
      <Transition name="autosave-fade">
        <div v-if="autosave.status !== 'idle'" class="autosave-chip" :class="autosave.status">
          <i class="pi"
            :class="{
              'pi-spin pi-sync': autosave.status === 'saving',
              'pi-check-circle': autosave.status === 'saved',
              'pi-exclamation-triangle': autosave.status === 'error',
            }"
          />
          <span v-if="autosave.status === 'saving'">Salvando...</span>
          <span v-else-if="autosave.status === 'saved'">Salvo</span>
          <span v-else>Erro ao salvar</span>
        </div>
      </Transition>

      <button class="nav-logout" @click="logout" title="Sair">
        <i class="pi pi-sign-out" />
        Sair
      </button>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>

  <Teleport to="body">
    <div v-if="toastMsg" class="toast-global">
      <i class="pi pi-check-circle" /> {{ toastMsg }}
    </div>
  </Teleport>
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

.nav-item-admin { color: #7c3aed !important; }
.nav-item-admin .pi { color: #7c3aed !important; }

/* ── Hambúrguer: invisível em desktop ── */
.hamburger-btn { display: none; }

/* ══════════════════════════════════════════════════════
   MOBILE — max-width: 768px (não altera nada acima)
   ══════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .topbar { padding: 0 12px; position: relative; }
  .topbar-brand { flex: 1; }
  .topbar-nav   { display: none; }
  .dev-badge    { display: none; }
  .autosave-chip { display: none; }
  .nav-logout   { display: none; }  /* logout fica no mobile-menu */

  .hamburger-btn {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; margin-left: 4px;
    border: 1px solid #e2e8f0; border-radius: 9px;
    background: white; cursor: pointer; flex-shrink: 0;
    color: #64748b; font-size: 16px;
    transition: all 0.14s;
  }
  .hamburger-btn:hover { border-color: #7c3aed; color: #7c3aed; background: #f3e8ff; }

  /* Menu mobile: cai abaixo do topbar sticky */
  .mobile-menu {
    display: flex; flex-direction: column; gap: 2px;
    position: absolute; top: 52px; left: 0; right: 0;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    z-index: 300; padding: 8px;
  }

  .mobile-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 8px; cursor: pointer;
    font-size: 14px; font-weight: 500; color: #374151;
    text-decoration: none; transition: background 0.12s, color 0.12s;
  }
  .mobile-nav-item .pi { font-size: 15px; width: 18px; text-align: center; color: #94a3b8; flex-shrink: 0; }
  .mobile-nav-item:hover { background: #f8fafc; }
  .mobile-nav-item.active { background: #ede9fe; color: #7c3aed; font-weight: 600; }
  .mobile-nav-item.active .pi { color: #7c3aed; }

  .mobile-nav-logout { color: #ef4444; }
  .mobile-nav-logout .pi { color: #ef4444; }
  .mobile-nav-logout:hover { background: #fef2f2; }

  .mobile-nav-sep { height: 1px; background: #f1f5f9; margin: 4px 0; }

  /* Dropdown de notificações: não ultrapassa a tela */
  .notif-dropdown { width: calc(100vw - 32px); right: -8px; }
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

.notif-descartar {
  flex-shrink: 0; width: 22px; height: 22px;
  border: none; background: none; cursor: pointer;
  border-radius: 5px; display: flex; align-items: center; justify-content: center;
  color: #cbd5e1; font-size: 10px;
  opacity: 0; transition: opacity 0.12s, background 0.12s, color 0.12s;
}
.notif-item:hover .notif-descartar { opacity: 1; }
.notif-descartar:hover { background: #fee2e2; color: #ef4444; }

.notif-footer {
  padding: 10px 16px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px; color: #7c3aed; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  transition: background 0.12s;
}
.notif-footer:hover { background: #f3e8ff; }

/* ── Autosave chip ── */
.autosave-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 99px;
  font-size: 11.5px; font-weight: 500; white-space: nowrap;
  flex-shrink: 0;
}
.autosave-chip .pi { font-size: 12px; }
.autosave-chip.saving { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.autosave-chip.saved  { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.autosave-chip.error  { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.autosave-fade-enter-active, .autosave-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.autosave-fade-enter-from, .autosave-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Toast global ── */
.toast-global {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: #1e293b; color: white;
  padding: 10px 18px; border-radius: 8px;
  font-size: 13px; display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  animation: slideUp 0.2s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
