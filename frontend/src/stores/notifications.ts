import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { api } from "../services/api";

export interface Notif {
  id: number;
  tipo: "danger" | "warn" | "success";
  titulo: string;
  corpo: string;
  lida: boolean;
  descartada: boolean;
  chave: string;
  createdAt: string;
}

export const useNotifStore = defineStore("notif", () => {
  const notifs = ref<Notif[]>([]);
  const carregando = ref(false);

  const naoLidas = computed(() => notifs.value.filter((n) => !n.lida).length);

  async function carregar() {
    if (carregando.value) return;
    carregando.value = true;
    try {
      const { data } = await api.get<Notif[]>("/notificacoes");
      notifs.value = data;
    } catch {
      // silencioso — notificações são não-críticas
    } finally {
      carregando.value = false;
    }
  }

  async function marcarLida(id: number) {
    const n = notifs.value.find((n) => n.id === id);
    if (n) n.lida = true;
    try {
      await api.patch(`/notificacoes/${id}/lida`);
    } catch {
      if (n) n.lida = false;
    }
  }

  async function marcarTodasLidas() {
    notifs.value.forEach((n) => (n.lida = true));
    try {
      await api.patch("/notificacoes/lidas");
    } catch {
      await carregar();
    }
  }

  async function descartar(id: number) {
    notifs.value = notifs.value.filter((n) => n.id !== id);
    try {
      await api.patch(`/notificacoes/${id}/descartar`);
    } catch {
      await carregar();
    }
  }

  return { notifs, naoLidas, carregando, carregar, marcarLida, marcarTodasLidas, descartar };
});
