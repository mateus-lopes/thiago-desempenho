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

    <div class="autoria">
      <span class="autoria-label">Desenvolvido por</span>
      <div class="autoria-links">
        <a href="https://github.com/mateus-lopes" target="_blank" rel="noopener" class="autoria-link github">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          mateus-lopes
        </a>
        <span class="autoria-sep">·</span>
        <a href="https://www.linkedin.com/in/mateus-lopes-albano/" target="_blank" rel="noopener" class="autoria-link linkedin">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          LinkedIn
        </a>
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
  position: relative;
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

/* ── Autoria ── */
.autoria {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.autoria-label {
  font-size: 10.5px;
  color: #94a3b8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.autoria-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.autoria-sep {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1;
}

.autoria-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  padding: 5px 11px;
  border-radius: 99px;
  border: 1px solid #e2e8f0;
  background: white;
  transition: all 0.15s;
}

.autoria-link.github { color: #475569; }
.autoria-link.github:hover {
  color: #0f172a;
  border-color: #94a3b8;
  background: #f8fafc;
}

.autoria-link.linkedin { color: #0077b5; }
.autoria-link.linkedin:hover {
  background: #eff8ff;
  border-color: #0077b5;
}
</style>
