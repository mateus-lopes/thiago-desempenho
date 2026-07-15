<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const senha = ref("");
const erro = ref("");
const carregando = ref(false);
const mostrarSenha = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function entrar() {
  erro.value = "";
  carregando.value = true;

  try {
    const { data } = await api.post("/auth/login", { email: email.value, senha: senha.value });
    auth.setToken(data.token);
    router.push("/");
  } catch {
    erro.value = "Email ou senha inválidos.";
  } finally {
    carregando.value = false;
  }
}
</script>

<template>
  <div class="login-bg">
    <div class="login-card">

      <!-- Header com logo -->
      <div class="card-header">
        <img src="/logo-godi.webp" alt="Godi Transportes" class="logo" />
        <p class="header-sub">Sistema de Desempenho</p>
      </div>

      <!-- Form -->
      <div class="card-body">
        <form @submit.prevent="entrar">

          <div class="field">
            <label for="email">Email</label>
            <div class="input-wrap">
              <i class="pi pi-envelope input-icon" />
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="seu@email.com"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <div class="field">
            <label for="senha">Senha</label>
            <div class="input-wrap">
              <i class="pi pi-lock input-icon" />
              <input
                id="senha"
                v-model="senha"
                :type="mostrarSenha ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="toggle-senha" @click="mostrarSenha = !mostrarSenha" tabindex="-1">
                <i :class="`pi ${mostrarSenha ? 'pi-eye-slash' : 'pi-eye'}`" />
              </button>
            </div>
          </div>

          <p v-if="erro" class="erro">
            <i class="pi pi-exclamation-circle" /> {{ erro }}
          </p>

          <button type="submit" class="btn-entrar" :disabled="carregando">
            <i v-if="carregando" class="pi pi-spin pi-spinner" />
            {{ carregando ? 'Entrando...' : 'Entrar' }}
          </button>

        </form>
      </div>

    </div>
  </div>
</template>

<style scoped>
.login-bg {
  flex: 1;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05), 0 20px 48px rgba(0,0,0,0.12);
}

/* ── Header ── */
.card-header {
  background: linear-gradient(135deg, #0a0e1a 0%, #111827 100%);
  padding: 36px 32px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.card-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c8d7, #00e87a);
}

.logo {
  height: 52px;
  width: auto;
  object-fit: contain;
}

.header-sub {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

/* ── Body ── */
.card-body {
  background: #ffffff;
  padding: 32px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  font-size: 13px;
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  padding: 11px 40px 11px 38px;
  color: #1e293b;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input-wrap input::placeholder { color: #cbd5e1; }

.input-wrap input:focus {
  border-color: #00c8d7;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 200, 215, 0.12);
}

.toggle-senha {
  position: absolute;
  right: 11px;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 13px;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.12s;
}
.toggle-senha:hover { color: #00c8d7; }

.erro {
  font-size: 12.5px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -6px 0 14px;
}

.btn-entrar {
  width: 100%;
  padding: 12px;
  background: linear-gradient(90deg, #00c8d7, #00e87a);
  color: #0a0e1a;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.03em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 4px 14px rgba(0, 200, 215, 0.3);
}

.btn-entrar:hover:not(:disabled) { opacity: 0.9; }
.btn-entrar:active:not(:disabled) { transform: scale(0.98); }
.btn-entrar:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
