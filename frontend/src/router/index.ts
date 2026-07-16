import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CargasView from '../views/CargasView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/', name: 'home', component: HomeView },
    { path: '/cargas', name: 'cargas', component: CargasView },
    { path: '/clientes', name: 'clientes', component: () => import('../views/ClientesView.vue') },
    { path: '/motoristas', name: 'motoristas', component: () => import('../views/MotoristasView.vue') },
    { path: '/metas', name: 'metas', component: () => import('../views/MetasView.vue') },
    { path: '/indicadores', name: 'indicadores', component: () => import('../views/IndicadoresView.vue') },
    { path: '/anual', name: 'anual', component: () => import('../views/AnualView.vue') },
    { path: '/cotacoes', name: 'cotacoes', component: () => import('../views/CotacoesView.vue') },
    { path: '/notificacoes', name: 'notificacoes', component: () => import('../views/NotificacoesView.vue') },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' }
  }
})
