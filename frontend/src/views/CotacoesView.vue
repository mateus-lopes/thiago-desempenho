<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import { api } from '../services/api'
import AppLoader from '../components/AppLoader.vue'

// ── Tipos ─────────────────────────────────────────────────────────────────

interface Row {
  id: number; data: string; clienteId: number | null
  origem: string; destino: string; km: number | null; tipoVeiculo: string
  valorMotorista: number | null; valorEmpresa: number | null; valorNf: number | null
  icmsPercent: number; coPercent: number; impostoPercent: number
  seguroPercent: number; diasPagamento: number; percentComissao: number
  comissaoValor: number; lucro: number; percentRentabilidade: number
  situacao: 'pendente' | 'batida'
}

interface ColDef {
  key: string; label: string; width: number
  type: 'text' | 'date' | 'currency' | 'percent' | 'number' | 'select-cliente' | 'calc' | 'calc-rent' | 'situacao'
  align?: 'right' | 'center'
}

// ── Colunas ───────────────────────────────────────────────────────────────

const COLS: ColDef[] = [
  { key: 'data',                 label: 'Data',          width: 90,  type: 'date' },
  { key: 'clienteId',            label: 'Cliente',       width: 120, type: 'select-cliente' },
  { key: 'origem',               label: 'Origem',        width: 140, type: 'text' },
  { key: 'destino',              label: 'Destino',       width: 140, type: 'text' },
  { key: 'km',                   label: 'KM',            width: 64,  type: 'number',  align: 'right' },
  { key: 'tipoVeiculo',          label: 'Veículo',       width: 100, type: 'text' },
  { key: 'valorEmpresa',         label: 'Vl. Empresa',   width: 110, type: 'currency', align: 'right' },
  { key: 'valorMotorista',       label: 'Vl. Motorista', width: 110, type: 'currency', align: 'right' },
  { key: 'valorNf',              label: 'Vl. NF',        width: 110, type: 'currency', align: 'right' },
  { key: 'percentComissao',      label: 'Com%',          width: 58,  type: 'percent', align: 'right' },
  { key: 'icmsPercent',          label: 'ICMS%',         width: 58,  type: 'percent', align: 'right' },
  { key: 'coPercent',            label: 'C.O%',          width: 54,  type: 'percent', align: 'right' },
  { key: 'impostoPercent',       label: 'Imp%',          width: 54,  type: 'percent', align: 'right' },
  { key: 'diasPagamento',        label: 'Dias Pag.',     width: 68,  type: 'number',  align: 'right' },
  { key: 'comissaoValor',        label: 'Comissão R$',   width: 105, type: 'calc',    align: 'right' },
  { key: 'percentRentabilidade', label: 'Rent%',         width: 65,  type: 'calc-rent' },
  { key: 'lucro',                label: 'Lucro',         width: 100, type: 'calc',    align: 'right' },
  { key: 'situacao',             label: 'Situação',      width: 100, type: 'situacao' },
]

const EDITABLE = COLS.filter(c => !['calc', 'calc-rent', 'situacao'].includes(c.type)).map(c => c.key)

// ── Dados ─────────────────────────────────────────────────────────────────

function emptyRow(id: number, data: string): Row {
  return {
    id, data, clienteId: null,
    origem: '', destino: '', km: null, tipoVeiculo: '',
    valorMotorista: null, valorEmpresa: null, valorNf: null,
    icmsPercent: 4, coPercent: 3.5, impostoPercent: 6.5, seguroPercent: 0.03,
    diasPagamento: 15, percentComissao: 10,
    comissaoValor: 0, lucro: 0, percentRentabilidade: 0,
    situacao: 'pendente',
  }
}

const rows = reactive<Row[]>([])
const clientes = ref<{ id: number; nome: string }[]>([])
const motoristas = ref<{ id: number; nome: string }[]>([])

function recalc(row: Row) {
  const ve = row.valorEmpresa ?? 0; const vm = row.valorMotorista ?? 0; const vn = row.valorNf ?? 0
  if (!ve) { row.comissaoValor = 0; row.lucro = 0; row.percentRentabilidade = 0; return }
  const boletoP = row.diasPagamento * 0.00133
  const totalTaxas = (row.icmsPercent + row.coPercent + row.impostoPercent) / 100 + boletoP
  const adqTab = ve * 0.0085
  const valorImpostoTotal = ve * totalTaxas + adqTab
  const seguroValor = vn * (row.seguroPercent / 100)
  const comissao = (ve - vm) * (row.percentComissao / 100)
  const lucro = ve - vm - seguroValor - valorImpostoTotal - comissao - 17.5
  row.comissaoValor = comissao; row.lucro = lucro; row.percentRentabilidade = lucro / ve
}

let tempIdCounter = -1
function nextTempId() { return tempIdCounter-- }

function apiToRow(c: any): Row {
  return {
    id: c.id, data: c.data, clienteId: c.clienteId,
    origem: c.origem ?? '', destino: c.destino ?? '', km: c.km, tipoVeiculo: c.tipoVeiculo ?? '',
    valorMotorista: c.valorMotorista, valorEmpresa: c.valorEmpresa, valorNf: c.valorNf,
    icmsPercent: c.icmsPercent, coPercent: c.coPercent, impostoPercent: c.impostoPercent,
    seguroPercent: c.seguroPercent, diasPagamento: c.diasPagamento, percentComissao: c.percentComissao,
    comissaoValor: c.comissaoValor, lucro: c.lucro, percentRentabilidade: c.percentRentabilidade,
    situacao: c.situacao,
  }
}

function rowToApiPayload(row: Row) {
  return {
    data: row.data, clienteId: row.clienteId!, origem: row.origem, destino: row.destino,
    km: row.km ?? undefined, tipoVeiculo: row.tipoVeiculo,
    valorMotorista: row.valorMotorista!, valorEmpresa: row.valorEmpresa!,
    valorNf: row.valorNf ?? row.valorEmpresa!,
    icmsPercent: row.icmsPercent, coPercent: row.coPercent, impostoPercent: row.impostoPercent,
    seguroPercent: row.seguroPercent, diasPagamento: row.diasPagamento, percentComissao: row.percentComissao,
    situacao: row.situacao,
  }
}
const today = () => new Date().toISOString().split('T')[0]

// ── Célula ativa ──────────────────────────────────────────────────────────

const activeCell = ref<{ rowId: number; col: string } | null>(null)

function activate(rowId: number, col: string) {
  const rowIdx = filtradas.value.findIndex(r => r.id === rowId)
  if (rowIdx !== -1) scrollRowIntoView(rowIdx)
  activeCell.value = { rowId, col }
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-cell="${rowId}-${col}"] .cell-input`)
    el?.focus()
    if (el instanceof HTMLInputElement) el.select()
  })
}

async function deactivate(row: Row) {
  recalc(row); activeCell.value = null
  const required = row.clienteId != null && row.valorEmpresa != null && row.valorMotorista != null
  if (!required) return
  if (row.id < 0) {
    const { data } = await api.post('/cotacoes', rowToApiPayload(row))
    const idx = rows.findIndex(r => r.id === row.id)
    if (idx !== -1) Object.assign(rows[idx], apiToRow(data))
  } else {
    await api.put(`/cotacoes/${row.id}`, rowToApiPayload(row))
  }
}
function isActive(rowId: number, col: string) { return activeCell.value?.rowId === rowId && activeCell.value?.col === col }

function onCellClick(row: Row, col: ColDef) {
  if (['calc', 'calc-rent'].includes(col.type)) return
  activate(row.id, col.key)
}

function onTab(e: KeyboardEvent, row: Row, colKey: string) {
  e.preventDefault(); recalc(row)
  const ci = EDITABLE.indexOf(colKey); const ri = filtradas.value.findIndex(r => r.id === row.id)
  if (!e.shiftKey) {
    if (ci < EDITABLE.length - 1) activate(row.id, EDITABLE[ci + 1])
    else if (ri < filtradas.value.length - 1) activate(filtradas.value[ri + 1].id, EDITABLE[0])
  } else {
    if (ci > 0) activate(row.id, EDITABLE[ci - 1])
    else if (ri > 0) activate(filtradas.value[ri - 1].id, EDITABLE[EDITABLE.length - 1])
  }
}

function onEnter(e: KeyboardEvent, row: Row, colKey: string) {
  if (e.shiftKey) return; e.preventDefault(); recalc(row)
  const ri = filtradas.value.findIndex(r => r.id === row.id)
  if (ri < filtradas.value.length - 1) activate(filtradas.value[ri + 1].id, colKey)
  else activeCell.value = null
}

function onEscape() { activeCell.value = null }

// ── Redimensionamento / colunas ───────────────────────────────────────────

const colWidths = reactive<Record<string, number>>(Object.fromEntries(COLS.map(c => [c.key, c.width])))
function getColWidth(col: ColDef) { return (colWidths[col.key] ?? col.width) + 'px' }

function startResize(e: MouseEvent, colKey: string) {
  const startX = e.clientX; const startW = colWidths[colKey] ?? 100
  const onMove = (ev: MouseEvent) => { colWidths[colKey] = Math.max(40, startW + ev.clientX - startX) }
  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = '' }
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
}

const hiddenCols = reactive(new Set<string>())
const visibleCols = computed(() => COLS.filter(c => !hiddenCols.has(c.key)))
const totalTableWidth = computed(() => 52 + visibleCols.value.reduce((s, c) => s + (colWidths[c.key] ?? c.width), 0))
const hiddenColsList = computed(() => COLS.filter(c => hiddenCols.has(c.key)))
const showColRestorePanel = ref(false)
function hideColumn(key: string) { hiddenCols.add(key); hideColCtx() }
function showColumn(key: string) { hiddenCols.delete(key); showColRestorePanel.value = false }

// ── Sort / Filtros ────────────────────────────────────────────────────────

const sortState = ref<{ col: string; dir: 'asc' | 'desc' } | null>(null)
function toggleSort(colKey: string) {
  if (sortState.value?.col === colKey) {
    sortState.value = sortState.value.dir === 'asc' ? { col: colKey, dir: 'desc' } : null
  } else { sortState.value = { col: colKey, dir: 'asc' } }
}

const showFilters = ref(false)
const filters = reactive<Record<string, string>>({})
COLS.forEach(c => { filters[c.key] = '' })
const hasActiveFilters = computed(() => COLS.some(c => filters[c.key]?.trim()))
function clearAllFilters() { COLS.forEach(c => { filters[c.key] = '' }) }

// ── Pipeline ───────────────────────────────────────────────────────────────

const situacaoFiltro = ref<'todas' | 'pendente' | 'batida'>('pendente')
const carregando = ref(false)

function filterRow(row: Row, col: ColDef, fv: string): boolean {
  if (!fv) return true
  const f = fv.toLowerCase().trim()
  switch (col.type) {
    case 'select-cliente': return nomeCliente(row.clienteId).toLowerCase().includes(f)
    case 'situacao': return (row.situacao === 'pendente' ? 'pendente' : 'batida').includes(f)
    case 'currency': case 'calc': { const n = (row as any)[col.key] ?? 0; return BRL(n).toLowerCase().includes(f) }
    case 'percent': case 'calc-rent': { const n = (row as any)[col.key] ?? 0; return PCT(n).includes(f) }
    default: return String((row as any)[col.key] ?? '').toLowerCase().includes(f)
  }
}

const filtradas = computed(() => {
  let result = [...rows]
  for (const col of COLS) {
    const fv = filters[col.key]
    if (fv?.trim()) result = result.filter(r => filterRow(r, col, fv))
  }
  if (sortState.value) {
    const { col, dir } = sortState.value
    result = [...result].sort((a, b) => {
      const va = (a as any)[col]; const vb = (b as any)[col]
      if (va == null && vb == null) return 0
      if (va == null) return 1; if (vb == null) return -1
      const cmp = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb
      return dir === 'asc' ? cmp : -cmp
    })
  }
  return result
})

const totais = computed(() => {
  const rs = filtradas.value; const n = rs.length || 1
  return {
    valorEmpresa: rs.reduce((s, r) => s + (r.valorEmpresa ?? 0), 0),
    comissaoValor: rs.reduce((s, r) => s + r.comissaoValor, 0),
    lucro: rs.reduce((s, r) => s + r.lucro, 0),
    percentRentabilidade: rs.reduce((s, r) => s + r.percentRentabilidade, 0) / n,
  }
})

// ── Virtual scroll ────────────────────────────────────────────────────────────
const ROW_HEIGHT = 36
const BUFFER = 8
const excelWrap = ref<HTMLElement | null>(null)
const scrollTopVal = ref(0)
const viewportHeight = ref(600)

function onScroll() {
  scrollTopVal.value = excelWrap.value?.scrollTop ?? 0
}

const visibleRange = computed(() => {
  const count = filtradas.value.length
  const visible = Math.ceil(viewportHeight.value / ROW_HEIGHT)
  const start = Math.max(0, Math.floor(scrollTopVal.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(count, start + visible + BUFFER * 2)
  return { start, end }
})

const visibleRows = computed(() => filtradas.value.slice(visibleRange.value.start, visibleRange.value.end))
const topPadding = computed(() => visibleRange.value.start * ROW_HEIGHT)
const bottomPadding = computed(() => (filtradas.value.length - visibleRange.value.end) * ROW_HEIGHT)

function scrollRowIntoView(rowIdx: number) {
  const wrap = excelWrap.value
  if (!wrap) return
  const rowTop = rowIdx * ROW_HEIGHT
  const rowBottom = rowTop + ROW_HEIGHT
  const viewTop = wrap.scrollTop
  const viewBottom = viewTop + viewportHeight.value
  if (rowTop < viewTop) {
    wrap.scrollTop = Math.max(0, rowTop - BUFFER * ROW_HEIGHT)
    scrollTopVal.value = wrap.scrollTop
  } else if (rowBottom > viewBottom) {
    wrap.scrollTop = rowBottom - viewportHeight.value + BUFFER * ROW_HEIGHT
    scrollTopVal.value = wrap.scrollTop
  }
}

// ── Operações de linha ─────────────────────────────────────────────────────

function addRow() {
  const id = nextTempId(); rows.push(emptyRow(id, today()))
  nextTick(() => activate(id, 'data'))
}

async function deleteRow(id: number) {
  const i = rows.findIndex(r => r.id === id); if (i !== -1) rows.splice(i, 1)
  if (activeCell.value?.rowId === id) activeCell.value = null
  if (id > 0) await api.delete(`/cotacoes/${id}`)
}

function clearCell(row: Row, colKey: string) {
  const col = COLS.find(c => c.key === colKey)
  if (!col || ['calc', 'calc-rent', 'situacao'].includes(col.type)) return
  if (col.type === 'currency' || col.type === 'number') (row as any)[colKey] = null
  else if (col.type === 'percent') (row as any)[colKey] = 0
  else (row as any)[colKey] = ''
  recalc(row)
}

// ── Drag para reordenar ───────────────────────────────────────────────────

const draggingId = ref<number | null>(null)
const dragOverId = ref<number | null>(null)

function onDragStart(e: DragEvent, rowId: number) {
  draggingId.value = rowId
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(rowId)) }
}
function onDragOver(e: DragEvent, rowId: number) {
  if (draggingId.value === null || draggingId.value === rowId) return
  e.preventDefault(); dragOverId.value = rowId
}
function onDragLeave(rowId: number) { if (dragOverId.value === rowId) dragOverId.value = null }
function onDrop(e: DragEvent, targetRowId: number) {
  e.preventDefault()
  if (!draggingId.value || draggingId.value === targetRowId) { draggingId.value = null; dragOverId.value = null; return }
  const fromIdx = rows.findIndex(r => r.id === draggingId.value)
  const toIdx = rows.findIndex(r => r.id === targetRowId)
  if (fromIdx === -1 || toIdx === -1) { draggingId.value = null; dragOverId.value = null; return }
  const [moved] = rows.splice(fromIdx, 1)
  rows.splice(toIdx, 0, moved)
  draggingId.value = null; dragOverId.value = null
}
function onDragEnd() { draggingId.value = null; dragOverId.value = null }

// ── Context menu ───────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; rowId: number; col: string }
const ctxMenu = ref<CtxMenu | null>(null)

interface ColCtxMenu { x: number; y: number; col: ColDef }
const colCtxMenu = ref<ColCtxMenu | null>(null)

function showCtx(e: MouseEvent, row: Row, colKey: string) { e.preventDefault(); ctxMenu.value = { x: e.clientX, y: e.clientY, rowId: row.id, col: colKey } }
function hideCtx() { ctxMenu.value = null }
function showColCtx(e: MouseEvent, col: ColDef) { e.preventDefault(); ctxMenu.value = null; colCtxMenu.value = { x: e.clientX, y: e.clientY, col } }
function hideColCtx() { colCtxMenu.value = null }

function ctxStyle(x: number, y: number, h = 300) {
  const above = y + h > window.innerHeight
  return { position: 'fixed' as const, top: y + 'px', left: x + 'px', transform: above ? 'translateY(-100%)' : 'translateY(4px)' }
}

function ctxCopyCell() {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  const col = COLS.find(c => c.key === ctxMenu.value!.col)
  if (!row || !col) return
  navigator.clipboard.writeText(displayVal(row, col)).catch(() => {})
  showToast(`Copiado: ${displayVal(row, col)}`)
  hideCtx()
}

async function toggleSituacao(row: Row, force?: 'pendente' | 'batida') {
  const next = force ?? (row.situacao === 'pendente' ? 'batida' : 'pendente')
  row.situacao = next
  if (row.id > 0) await api.patch(`/cotacoes/${row.id}`, { situacao: next })
  if (situacaoFiltro.value !== 'todas' && next !== situacaoFiltro.value) {
    const i = rows.findIndex(r => r.id === row.id)
    if (i !== -1) rows.splice(i, 1)
  }
}

async function ctxSetSituacao(s: 'pendente' | 'batida') {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  if (row) await toggleSituacao(row, s)
  hideCtx()
}

function abrirConverterCtx() {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  if (row) abrirConverter(row)
  hideCtx()
}

// ── Modal converter para carga ────────────────────────────────────────────

const converterDialog = ref(false)
const converterRow = ref<Row | null>(null)
const converterForm = reactive({ cte: '', motoristaId: null as number | null })

function abrirConverter(row: Row) {
  converterRow.value = row
  converterForm.cte = ''; converterForm.motoristaId = null
  converterDialog.value = true
}

async function confirmarConverter() {
  if (!converterRow.value || converterForm.motoristaId == null) return
  const id = converterRow.value.id
  await api.post(`/cotacoes/${id}/converter`, {
    motoristaId: converterForm.motoristaId,
    cte: converterForm.cte || undefined,
  })
  const i = rows.findIndex(r => r.id === id); if (i !== -1) rows.splice(i, 1)
  converterDialog.value = false
  showToast('Cotação convertida em carga — acesse a aba Cargas')
}

// ── Modal nova cotação ─────────────────────────────────────────────────────

const dialogAberto = ref(false)
const novaBase = () => ({
  dataObj: new Date(), clienteId: null as number | null,
  origem: '', destino: '', km: null as number | null, tipoVeiculo: '',
  valorEmpresa: null as number | null, valorMotorista: null as number | null, valorNf: null as number | null,
  seguroPercent: 0.03, icmsPercent: 4, coPercent: 3.5, impostoPercent: 6.5,
  diasPagamento: 15, percentComissao: 10,
})
const form = reactive(novaBase())

const calc = computed(() => {
  const ve = form.valorEmpresa ?? 0; const vm = form.valorMotorista ?? 0; const vn = form.valorNf ?? 0
  if (!ve || !vm) return null
  const boletoP = form.diasPagamento * 0.00133
  const totalTaxas = (form.icmsPercent + form.coPercent + form.impostoPercent) / 100 + boletoP
  const adqTab = ve * 0.0085
  const valorImpostoTotal = ve * totalTaxas + adqTab
  const seguroValor = vn * (form.seguroPercent / 100)
  const comissaoValor = (ve - vm) * (form.percentComissao / 100)
  const lucro = ve - vm - seguroValor - valorImpostoTotal - comissaoValor - 17.5
  return { boletoP, totalTaxas, valorImpostoTotal, seguroValor, adqTab, comissaoValor, lucro, rentabilidade: lucro / ve }
})

function abrirDialog() { Object.assign(form, novaBase()); dialogAberto.value = true }

async function salvarModal() {
  if (!calc.value || form.clienteId == null) return
  const { data } = await api.post('/cotacoes', {
    data: form.dataObj.toISOString().split('T')[0], clienteId: form.clienteId,
    origem: form.origem, destino: form.destino, km: form.km ?? undefined, tipoVeiculo: form.tipoVeiculo,
    valorMotorista: form.valorMotorista!, valorEmpresa: form.valorEmpresa!,
    valorNf: form.valorNf ?? form.valorEmpresa!,
    icmsPercent: form.icmsPercent, coPercent: form.coPercent, impostoPercent: form.impostoPercent,
    seguroPercent: form.seguroPercent, diasPagamento: form.diasPagamento, percentComissao: form.percentComissao,
    situacao: 'pendente' as const,
  })
  const newRow = apiToRow(data)
  if (situacaoFiltro.value === 'todas' || situacaoFiltro.value === newRow.situacao) {
    rows.unshift(newRow)
  }
  dialogAberto.value = false
  showToast('Cotação registrada!')
}

// ── Toast ─────────────────────────────────────────────────────────────────

const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  toastMsg.value = msg; clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

// ── Teclado global ────────────────────────────────────────────────────────

function globalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { ctxMenu.value = null; colCtxMenu.value = null; activeCell.value = null; return }
  if (!activeCell.value) return
  const row = rows.find(r => r.id === activeCell.value!.rowId)
  const col = COLS.find(c => c.key === activeCell.value!.col)
  if (!row || !col) return
  if (e.ctrlKey && e.key === 'c') { navigator.clipboard.writeText(displayVal(row, col)).catch(() => {}); showToast(`Copiado: ${displayVal(row, col)}`); return }
  const focused = document.activeElement
  const isInput = focused?.tagName === 'INPUT' || focused?.tagName === 'SELECT'
  if (isInput) return
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearCell(row, col.key); return }
}

function hideAllMenus() { hideCtx(); hideColCtx(); showColRestorePanel.value = false }

async function carregarCotacoes() {
  carregando.value = true
  try {
    const { data } = await api.get(`/cotacoes?situacao=${situacaoFiltro.value}`)
    rows.splice(0, rows.length, ...data.map(apiToRow))
  } finally {
    carregando.value = false
  }
}

async function carregarDados() {
  carregando.value = true
  try {
    const [cotRes, cliRes, motRes] = await Promise.all([
      api.get(`/cotacoes?situacao=${situacaoFiltro.value}`),
      api.get('/clientes'),
      api.get('/motoristas'),
    ])
    rows.splice(0, rows.length, ...cotRes.data.map(apiToRow))
    clientes.value = cliRes.data
    motoristas.value = motRes.data
  } finally {
    carregando.value = false
  }
}

watch(situacaoFiltro, carregarCotacoes)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  document.addEventListener('keydown', globalKeydown)
  document.addEventListener('click', hideAllMenus)
  carregarDados()
  nextTick(() => {
    if (excelWrap.value) {
      viewportHeight.value = excelWrap.value.clientHeight
      resizeObserver = new ResizeObserver(() => {
        viewportHeight.value = excelWrap.value?.clientHeight ?? 600
      })
      resizeObserver.observe(excelWrap.value)
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', globalKeydown)
  document.removeEventListener('click', hideAllMenus)
  resizeObserver?.disconnect()
})

// ── Formatação ────────────────────────────────────────────────────────────

const BRL = (v: number | null) => v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => (v * 100).toFixed(1) + '%'
const fmtData = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }
const nomeCliente = (id: number | null) => clientes.value.find(c => c.id === id)?.nome ?? ''
function rentCor(r: number) { return r >= 0.28 ? 'green' : r >= 0.18 ? 'amber' : 'red' }

function displayVal(row: Row, col: ColDef): string {
  const v = (row as any)[col.key]
  switch (col.type) {
    case 'currency': return v != null ? BRL(v) : ''
    case 'percent': return v != null ? `${Number(v).toFixed(1)}%` : ''
    case 'number': return v != null ? String(v) : ''
    case 'date': return v ? fmtData(v) : ''
    case 'select-cliente': return nomeCliente(v)
    case 'calc': return BRL(v)
    case 'calc-rent': return PCT(v)
    case 'situacao': return v === 'pendente' ? 'Pendente' : 'Batida'
    default: return v ?? ''
  }
}

const opcoesCliente = computed(() => clientes.value.map(c => ({ label: c.nome, value: c.id })))
const opcoesMotorista = computed(() => motoristas.value.map(m => ({ label: m.nome, value: m.id })))
</script>

<template>
  <div class="page" style="position:relative" @click="hideAllMenus">
    <AppLoader :loading="carregando" />

    <!-- Cabeçalho -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Cotações</h1>
        <p class="page-sub">Cotações em negociação — converta para carga quando fechado</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">

        <!-- Filtro por situação -->
        <div class="situacao-tabs">
          <button class="sit-btn" :class="{ ativo: situacaoFiltro === 'todas' }" @click.stop="situacaoFiltro = 'todas'">Todas</button>
          <button class="sit-btn pendente" :class="{ ativo: situacaoFiltro === 'pendente' }" @click.stop="situacaoFiltro = 'pendente'">Pendentes</button>
          <button class="sit-btn batida" :class="{ ativo: situacaoFiltro === 'batida' }" @click.stop="situacaoFiltro = 'batida'">Batidas</button>
        </div>

        <button class="toolbar-btn" :class="{ 'toolbar-btn-active': showFilters }" @click.stop="showFilters = !showFilters">
          <i class="pi pi-filter" /> Filtros <span v-if="hasActiveFilters" class="dot-active" />
        </button>
        <button v-if="hasActiveFilters" class="toolbar-btn" @click.stop="clearAllFilters"><i class="pi pi-filter-slash" /></button>
        <div v-if="hiddenColsList.length" style="position:relative">
          <button class="toolbar-btn" @click.stop="showColRestorePanel = !showColRestorePanel">
            <i class="pi pi-eye-slash" /> Colunas ({{ hiddenColsList.length }})
          </button>
          <div v-if="showColRestorePanel" class="col-restore-panel" @click.stop>
            <button v-for="col in hiddenColsList" :key="col.key" class="col-restore-item" @click="showColumn(col.key)">
              <i class="pi pi-eye" /> {{ col.label }}
            </button>
          </div>
        </div>
        <Button label="Nova Cotação" icon="pi pi-plus" @click.stop="abrirDialog" />
      </div>
    </div>

    <!-- Tabela -->
    <div class="excel-wrap" ref="excelWrap" @scroll.passive="onScroll" @click.stop>
      <table class="excel-table" :style="{ width: totalTableWidth + 'px' }">
        <thead>
          <tr>
            <th class="th-rownum">#</th>
            <th
              v-for="col in visibleCols" :key="col.key"
              :style="{ width: getColWidth(col) }"
              :class="{ 'th-sorted': sortState?.col === col.key, 'th-filter-active': !!filters[col.key]?.trim(), 'th-right': col.align === 'right' }"
              @contextmenu.stop="showColCtx($event, col)"
            >
              <div class="th-inner"><span>{{ col.label }}</span></div>
              <div class="col-resize-handle" @mousedown.stop="startResize($event, col.key)" />
            </th>
            <th class="th-spacer"></th>
          </tr>

          <tr v-if="showFilters" class="filter-row">
            <th class="th-rownum" style="background:#f0f4ff"></th>
            <th v-for="col in visibleCols" :key="col.key" style="padding:3px 4px;background:#f0f4ff;border:1px solid #dde4f0">
              <template v-if="col.type === 'select-cliente'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todos</option>
                  <option v-for="c in clientes" :key="c.id" :value="c.nome.toLowerCase()">{{ c.nome }}</option>
                </select>
              </template>
              <template v-else-if="col.type === 'situacao'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todas</option>
                  <option value="pendente">Pendente</option>
                  <option value="batida">Batida</option>
                </select>
              </template>
              <template v-else>
                <input class="filter-input" type="text" v-model="filters[col.key]" :placeholder="col.label" @click.stop />
              </template>
            </th>
            <th style="background:#f0f4ff;border:1px solid #dde4f0"></th>
            <th class="th-spacer" style="background:#f0f4ff"></th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="topPadding > 0" class="vscroll-pad">
            <td :colspan="visibleCols.length + 2" :style="{ height: topPadding + 'px' }" />
          </tr>
          <tr
            v-for="(row, rowIdx) in visibleRows" :key="row.id"
            class="excel-row"
            :class="{ 'row-active': activeCell?.rowId === row.id, 'row-dragging': draggingId === row.id, 'row-drag-over': dragOverId === row.id, 'row-batida': row.situacao === 'batida' }"
            @contextmenu.stop="showCtx($event, row, activeCell?.col ?? 'data')"
            @dragover="onDragOver($event, row.id)"
            @dragleave="onDragLeave(row.id)"
            @drop="onDrop($event, row.id)"
          >
            <td class="td-rownum td-handle" draggable="true" @dragstart="onDragStart($event, row.id)" @dragend="onDragEnd" @contextmenu.stop="showCtx($event, row, 'data')">
              <i class="pi pi-bars drag-icon" /><span class="row-num">{{ visibleRange.start + rowIdx + 1 }}</span>
            </td>

            <td
              v-for="col in visibleCols" :key="col.key"
              :data-cell="`${row.id}-${col.key}`"
              class="excel-td"
              :class="{ 'td-calc': col.type === 'calc' || col.type === 'calc-rent', 'td-active': isActive(row.id, col.key), 'td-right': col.align === 'right' }"
              @click.stop="onCellClick(row, col)"
              @contextmenu.stop="showCtx($event, row, col.key)"
            >
              <template v-if="!isActive(row.id, col.key) || ['calc','calc-rent','situacao'].includes(col.type)">

                <span v-if="col.type === 'situacao'"
                  class="status-tag" :class="row.situacao"
                  @click.stop="toggleSituacao(row)"
                  title="Clique para alternar"
                >
                  <i :class="row.situacao === 'pendente' ? 'pi pi-clock' : 'pi pi-times-circle'" style="font-size:10px" />
                  {{ row.situacao === 'pendente' ? 'Pendente' : 'Batida' }}
                </span>

                <span v-else-if="col.type === 'calc-rent'" class="rent" :class="rentCor(row.percentRentabilidade)">
                  {{ PCT(row.percentRentabilidade) }}
                </span>

                <span v-else-if="col.key === 'comissaoValor'" style="color:#7c3aed;font-weight:600;padding:0 8px">
                  {{ BRL(row.comissaoValor) }}
                </span>

                <span v-else class="cell-text"
                  :class="{ 'text-right': col.align === 'right', 'text-empty': !displayVal(row, col) }"
                >{{ displayVal(row, col) || '—' }}</span>
              </template>

              <template v-else>
                <input v-if="col.type === 'text'" class="cell-input" type="text"
                  :value="(row as any)[col.key]"
                  @input="(row as any)[col.key] = ($event.target as HTMLInputElement).value"
                  @blur="deactivate(row)" @keydown.tab="onTab($event, row, col.key)"
                  @keydown.enter="onEnter($event, row, col.key)" @keydown.escape.stop="onEscape" />

                <input v-else-if="col.type === 'date'" class="cell-input" type="date"
                  :value="(row as any)[col.key]"
                  @input="(row as any)[col.key] = ($event.target as HTMLInputElement).value"
                  @blur="deactivate(row)" @keydown.tab="onTab($event, row, col.key)"
                  @keydown.enter="onEnter($event, row, col.key)" @keydown.escape.stop="onEscape" />

                <input v-else-if="['currency','percent','number'].includes(col.type)" class="cell-input" type="number"
                  :step="col.type === 'currency' ? '0.01' : col.type === 'percent' ? '0.1' : '1'"
                  :value="(row as any)[col.key]"
                  @input="(row as any)[col.key] = parseFloat(($event.target as HTMLInputElement).value) || 0"
                  @blur="deactivate(row)" @keydown.tab="onTab($event, row, col.key)"
                  @keydown.enter="onEnter($event, row, col.key)" @keydown.escape.stop="onEscape" />

                <select v-else-if="col.type === 'select-cliente'" class="cell-input cell-select"
                  :value="(row as any)[col.key]"
                  @change="(row as any)[col.key] = parseInt(($event.target as HTMLSelectElement).value)"
                  @blur="deactivate(row)" @keydown.tab="onTab($event, row, col.key)"
                  @keydown.escape.stop="onEscape">
                  <option value="">—</option>
                  <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
                </select>
              </template>
            </td>
            <td class="td-spacer"></td>
          </tr>
          <tr v-if="bottomPadding > 0" class="vscroll-pad">
            <td :colspan="visibleCols.length + 2" :style="{ height: bottomPadding + 'px' }" />
          </tr>
        </tbody>

        <tfoot>
          <tr class="totals-row">
            <td class="td-rownum total-label">Σ</td>
            <td v-for="col in visibleCols" :key="col.key" class="total-cell" :class="{ 'td-right': col.align === 'right' }">
              <template v-if="col.key === 'valorEmpresa'"><span class="total-val">{{ BRL(totais.valorEmpresa) }}</span></template>
              <template v-else-if="col.key === 'comissaoValor'"><span class="total-val" style="color:#7c3aed">{{ BRL(totais.comissaoValor) }}</span></template>
              <template v-else-if="col.key === 'lucro'"><span class="total-val" style="color:#16a34a">{{ BRL(totais.lucro) }}</span></template>
              <template v-else-if="col.key === 'percentRentabilidade'"><span class="total-val rent" :class="rentCor(totais.percentRentabilidade)">{{ PCT(totais.percentRentabilidade) }}</span></template>
              <span v-else />
            </td>
            <td class="td-spacer"></td>
          </tr>
          <tr>
            <td :colspan="visibleCols.length + 2" style="padding:0;border:1px solid #e8ecf0">
              <button class="add-row-btn" @click.stop="addRow"><i class="pi pi-plus" /> Adicionar linha</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="shortcuts-hint">
      <span><kbd>Tab</kbd> próxima célula</span>
      <span><kbd>Enter</kbd> linha abaixo</span>
      <span><kbd>Del</kbd> limpar célula</span>
      <span><kbd>Botão direito</kbd> mais opções</span>
    </div>
  </div>

  <!-- ── Context menu ───────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="ctxMenu" class="ctx-menu" :style="ctxStyle(ctxMenu.x, ctxMenu.y)" @click.stop>
      <button class="ctx-item ctx-converter" @click="abrirConverterCtx">
        <i class="pi pi-arrow-right-arrow-left" style="color:#16a34a" /> Converter para Carga
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="ctxSetSituacao('pendente')"><i class="pi pi-clock" /> Marcar como Pendente</button>
      <button class="ctx-item" @click="ctxSetSituacao('batida')"><i class="pi pi-times-circle" style="color:#ef4444" /> Marcar como Batida</button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="ctxCopyCell"><i class="pi pi-clipboard" /> Copiar valor da célula</button>
      <div class="ctx-sep"></div>
      <button class="ctx-item ctx-danger" @click="deleteRow(ctxMenu.rowId); hideCtx()"><i class="pi pi-trash" /> Excluir linha</button>
    </div>
  </Teleport>

  <!-- ── Context menu coluna ───────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="colCtxMenu" class="ctx-menu" :style="ctxStyle(colCtxMenu.x, colCtxMenu.y, 220)" @click.stop>
      <div class="col-ctx-filter">
        <label>Filtrar por {{ colCtxMenu.col.label }}</label>
        <div style="display:flex;gap:4px;align-items:center">
          <input class="filter-input" type="text" v-model="filters[colCtxMenu.col.key]" placeholder="Digite para filtrar..." autofocus @click.stop />
          <button v-if="filters[colCtxMenu.col.key]" class="col-ctx-clear" @click.stop="filters[colCtxMenu.col.key] = ''">✕</button>
        </div>
      </div>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="sortState = { col: colCtxMenu.col.key, dir: 'asc' }; hideColCtx()"><i class="pi pi-sort-amount-up-alt" /> Ordenar A → Z</button>
      <button class="ctx-item" @click="sortState = { col: colCtxMenu.col.key, dir: 'desc' }; hideColCtx()"><i class="pi pi-sort-amount-down-alt" /> Ordenar Z → A</button>
      <div class="ctx-sep"></div>
      <button class="ctx-item ctx-danger" @click="hideColumn(colCtxMenu.col.key)"><i class="pi pi-eye-slash" /> Ocultar coluna</button>
    </div>
  </Teleport>

  <!-- ── Toast ─────────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="toastMsg" class="toast"><i class="pi pi-check-circle" /> {{ toastMsg }}</div>
  </Teleport>

  <!-- ── Modal Converter para Carga ────────────────────────────────────── -->
  <Dialog v-model:visible="converterDialog" header="Converter para Carga" :style="{ width: '420px' }" modal :draggable="false">
    <p style="font-size:13px;color:#64748b;margin-bottom:18px">
      Preencha os dados que faltam para registrar a carga. A cotação será removida da lista.
    </p>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-field">
        <label>Motorista <span style="color:#ef4444">*</span></label>
        <Select v-model="converterForm.motoristaId" :options="opcoesMotorista" optionLabel="label" optionValue="value" placeholder="Selecione o motorista" fluid />
      </div>
      <div class="form-field">
        <label>CTE <span style="color:#94a3b8;font-weight:400">(opcional)</span></label>
        <InputText v-model="converterForm.cte" placeholder="Número do CTE" fluid />
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="converterDialog = false" />
      <Button label="Confirmar e Converter" icon="pi pi-check" :disabled="converterForm.motoristaId == null" @click="confirmarConverter" />
    </template>
  </Dialog>

  <!-- ── Modal Nova Cotação ─────────────────────────────────────────────── -->
  <Dialog v-model:visible="dialogAberto" header="Nova Cotação" :style="{ width: '780px' }" modal :draggable="false">
    <div class="form-2col">
      <div class="form-field"><label>Data</label><DatePicker v-model="form.dataObj" dateFormat="dd/mm/yy" showIcon fluid /></div>
      <div class="form-field"><label>Cliente</label><Select v-model="form.clienteId" :options="opcoesCliente" optionLabel="label" optionValue="value" placeholder="Selecione" fluid /></div>
      <div class="form-field"><label>Origem</label><InputText v-model="form.origem" placeholder="ex: São Paulo/SP" /></div>
      <div class="form-field"><label>Destino</label><InputText v-model="form.destino" placeholder="ex: Salvador/BA" /></div>
      <div class="form-field"><label>KM <span style="color:#94a3b8;font-weight:400">(opcional)</span></label><InputNumber v-model="form.km" suffix=" km" fluid /></div>
      <div class="form-field"><label>Tipo de Veículo</label><InputText v-model="form.tipoVeiculo" placeholder="ex: CARRETA, TRUCK" /></div>
      <div class="form-field"><label>Valor Empresa (R$)</label><InputNumber v-model="form.valorEmpresa" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Valor Motorista (R$)</label><InputNumber v-model="form.valorMotorista" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Valor NF (R$)</label><InputNumber v-model="form.valorNf" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Comissão (%)</label><InputNumber v-model="form.percentComissao" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>ICMS (%)</label><InputNumber v-model="form.icmsPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>C.O (%)</label><InputNumber v-model="form.coPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>Imposto (%)</label><InputNumber v-model="form.impostoPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>Seguro (%)</label><InputNumber v-model="form.seguroPercent" suffix="%" :minFractionDigits="3" fluid /></div>
      <div class="form-field form-full"><label>Dias para Pagamento</label><InputNumber v-model="form.diasPagamento" suffix=" dias" fluid /></div>
    </div>

    <div class="calc-box" v-if="calc">
      <h4><i class="pi pi-calculator" style="margin-right:6px;color:#7c3aed" />Cálculo em tempo real</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 20px">
        <div>
          <div class="calc-row"><span class="lbl">Seguro</span><span class="val">{{ BRL(calc.seguroValor) }}</span></div>
          <div class="calc-row"><span class="lbl">Impostos+Taxas</span><span class="val">{{ BRL(calc.valorImpostoTotal) }}</span></div>
          <div class="calc-row"><span class="lbl">Boleto fixo</span><span class="val">R$ 17,50</span></div>
        </div>
        <div>
          <div class="calc-row"><span class="lbl">ADQ TAB</span><span class="val">{{ BRL(calc.adqTab) }}</span></div>
          <div class="calc-row"><span class="lbl">Custo fin.</span><span class="val">{{ (calc.boletoP * 100).toFixed(2) }}%</span></div>
          <div class="calc-row"><span class="lbl">Total taxas</span><span class="val">{{ (calc.totalTaxas * 100).toFixed(2) }}%</span></div>
        </div>
        <div>
          <div class="calc-row"><span class="lbl">Comissão</span><span class="val accent">{{ BRL(calc.comissaoValor) }}</span></div>
        </div>
      </div>
      <div class="calc-row highlight"><span class="lbl">Lucro</span><span class="val" :class="calc.lucro >= 0 ? 'lucro-pos' : 'lucro-neg'">{{ BRL(calc.lucro) }}</span></div>
      <div class="calc-row highlight" style="border-top:none;padding-top:4px">
        <span class="lbl">Rentabilidade</span>
        <span class="val" :class="`rent ${rentCor(calc.rentabilidade)}`" style="font-size:16px">{{ PCT(calc.rentabilidade) }}</span>
      </div>
    </div>
    <div v-else class="calc-box" style="color:#94a3b8;font-size:13px;text-align:center;padding:14px">
      Preencha Valor Empresa e Valor Motorista para ver o cálculo
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="dialogAberto = false" />
      <Button label="Salvar Cotação" icon="pi pi-check" :disabled="!calc || form.clienteId == null" @click="salvarModal" />
    </template>
  </Dialog>
</template>

<style scoped>
/* ── Toolbar ────────────────────────────────────────────────────── */
.toolbar-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 7px;
  border: 1px solid #e2e8f0; background: white;
  font-size: 13px; color: #64748b; cursor: pointer; transition: all 0.14s; position: relative;
}
.toolbar-btn:hover { border-color: #7c3aed; color: #7c3aed; }
.toolbar-btn-active { background: #f3e8ff; border-color: #7c3aed; color: #7c3aed; }
.dot-active { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: #7c3aed; border-radius: 50%; }

/* ── Tabs de situação ───────────────────────────────────────────── */
.situacao-tabs { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.sit-btn {
  padding: 6px 14px; border: none; background: white;
  font-size: 13px; color: #64748b; cursor: pointer; transition: all 0.14s;
}
.sit-btn + .sit-btn { border-left: 1px solid #e2e8f0; }
.sit-btn.ativo { background: #f3e8ff; color: #7c3aed; font-weight: 600; }
.sit-btn.pendente.ativo { background: #fef9c3; color: #a16207; }
.sit-btn.batida.ativo { background: #fee2e2; color: #dc2626; }

/* ── Status tags ────────────────────────────────────────────────── */
.status-tag.pendente { background: #fef9c3; color: #a16207; }
.status-tag.batida   { background: #fee2e2; color: #dc2626; }

/* ── Linhas batidas ─────────────────────────────────────────────── */
.row-batida td { opacity: 0.55; }
.row-batida:hover td { opacity: 1 !important; }

/* ── Resize handle ──────────────────────────────────────────────── */
.col-resize-handle {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 6px; cursor: col-resize; z-index: 2; transition: background 0.12s;
}
.col-resize-handle:hover { background: rgba(124,58,237,0.25); }

/* ── Tabela ─────────────────────────────────────────────────────── */
.excel-wrap {
  overflow: auto; max-height: calc(100vh - 200px);
  border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
  background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.excel-table { border-collapse: collapse; table-layout: fixed; font-size: 12.5px; }
.th-spacer { width: auto; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
.td-spacer { border-bottom: 1px solid #e8ecf0; background: white; }
.totals-row .td-spacer { background: #f0f4ff !important; }

.excel-table thead th {
  position: sticky; top: 0; z-index: 10; background: #f8fafc;
  border: 1px solid #e2e8f0; padding: 6px 14px 6px 8px; overflow: visible;
  font-size: 11px; font-weight: 600; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.04em;
  white-space: nowrap; user-select: none; cursor: default; transition: background 0.12s;
}
.excel-table thead th:hover { background: #f0f4ff; }
.th-sorted { background: #ede9fe !important; color: #7c3aed !important; }
.th-filter-active { color: #7c3aed !important; }
.th-rownum { width: 52px; min-width: 52px; text-align: center; cursor: default !important; }
.th-right .th-inner { justify-content: flex-end; }
.th-inner { display: flex; align-items: center; gap: 5px; }

.filter-row th { position: sticky; top: 33px; z-index: 9; }
.filter-input {
  width: 100%; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px;
  padding: 2px 6px; font-size: 11.5px; background: white; color: #374151;
  font-family: inherit; box-sizing: border-box;
}
.filter-input:focus { outline: 2px solid #7c3aed; outline-offset: -1px; border-color: transparent; }

.excel-row { transition: background 0.08s; }
.excel-row:nth-child(even) td { background: #fdfdfe; }
.excel-row:hover td { background: #f8faff !important; }
.row-active td:not(.td-calc) { background: #faf8ff !important; }
.td-rownum { width: 52px; border: 1px solid #e8ecf0; background: #f8fafc !important; text-align: center; color: #94a3b8; font-size: 11px; padding: 0 4px; user-select: none; }
.td-handle { cursor: grab; display: flex; align-items: center; justify-content: center; gap: 3px; }
.td-handle:active { cursor: grabbing; }
.drag-icon { font-size: 11px; color: #cbd5e1; opacity: 0; transition: opacity 0.12s; flex-shrink: 0; }
.excel-row:hover .drag-icon { opacity: 1; }
.row-num { flex-shrink: 0; font-size: 12px; }
.row-dragging td { opacity: 0.4; }
.row-drag-over td { box-shadow: 0 -2px 0 0 #7c3aed inset !important; background: #f5f0ff !important; }

.excel-td {
  border: 1px solid #e8ecf0; height: 36px; padding: 0; vertical-align: middle;
  cursor: cell; position: relative; background: white; overflow: hidden;
}
.excel-td.td-calc { background: #f8fafc !important; cursor: default; }
.excel-td.td-active { outline: 2px solid #6366f1; outline-offset: -2px; z-index: 5; }

.cell-text { display: flex; align-items: center; padding: 4px 8px; height: 36px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-text.text-right { justify-content: flex-end; }
.cell-text.text-empty { color: #cbd5e1; font-style: italic; }
.td-right .cell-text { justify-content: flex-end; }

.cell-input { display: block; width: 100%; height: 36px; border: none; outline: 2px solid #6366f1; outline-offset: -2px; padding: 4px 8px; font-size: 12.5px; font-family: inherit; background: white; color: #1e293b; box-sizing: border-box; }
.cell-input[type="number"] { text-align: right; }
.cell-input[type="date"] { padding: 4px; }
.cell-select { appearance: none; cursor: pointer; }

.totals-row td { border: 1px solid #e2e8f0; background: #f0f4ff !important; padding: 0; height: 30px; }
.total-label { text-align: center; font-weight: 700; font-size: 13px; color: #7c3aed; background: #ede9fe !important; }
.total-cell { vertical-align: middle; }
.total-val { display: flex; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 12.5px; color: #374151; white-space: nowrap; }
.td-right .total-val { justify-content: flex-end; }

.add-row-btn { display: flex; align-items: center; gap: 7px; width: 100%; padding: 8px 14px; border: none; background: none; color: #94a3b8; font-size: 12.5px; font-family: inherit; cursor: pointer; transition: all 0.14s; }
.add-row-btn:hover { background: #f0f4ff; color: #7c3aed; }

.vscroll-pad td { border: none !important; padding: 0 !important; background: white !important; pointer-events: none; }

.shortcuts-hint { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; padding: 0 20px; font-size: 11.5px; color: #94a3b8; }
.shortcuts-hint kbd { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 5px; font-family: inherit; font-size: 10.5px; color: #64748b; }

/* ── Context menu ───────────────────────────────────────────────── */
.ctx-menu { position: fixed; z-index: 9999; background: white; border: 1px solid #e2e8f0; border-radius: 9px; box-shadow: 0 8px 28px rgba(0,0,0,0.13); padding: 4px; min-width: 210px; }
.ctx-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 12px; border: none; background: none; border-radius: 6px; font-size: 13px; color: #374151; cursor: pointer; text-align: left; transition: background 0.1s; }
.ctx-item .pi { font-size: 13px; width: 14px; text-align: center; color: #64748b; }
.ctx-item:hover { background: #f8fafc; }
.ctx-converter:hover { background: #f0fdf4 !important; color: #16a34a !important; }
.ctx-danger { color: #ef4444 !important; }
.ctx-danger .pi { color: #ef4444 !important; }
.ctx-danger:hover { background: #fef2f2 !important; }
.ctx-sep { height: 1px; background: #f1f5f9; margin: 4px 0; }

.col-ctx-filter { padding: 8px 10px 6px; display: flex; flex-direction: column; gap: 6px; }
.col-ctx-filter label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.col-ctx-clear { flex-shrink: 0; width: 22px; height: 24px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; color: #64748b; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }
.col-ctx-clear:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

.col-restore-panel { position: absolute; top: calc(100% + 6px); right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 9px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); padding: 4px; z-index: 500; min-width: 160px; }
.col-restore-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 12px; border: none; background: none; border-radius: 6px; font-size: 13px; cursor: pointer; color: #374151; font-family: inherit; }
.col-restore-item:hover { background: #f0f4ff; color: #7c3aed; }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; background: #1e293b; color: white; padding: 10px 18px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); animation: slideUp 0.2s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
