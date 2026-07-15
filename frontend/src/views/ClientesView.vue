<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import { api } from '../services/api'
import AppLoader from '../components/AppLoader.vue'

interface Cliente { id: number; nome: string; meta: number; cnpj?: string; contato?: string }

const clientes = ref<Cliente[]>([])
const carregando = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref<number | null>(null)
const form = ref({ nome: '', meta: 0 })
const erro = ref('')

const totalMeta = computed(() => clientes.value.reduce((s, c) => s + c.meta, 0))

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

async function carregarClientes() {
  carregando.value = true
  try {
    const { data } = await api.get('/clientes')
    clientes.value = data
  } finally {
    carregando.value = false
  }
}

onMounted(carregarClientes)

function openNew() {
  isEditing.value = false
  editId.value = null
  form.value = { nome: '', meta: 0 }
  erro.value = ''
  showModal.value = true
}

function openEdit(cl: Cliente) {
  isEditing.value = true
  editId.value = cl.id
  form.value = { nome: cl.nome, meta: cl.meta }
  erro.value = ''
  showModal.value = true
}

async function save() {
  if (!form.value.nome.trim()) { erro.value = 'Nome obrigatório'; return }
  if (form.value.meta <= 0) { erro.value = 'Meta deve ser maior que zero'; return }
  try {
    const payload = { nome: form.value.nome.trim().toUpperCase(), meta: form.value.meta }
    if (isEditing.value && editId.value !== null) {
      await api.put(`/clientes/${editId.value}`, payload)
    } else {
      await api.post('/clientes', payload)
    }
    await carregarClientes()
    showModal.value = false
  } catch {
    erro.value = 'Erro ao salvar. Tente novamente.'
  }
}

async function remove(id: number) {
  try {
    await api.delete(`/clientes/${id}`)
    clientes.value = clientes.value.filter(c => c.id !== id)
  } catch {
    console.error('Erro ao excluir cliente')
  }
}
</script>

<template>
  <div class="page">
    <div class="wrap" style="position:relative">
      <AppLoader :loading="carregando" />

      <div class="page-header">
        <div>
          <div class="page-title">Clientes</div>
          <div class="page-sub">{{ clientes.length }} cliente{{ clientes.length !== 1 ? 's' : '' }} cadastrado{{ clientes.length !== 1 ? 's' : '' }} · Meta total: {{ BRL(totalMeta) }}</div>
        </div>
        <Button label="Novo Cliente" icon="pi pi-plus" @click="openNew" />
      </div>

      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>Nome</th>
              <th>Meta Mensal</th>
              <th class="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cl, i) in clientes" :key="cl.id">
              <td class="col-num">{{ i + 1 }}</td>
              <td><span class="nome-bold">{{ cl.nome }}</span></td>
              <td class="meta-val">{{ BRL(cl.meta) }}</td>
              <td class="col-actions">
                <button class="icon-btn edit" @click="openEdit(cl)" title="Editar">
                  <i class="pi pi-pencil" />
                </button>
                <button class="icon-btn del" @click="remove(cl.id)" title="Excluir">
                  <i class="pi pi-trash" />
                </button>
              </td>
            </tr>
            <tr v-if="!clientes.length">
              <td colspan="4" class="empty-row">Nenhum cliente cadastrado</td>
            </tr>
          </tbody>
          <tfoot v-if="clientes.length">
            <tr>
              <td colspan="2" class="foot-label">Total</td>
              <td class="foot-val">{{ BRL(totalMeta) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  </div>

  <Dialog
    v-model:visible="showModal"
    :header="isEditing ? 'Editar Cliente' : 'Novo Cliente'"
    modal
    style="width: 400px"
  >
    <div class="modal-body">
      <div class="form-field">
        <label>Nome</label>
        <InputText v-model="form.nome" placeholder="Ex: FRIBAL" fluid />
      </div>
      <div class="form-field" style="margin-top: 14px">
        <label>Meta Mensal (R$)</label>
        <InputNumber
          v-model="form.meta"
          mode="currency"
          currency="BRL"
          locale="pt-BR"
          :min="0"
          fluid
        />
      </div>
      <div v-if="erro" class="modal-erro">{{ erro }}</div>
    </div>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="showModal = false" />
      <Button label="Salvar" icon="pi pi-check" @click="save" />
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

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.data-table thead th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
}

.data-table tbody td {
  padding: 12px 14px;
  color: #1e293b;
  border-bottom: 1px solid #f8fafc;
}

.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: #fafbfc; }

.data-table tfoot td {
  padding: 10px 14px;
  border-top: 1px solid #e2e8f0;
  background: #fafafa;
}

.col-num { width: 48px; color: #94a3b8 !important; font-size: 12px !important; }
.col-actions { width: 88px; text-align: center; }

.nome-bold { font-weight: 600; color: #0f172a; }
.meta-val { font-weight: 600; color: #7c3aed; }

.foot-label { font-weight: 600; color: #374151; }
.foot-val { font-weight: 700; color: #7c3aed; font-size: 14px; }

.empty-row {
  text-align: center;
  padding: 32px !important;
  color: #94a3b8;
  font-style: italic;
}

.icon-btn {
  width: 30px; height: 30px;
  border: none; background: none; cursor: pointer;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
  transition: background 0.12s, color 0.12s;
}
.icon-btn.edit { color: #64748b; }
.icon-btn.edit:hover { background: #f3e8ff; color: #7c3aed; }
.icon-btn.del { color: #94a3b8; }
.icon-btn.del:hover { background: #fef2f2; color: #ef4444; }

.modal-body { padding: 4px 0 8px; }
.modal-erro { margin-top: 10px; font-size: 12.5px; color: #dc2626; }
</style>
