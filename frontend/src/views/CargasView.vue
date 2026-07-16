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
import { useToast } from '../composables/useToast'
import { getRowCache, setRowCache } from '../composables/useRowCache'

const { showToast } = useToast()

// ── Tipos ─────────────────────────────────────────────────────────────────

interface Row {
  id: number; data: string; cte: string; origem: string; destino: string
  clienteId: number | null; motoristaId: number | null
  valorEmpresa: number | null; valorMotorista: number | null; valorNf: number | null
  icmsPercent: number; coPercent: number; impostoPercent: number
  seguroPercent: number; diasPagamento: number; percentComissao: number
  status: 'em_andamento' | 'entregue'; canhotoPago: boolean
  comissaoValor: number; lucro: number; percentRentabilidade: number
}

interface ColDef {
  key: string; label: string; width: number
  type: 'text' | 'date' | 'currency' | 'percent' | 'number' | 'select-cliente' | 'select-motorista' | 'calc' | 'calc-rent' | 'status' | 'checkbox'
  align?: 'right' | 'center'
}

// ── Colunas ───────────────────────────────────────────────────────────────

const COLS: ColDef[] = [
  { key: 'data',                 label: 'Data',         width: 90,  type: 'date' },
  { key: 'cte',                  label: 'CTE',          width: 72,  type: 'text' },
  { key: 'origem',               label: 'Origem',       width: 138, type: 'text' },
  { key: 'destino',              label: 'Destino',      width: 138, type: 'text' },
  { key: 'clienteId',            label: 'Cliente',      width: 110, type: 'select-cliente' },
  { key: 'motoristaId',          label: 'Motorista',    width: 164, type: 'select-motorista' },
  { key: 'valorEmpresa',         label: 'Vl. Empresa',  width: 110, type: 'currency',        align: 'right' },
  { key: 'valorMotorista',       label: 'Vl. Motorista',width: 110, type: 'currency',        align: 'right' },
  { key: 'percentComissao',      label: 'Com%',         width: 58,  type: 'percent',         align: 'right' },
  { key: 'icmsPercent',          label: 'ICMS%',        width: 58,  type: 'percent',         align: 'right' },
  { key: 'coPercent',            label: 'C.O%',         width: 54,  type: 'percent',         align: 'right' },
  { key: 'impostoPercent',       label: 'Imp%',         width: 54,  type: 'percent',         align: 'right' },
  { key: 'seguroPercent',        label: 'Seg%',         width: 54,  type: 'percent',         align: 'right' },
  { key: 'diasPagamento',        label: 'Dias Pag.',    width: 68,  type: 'number',          align: 'right' },
  { key: 'comissaoValor',        label: 'Comissão R$',  width: 105, type: 'calc',            align: 'right' },
  { key: 'percentRentabilidade', label: 'Rent%',        width: 65,  type: 'calc-rent',       align: 'right' },
  { key: 'lucro',                label: 'Lucro',        width: 100, type: 'calc',            align: 'right' },
  { key: 'status',               label: 'Status',       width: 116, type: 'status' },
  { key: 'canhotoPago',          label: 'Canhoto',      width: 68,  type: 'checkbox',        align: 'center' },
]

const EDITABLE = COLS.filter(c => !['calc', 'calc-rent', 'status', 'checkbox'].includes(c.type)).map(c => c.key)
const NUMERIC_COLS = ['valorEmpresa', 'valorMotorista', 'valorNf', 'icmsPercent', 'coPercent', 'impostoPercent', 'seguroPercent', 'diasPagamento', 'percentComissao']

// ── Dados ─────────────────────────────────────────────────────────────────

function emptyRow(id: number, data: string): Row {
  return {
    id, data, cte: '', origem: '', destino: '',
    clienteId: null, motoristaId: null,
    valorEmpresa: null, valorMotorista: null, valorNf: null,
    icmsPercent: 4, coPercent: 3.5, impostoPercent: 4, seguroPercent: 0.3,
    diasPagamento: 30, percentComissao: 10,
    status: 'em_andamento', canhotoPago: false,
    comissaoValor: 0, lucro: 0, percentRentabilidade: 0,
  }
}

let tempIdCounter = -1
function nextTempId() { return tempIdCounter-- }

const rows = reactive<Row[]>([])
const clientes = ref<{ id: number; nome: string }[]>([])
const motoristas = ref<{ id: number; nome: string; percentComissao: number }[]>([])

function apiToRow(c: any): Row {
  return {
    id: c.id, data: c.data, cte: c.cte ?? '', origem: c.origem ?? '', destino: c.destino ?? '',
    clienteId: c.clienteId, motoristaId: c.motoristaId,
    valorEmpresa: c.valorEmpresa, valorMotorista: c.valorMotorista, valorNf: c.valorNf,
    icmsPercent: +(c.icmsPercent * 100).toFixed(4), coPercent: +(c.coPercent * 100).toFixed(4),
    impostoPercent: +(c.impostoPercent * 100).toFixed(4), seguroPercent: +(c.seguroPercent * 100).toFixed(4),
    diasPagamento: c.diasPagamento, percentComissao: +(c.percentComissao * 100).toFixed(4),
    status: c.status, canhotoPago: c.canhotoPago,
    comissaoValor: c.comissaoValor, lucro: c.lucro, percentRentabilidade: c.percentRentabilidade,
  }
}

function rowToApiPayload(row: Row) {
  return {
    data: row.data, cte: row.cte || undefined, origem: row.origem || undefined,
    destino: row.destino || undefined,
    clienteId: row.clienteId!, motoristaId: row.motoristaId!,
    valorEmpresa: row.valorEmpresa!, valorMotorista: row.valorMotorista!,
    valorNf: row.valorNf ?? row.valorEmpresa!,
    seguroPercent: row.seguroPercent / 100, icmsPercent: row.icmsPercent / 100,
    coPercent: row.coPercent / 100, impostoPercent: row.impostoPercent / 100,
    diasPagamento: row.diasPagamento, percentComissao: row.percentComissao / 100,
    status: row.status, canhotoPago: row.canhotoPago,
  }
}

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

const today = () => new Date().toISOString().split('T')[0]

// ── Célula ativa ──────────────────────────────────────────────────────────

const activeCell = ref<{ rowId: number; col: string } | null>(null)

function activate(rowId: number, col: string) {
  activeCell.value = { rowId, col }
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-cell="${rowId}-${col}"] .cell-input`)
    el?.focus()
    if (el instanceof HTMLInputElement) el.select()
  })
}

async function deactivate(row: Row) {
  recalc(row)
  activeCell.value = null
  if (!row.clienteId || !row.motoristaId || !row.valorEmpresa || !row.valorMotorista) return
  try {
    if (row.id < 0) {
      const { data } = await api.post('/cargas', rowToApiPayload(row))
      row.id = data.id
      row.comissaoValor = data.comissaoValor
      row.lucro = data.lucro
      row.percentRentabilidade = data.percentRentabilidade
    } else {
      const { data } = await api.put(`/cargas/${row.id}`, rowToApiPayload(row))
      row.comissaoValor = data.comissaoValor
      row.lucro = data.lucro
      row.percentRentabilidade = data.percentRentabilidade
    }
  } catch { console.error('Erro ao salvar carga') }
}
function isActive(rowId: number, col: string) { return activeCell.value?.rowId === rowId && activeCell.value?.col === col }

function onCellClick(row: Row, col: ColDef) {
  if (['calc', 'calc-rent'].includes(col.type)) return
  activate(row.id, col.key)
}

function onTab(e: KeyboardEvent, row: Row, colKey: string) {
  e.preventDefault(); recalc(row)
  const ci = EDITABLE.indexOf(colKey); const ri = cargasFiltradas.value.findIndex(r => r.id === row.id)
  if (!e.shiftKey) {
    if (ci < EDITABLE.length - 1) activate(row.id, EDITABLE[ci + 1])
    else if (ri < cargasFiltradas.value.length - 1) activate(cargasFiltradas.value[ri + 1].id, EDITABLE[0])
  } else {
    if (ci > 0) activate(row.id, EDITABLE[ci - 1])
    else if (ri > 0) activate(cargasFiltradas.value[ri - 1].id, EDITABLE[EDITABLE.length - 1])
  }
}

function onEnter(e: KeyboardEvent, row: Row, colKey: string) {
  if (e.shiftKey) return; e.preventDefault(); recalc(row)
  const ri = cargasFiltradas.value.findIndex(r => r.id === row.id)
  if (ri < cargasFiltradas.value.length - 1) activate(cargasFiltradas.value[ri + 1].id, colKey)
  else activeCell.value = null
}

function onEscape() { activeCell.value = null }

// ── Quebra de texto ───────────────────────────────────────────────────────

const wrapText = ref(false)

// ── Redimensionamento de colunas ──────────────────────────────────────────

function defaultColWidth(col: ColDef): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 11px system-ui, "Segoe UI", Roboto, sans-serif'
  const textW = ctx.measureText(col.label.toUpperCase()).width
  return Math.max(Math.ceil(textW + 52), 60) // 52 = padding + ícone sort + handle
}

const colWidths = reactive<Record<string, number>>(Object.fromEntries(COLS.map(c => [c.key, defaultColWidth(c)])))

function getColWidth(col: ColDef): string {
  return (colWidths[col.key] ?? col.width) + 'px'
}

function startResize(e: MouseEvent, colKey: string) {
  const startX = e.clientX
  const startWidth = colWidths[colKey] ?? (COLS.find(c => c.key === colKey)?.width ?? 100)

  function onMove(ev: MouseEvent) {
    const newWidth = Math.max(40, startWidth + ev.clientX - startX)
    colWidths[colKey] = newWidth
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function autoFit(colKey: string) {
  const col = COLS.find(c => c.key === colKey)
  if (!col) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Mede o header
  ctx.font = '600 11px system-ui, "Segoe UI", Roboto, sans-serif'
  let max = ctx.measureText(col.label).width + 52 // padding + ícone sort

  // Mede cada célula visível
  ctx.font = '12.5px system-ui, "Segoe UI", Roboto, sans-serif'
  for (const row of cargasFiltradas.value) {
    const val = displayVal(row, col)
    const w = ctx.measureText(val).width + 24
    if (w > max) max = w
  }

  colWidths[colKey] = Math.ceil(Math.max(max, 40))
}

// ── Colunas visíveis / ocultas ────────────────────────────────────────────

const hiddenCols = reactive(new Set<string>())
const visibleCols = computed(() => COLS.filter(c => !hiddenCols.has(c.key)))

const totalTableWidth = computed(() =>
  52 + visibleCols.value.reduce((s, c) => s + (colWidths[c.key] ?? c.width), 0)
)
const hiddenColsList = computed(() => COLS.filter(c => hiddenCols.has(c.key)))
const showColRestorePanel = ref(false)

function hideColumn(key: string) { hiddenCols.add(key); hideColCtx() }
function showColumn(key: string) { hiddenCols.delete(key); showColRestorePanel.value = false }

// ── Menu de contexto de coluna ────────────────────────────────────────────

interface ColCtxMenu { x: number; y: number; col: ColDef }
const colCtxMenu = ref<ColCtxMenu | null>(null)

function showColCtx(e: MouseEvent, col: ColDef) {
  e.preventDefault()
  ctxMenu.value = null
  colCtxMenu.value = { x: e.clientX, y: e.clientY, col }
}
function hideColCtx() { colCtxMenu.value = null }

function ctxStyle(x: number, y: number, estimatedHeight = 300) {
  const above = y + estimatedHeight > window.innerHeight
  return {
    position: 'fixed' as const,
    top: y + 'px',
    left: x + 'px',
    transform: above ? 'translateY(-100%)' : 'translateY(4px)',
  }
}

// ── Sort ─────────────────────────────────────────────────────────────────

const sortState = ref<{ col: string; dir: 'asc' | 'desc' } | null>(null)

function toggleSort(colKey: string) {
  if (sortState.value?.col === colKey) {
    if (sortState.value.dir === 'asc') sortState.value = { col: colKey, dir: 'desc' }
    else sortState.value = null
  } else {
    sortState.value = { col: colKey, dir: 'asc' }
  }
}

function sortIcon(colKey: string) {
  if (sortState.value?.col !== colKey) return 'pi-sort-alt'
  return sortState.value.dir === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt'
}

// ── Filtros ───────────────────────────────────────────────────────────────

const showFilters = ref(false)
const filters = reactive<Record<string, string>>({})
COLS.forEach(c => { filters[c.key] = '' })

const hasActiveFilters = computed(() => COLS.some(c => filters[c.key]?.trim()))
function clearAllFilters() { COLS.forEach(c => { filters[c.key] = '' }) }

// ── Pipeline de dados ──────────────────────────────────────────────────────

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const mesSelecionado = ref(new Date().getMonth())
const anoSelecionado = ref(new Date().getFullYear())

function filterRow(row: Row, col: ColDef, fv: string): boolean {
  if (!fv) return true
  const f = fv.toLowerCase().trim()
  switch (col.type) {
    case 'select-cliente':   return nomeCliente(row.clienteId).toLowerCase().includes(f)
    case 'select-motorista': return nomeMotorista(row.motoristaId).toLowerCase().includes(f)
    case 'status': return (row.status === 'entregue' ? 'entregue' : 'em andamento').includes(f)
    case 'checkbox': return f === 'sim' ? row.canhotoPago : f === 'nao' || f === 'não' ? !row.canhotoPago : true
    case 'currency': case 'calc': {
      const n = (row as any)[col.key] ?? 0
      return String(n).includes(f) || BRL(n).toLowerCase().includes(f)
    }
    case 'percent': case 'calc-rent': {
      const n = (row as any)[col.key] ?? 0
      return String(n).includes(f) || PCT(n).includes(f)
    }
    default: return String((row as any)[col.key] ?? '').toLowerCase().includes(f)
  }
}

const cargasFiltradas = computed(() => {
  let result = rows.filter(r => new Date(r.data + 'T12:00:00').getMonth() === mesSelecionado.value)
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
  // Sem sort: mantém ordem do array (permite drag-to-reorder)
  return result
})

// ── Totais ────────────────────────────────────────────────────────────────

const totais = computed(() => {
  const rs = cargasFiltradas.value
  const n = rs.length || 1
  let valorEmpresa = 0, valorMotorista = 0, comissaoValor = 0, lucro = 0, percentRentabilidade = 0
  for (const r of rs) {
    valorEmpresa += r.valorEmpresa ?? 0
    valorMotorista += r.valorMotorista ?? 0
    comissaoValor += r.comissaoValor
    lucro += r.lucro
    percentRentabilidade += r.percentRentabilidade
  }
  return { valorEmpresa, valorMotorista, comissaoValor, lucro, percentRentabilidade: percentRentabilidade / n }
})

// ── Virtual scroll ────────────────────────────────────────────────────────
const ROW_HEIGHT = 36
const BUFFER = 8
const excelWrap = ref<HTMLElement | null>(null)
const scrollTopVal = ref(0)
const viewportHeight = ref(600)

function onScroll() { scrollTopVal.value = excelWrap.value?.scrollTop ?? 0 }

const visibleRange = computed(() => {
  const count = cargasFiltradas.value.length
  const visible = Math.ceil(viewportHeight.value / ROW_HEIGHT)
  const start = Math.max(0, Math.floor(scrollTopVal.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(count, start + visible + BUFFER * 2)
  return { start, end }
})

const visibleRows = computed(() => cargasFiltradas.value.slice(visibleRange.value.start, visibleRange.value.end))
const topPadding = computed(() => visibleRange.value.start * ROW_HEIGHT)
const bottomPadding = computed(() => (cargasFiltradas.value.length - visibleRange.value.end) * ROW_HEIGHT)

function scrollRowIntoView(rowIdx: number) {
  const wrap = excelWrap.value
  if (!wrap) return
  const rowTop = rowIdx * ROW_HEIGHT
  const rowBottom = rowTop + ROW_HEIGHT
  const viewTop = wrap.scrollTop
  const viewBottom = viewTop + viewportHeight.value
  if (rowTop < viewTop) { wrap.scrollTop = Math.max(0, rowTop - BUFFER * ROW_HEIGHT); scrollTopVal.value = wrap.scrollTop }
  else if (rowBottom > viewBottom) { wrap.scrollTop = rowBottom - viewportHeight.value + BUFFER * ROW_HEIGHT; scrollTopVal.value = wrap.scrollTop }
}

// ── Operações de linha ─────────────────────────────────────────────────────

function addRow() {
  const id = nextTempId(); const d = today()
  rows.push(emptyRow(id, d))
  anoSelecionado.value = new Date().getFullYear()
  mesSelecionado.value = new Date().getMonth()
  nextTick(() => activate(id, 'data'))
}

async function deleteRow(id: number) {
  const i = rows.findIndex(r => r.id === id); if (i === -1) return
  rows.splice(i, 1)
  if (activeCell.value?.rowId === id) activeCell.value = null
  if (id > 0) {
    try { await api.delete(`/cargas/${id}`) } catch { console.error('Erro ao excluir carga') }
  }
}

function insertRowAbove(rowId: number) {
  const i = rows.findIndex(r => r.id === rowId); if (i === -1) return
  const id = nextTempId(); const ref = rows[i]
  rows.splice(i, 0, emptyRow(id, ref.data))
  hideCtx(); nextTick(() => activate(id, 'data'))
}

function insertRowBelow(rowId: number) {
  const i = rows.findIndex(r => r.id === rowId); if (i === -1) return
  const id = nextTempId(); const ref = rows[i]
  rows.splice(i + 1, 0, emptyRow(id, ref.data))
  hideCtx(); nextTick(() => activate(id, 'data'))
}

function duplicateRow(rowId: number) {
  const i = rows.findIndex(r => r.id === rowId); if (i === -1) return
  const src = rows[i]; const id = nextTempId()
  rows.splice(i + 1, 0, { ...src, id, cte: src.cte + ' (cópia)' })
  hideCtx(); nextTick(() => activate(id, 'data'))
}

function clearCell(row: Row, colKey: string) {
  const col = COLS.find(c => c.key === colKey)
  if (!col || ['calc', 'calc-rent', 'status', 'checkbox'].includes(col.type)) return
  if (col.type === 'currency' || col.type === 'number') (row as any)[colKey] = null
  else if (col.type === 'percent') (row as any)[colKey] = 0
  else (row as any)[colKey] = ''
  if (NUMERIC_COLS.includes(colKey)) recalc(row)
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
  e.preventDefault()
  dragOverId.value = rowId
}

function onDragLeave(rowId: number) {
  if (dragOverId.value === rowId) dragOverId.value = null
}

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

function moveRowCtx(direction: 'up' | 'down') {
  if (!ctxMenu.value) return
  const visIdx = cargasFiltradas.value.findIndex(r => r.id === ctxMenu.value!.rowId)
  if (visIdx === -1) return
  const neighbor = cargasFiltradas.value[direction === 'up' ? visIdx - 1 : visIdx + 1]
  if (!neighbor) return
  const fromIdx = rows.findIndex(r => r.id === ctxMenu.value!.rowId)
  const toIdx = rows.findIndex(r => r.id === neighbor.id)
  if (fromIdx === -1 || toIdx === -1) return
  const [moved] = rows.splice(fromIdx, 1)
  rows.splice(toIdx, 0, moved)
  hideCtx()
}

// ── Menu de contexto ───────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; rowId: number; col: string }
const ctxMenu = ref<CtxMenu | null>(null)

function showCtx(e: MouseEvent, row: Row, colKey: string) {
  e.preventDefault()
  ctxMenu.value = { x: e.clientX, y: e.clientY, rowId: row.id, col: colKey }
}

function hideCtx() { ctxMenu.value = null }

function ctxCopyCell() {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  const col = COLS.find(c => c.key === ctxMenu.value!.col)
  if (!row || !col) return
  const val = displayVal(row, col)
  navigator.clipboard.writeText(val).catch(() => {})
  showToast(`Copiado: ${val}`)
  hideCtx()
}

function ctxClearCell() {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  if (row) clearCell(row, ctxMenu.value.col)
  hideCtx()
}

async function ctxSetStatus(status: 'entregue' | 'em_andamento') {
  if (!ctxMenu.value) return
  const row = rows.find(r => r.id === ctxMenu.value!.rowId)
  if (row) {
    row.status = status
    if (row.id > 0) {
      try { await api.patch(`/cargas/${row.id}/status`, { status }) } catch { console.error('Erro ao atualizar status') }
    }
  }
  hideCtx()
}


// ── Teclado global ────────────────────────────────────────────────────────

function globalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { ctxMenu.value = null; colCtxMenu.value = null; activeCell.value = null; return }
  const focused = document.activeElement
  const isInput = focused?.tagName === 'INPUT' || focused?.tagName === 'SELECT'

  if (!activeCell.value) return
  const row = rows.find(r => r.id === activeCell.value!.rowId)
  const col = COLS.find(c => c.key === activeCell.value!.col)
  if (!row || !col) return

  // Ctrl+C: copia
  if (e.ctrlKey && e.key === 'c') {
    const val = displayVal(row, col)
    navigator.clipboard.writeText(val).catch(() => {})
    showToast(`Copiado: ${val}`)
    return
  }

  // Ctrl+D: duplica linha
  if (e.ctrlKey && e.key === 'd' && !isInput) {
    e.preventDefault(); duplicateRow(row.id); return
  }

  if (isInput) return

  // Delete: limpa célula
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault(); clearCell(row, col.key); return
  }

  // Qualquer letra abre edição
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (!['calc', 'calc-rent', 'status', 'checkbox'].includes(col.type)) {
      activate(row.id, col.key)
    }
  }
}

function hideAllMenus() { hideCtx(); hideColCtx(); showColRestorePanel.value = false }

const mesSelecionadoStr = computed(() => `${anoSelecionado.value}-${String(mesSelecionado.value + 1).padStart(2, '0')}`)

function selecionarAno(ano: number) {
  anoSelecionado.value = ano
  carregarDados()
}

const carregando = ref(false)
const skeletonCount = ref(getRowCache('cargas_' + mesSelecionadoStr.value))

async function carregarDados() {
  skeletonCount.value = getRowCache('cargas_' + mesSelecionadoStr.value)
  rows.splice(0, rows.length)
  carregando.value = true
  try {
    const [cargasRes, clientesRes, motoristasRes] = await Promise.all([
      api.get(`/cargas?mes=${mesSelecionadoStr.value}`),
      api.get('/clientes'),
      api.get('/motoristas'),
    ])
    rows.splice(0, rows.length, ...(cargasRes.data as any[]).map(apiToRow))
    setRowCache('cargas_' + mesSelecionadoStr.value, rows.length)
    clientes.value = clientesRes.data
    motoristas.value = motoristasRes.data
  } finally {
    carregando.value = false
  }
}

async function toggleStatus(row: Row) {
  const newStatus: 'entregue' | 'em_andamento' = row.status === 'entregue' ? 'em_andamento' : 'entregue'
  row.status = newStatus
  if (row.id > 0) {
    try { await api.patch(`/cargas/${row.id}/status`, { status: newStatus }) } catch { console.error('Erro ao atualizar status') }
  }
}

async function toggleCanhoto(row: Row) {
  row.canhotoPago = !row.canhotoPago
  if (row.id > 0) {
    try { await api.patch(`/cargas/${row.id}/status`, { canhotoPago: row.canhotoPago }) } catch { console.error('Erro ao atualizar canhoto') }
  }
}

watch(mesSelecionado, carregarDados)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  document.addEventListener('keydown', globalKeydown)
  document.addEventListener('click', hideAllMenus)
  carregarDados()
  nextTick(() => {
    if (excelWrap.value) {
      viewportHeight.value = excelWrap.value.clientHeight
      resizeObserver = new ResizeObserver(() => { viewportHeight.value = excelWrap.value?.clientHeight ?? 600 })
      resizeObserver.observe(excelWrap.value)
    }
  })
})
onUnmounted(() => {
  document.removeEventListener('keydown', globalKeydown)
  document.removeEventListener('click', hideAllMenus)
  resizeObserver?.disconnect()
})

// ── Formatação / Display ──────────────────────────────────────────────────

const BRL = (v: number | null) => v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => (v * 100).toFixed(1) + '%'
const fmtData = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }
const nomeCliente = (id: number | null) => clientes.value.find(c => c.id === id)?.nome ?? ''
const nomeMotorista = (id: number | null) => motoristas.value.find(m => m.id === id)?.nome ?? ''
function rentCor(r: number) { return r >= 0.28 ? 'green' : r >= 0.18 ? 'amber' : 'red' }

function displayVal(row: Row, col: ColDef): string {
  const v = (row as any)[col.key]
  switch (col.type) {
    case 'currency': return v != null ? BRL(v) : ''
    case 'percent': return v != null ? `${Number(v).toFixed(1)}%` : ''
    case 'number': return v != null ? String(v) : ''
    case 'date': return v ? fmtData(v) : ''
    case 'select-cliente': return nomeCliente(v)
    case 'select-motorista': return nomeMotorista(v)
    case 'calc': return BRL(v)
    case 'calc-rent': return PCT(v)
    case 'status': return v === 'entregue' ? 'Entregue' : 'Em andamento'
    case 'checkbox': return v ? 'Sim' : 'Não'
    default: return v ?? ''
  }
}

function skBarWidth(col: ColDef): string {
  if (col.align === 'right') return '55%'
  if (col.align === 'center') return '30%'
  if (col.type === 'text') return '75%'
  if (col.type === 'date') return '45%'
  return '60%'
}

// ── Modal ─────────────────────────────────────────────────────────────────

const dialogAberto = ref(false)
const novaCargaBase = () => ({
  dataObj: new Date(), cte: '', origem: '', destino: '',
  clienteId: null as number | null, motoristaId: null as number | null,
  valorEmpresa: null as number | null, valorMotorista: null as number | null, valorNf: null as number | null,
  seguroPercent: 0.3, icmsPercent: 4, coPercent: 3.5, impostoPercent: 4,
  diasPagamento: 30, percentComissao: 10,
  tipoEntrega: null as string | null, formaPagamento: null as string | null,
})
const form = reactive(novaCargaBase())

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
  return { adqTab, boletoP, totalTaxas, valorImpostoTotal, seguroValor, comissaoValor, lucro, rentabilidade: lucro / ve }
})

function abrirDialog() { Object.assign(form, novaCargaBase()); dialogAberto.value = true }

// ── Exportar CSV ──────────────────────────────────────────────────────────

function exportCSV() {
  const mes = meses[mesSelecionado.value]
  const headers = ['Data','CTE','Origem','Destino','Cliente','Motorista','Vl. Empresa','Vl. Motorista','Com%','Comissão R$','Rent%','Lucro','Status','Canhoto']
  const linhas = cargasFiltradas.value.map(r => [
    r.data,
    r.cte,
    r.origem,
    r.destino,
    nomeCliente(r.clienteId),
    nomeMotorista(r.motoristaId),
    r.valorEmpresa ?? 0,
    r.valorMotorista ?? 0,
    r.percentComissao + '%',
    r.comissaoValor.toFixed(2),
    (r.percentRentabilidade * 100).toFixed(1) + '%',
    r.lucro.toFixed(2),
    r.status === 'entregue' ? 'Entregue' : 'Em andamento',
    r.canhotoPago ? 'Sim' : 'Não',
  ])

  const csv = [headers, ...linhas]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cargas_${mes}_2026.csv`
  a.click()
  URL.revokeObjectURL(url)
  showToast(`Exportado: cargas_${mes}_2026.csv`)
}

async function salvarModal() {
  if (!calc.value || form.clienteId == null || form.motoristaId == null) return
  const payload = {
    data: form.dataObj.toISOString().split('T')[0],
    cte: form.cte || undefined, origem: form.origem || undefined, destino: form.destino || undefined,
    clienteId: form.clienteId, motoristaId: form.motoristaId,
    valorEmpresa: form.valorEmpresa!, valorMotorista: form.valorMotorista!,
    valorNf: form.valorNf ?? form.valorEmpresa!,
    seguroPercent: form.seguroPercent / 100, icmsPercent: form.icmsPercent / 100,
    coPercent: form.coPercent / 100, impostoPercent: form.impostoPercent / 100,
    diasPagamento: form.diasPagamento, percentComissao: form.percentComissao / 100,
    status: 'em_andamento' as const, canhotoPago: false,
  }
  try {
    const { data } = await api.post('/cargas', payload)
    rows.unshift(apiToRow(data))
    anoSelecionado.value = new Date(form.dataObj).getFullYear()
    mesSelecionado.value = new Date(form.dataObj).getMonth()
    dialogAberto.value = false
  } catch { console.error('Erro ao criar carga') }
}

const opcoesCliente = computed(() => clientes.value.map(c => ({ label: c.nome, value: c.id })))
const opcoesMotorista = computed(() => motoristas.value.map(m => ({ label: m.nome, value: m.id })))
const opcoesTipoEntrega = ['CIF', 'FOB'].map(v => ({ label: v, value: v }))
const opcoesFormaPagamento = ['Boleto', 'PIX', 'Transferência'].map(v => ({ label: v, value: v }))
</script>

<template>
  <div class="page" style="position:relative" @click="hideAllMenus">
    <AppLoader :loading="carregando" />

    <!-- Cabeçalho -->
    <div class="page-header" style="align-items:flex-start">
      <div class="periodo-selector">
        <div class="ano-toggle">
          <button class="ano-btn" :class="{ ativo: anoSelecionado === 2025 }" @click="selecionarAno(2025)">2025</button>
          <button class="ano-btn" :class="{ ativo: anoSelecionado === 2026 }" @click="selecionarAno(2026)">2026</button>
        </div>
        <div class="meses-selector">
          <button
            v-for="(mes, i) in meses" :key="i"
            class="mes-btn" :class="{ ativo: mesSelecionado === i }"
            @click="mesSelecionado = i"
          >{{ mes }}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn-active': showFilters }"
          @click.stop="showFilters = !showFilters"
          title="Mostrar/ocultar filtros de coluna"
        >
          <i class="pi pi-filter" />
          Filtros
          <span v-if="hasActiveFilters" class="dot-active" />
        </button>
        <button v-if="hasActiveFilters" class="toolbar-btn" @click.stop="clearAllFilters" title="Limpar todos os filtros">
          <i class="pi pi-filter-slash" />
        </button>
        <div v-if="hiddenColsList.length" style="position:relative">
          <button class="toolbar-btn" @click.stop="showColRestorePanel = !showColRestorePanel" title="Colunas ocultas">
            <i class="pi pi-eye-slash" />
            Colunas ({{ hiddenColsList.length }})
          </button>
          <div v-if="showColRestorePanel" class="col-restore-panel" @click.stop>
            <button v-for="col in hiddenColsList" :key="col.key" class="col-restore-item" @click="showColumn(col.key)">
              <i class="pi pi-eye" /> {{ col.label }}
            </button>
          </div>
        </div>
        <button class="toolbar-btn" :class="{ 'toolbar-btn-active': wrapText }" @click.stop="wrapText = !wrapText" title="Quebrar texto nas células">
          <i class="pi pi-align-left" /> Quebrar texto
        </button>
        <button class="toolbar-btn" @click.stop="exportCSV" title="Exportar cargas do mês para Excel/CSV">
          <i class="pi pi-download" />
          Exportar CSV
        </button>
        <Button label="Nova Carga" icon="pi pi-plus" @click.stop="abrirDialog" />
      </div>
    </div>

    <!-- Tabela Excel -->
    <div ref="excelWrap" class="excel-wrap" @click.stop @scroll="onScroll">
      <table class="excel-table" :class="{ 'wrap-text': wrapText }" :style="{ width: totalTableWidth + 'px' }">
        <thead>
          <!-- Cabeçalho com sort -->
          <tr>
            <th class="th-rownum">#</th>
            <th
              v-for="col in visibleCols" :key="col.key"
              :style="{ width: getColWidth(col) }"
              :class="{
                'th-sorted': sortState?.col === col.key,
                'th-filter-active': !!filters[col.key]?.trim(),
                'th-right': col.align === 'right',
                'th-center': col.align === 'center',
              }"
              @contextmenu.stop="showColCtx($event, col)"
              title="Botão direito para ordenar, filtrar ou ocultar"
            >
              <div class="th-inner">
                <span>{{ col.label }}</span>
              </div>
              <div
                class="col-resize-handle"
                @mousedown.stop="startResize($event, col.key)"
                @dblclick.stop="autoFit(col.key)"
                title="Arraste para redimensionar · duplo clique para ajustar automaticamente"
              />
            </th>
            <th class="th-spacer"></th>
          </tr>

          <!-- Linha de filtros -->
          <tr v-if="showFilters" class="filter-row">
            <th class="th-rownum" style="background:#f0f4ff"></th>
            <th v-for="col in visibleCols" :key="col.key" style="padding:3px 4px;background:#f0f4ff;border:1px solid #dde4f0">
              <template v-if="col.type === 'select-cliente'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todos</option>
                  <option v-for="c in clientes" :key="c.id" :value="c.nome.toLowerCase()">{{ c.nome }}</option>
                </select>
              </template>
              <template v-else-if="col.type === 'select-motorista'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todos</option>
                  <option v-for="m in motoristas" :key="m.id" :value="m.nome.toLowerCase()">{{ m.nome }}</option>
                </select>
              </template>
              <template v-else-if="col.type === 'status'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todos</option>
                  <option value="entregue">Entregue</option>
                  <option value="em andamento">Em andamento</option>
                </select>
              </template>
              <template v-else-if="col.type === 'checkbox'">
                <select class="filter-input" v-model="filters[col.key]">
                  <option value="">Todos</option>
                  <option value="sim">Sim</option>
                  <option value="não">Não</option>
                </select>
              </template>
              <template v-else>
                <input
                  class="filter-input"
                  type="text"
                  v-model="filters[col.key]"
                  :placeholder="col.label"
                  @click.stop
                />
              </template>
            </th>
            <th style="background:#f0f4ff;border:1px solid #dde4f0"></th>
            <th class="th-spacer" style="background:#f0f4ff"></th>
          </tr>
        </thead>

        <tbody>
          <template v-if="carregando && rows.length === 0">
            <tr v-for="i in skeletonCount" :key="'sk-' + i" class="excel-row skeleton-row">
              <td class="td-rownum"><div class="skel-bar" style="width:18px;margin:13px auto" /></td>
              <td v-for="col in visibleCols" :key="col.key" class="excel-td">
                <div class="skel-bar" :style="{ width: skBarWidth(col) }" />
              </td>
              <td class="td-spacer"></td>
            </tr>
          </template>
          <template v-else>
          <tr v-if="topPadding > 0" class="vscroll-pad">
            <td :colspan="visibleCols.length + 2" :style="{ height: topPadding + 'px' }" />
          </tr>
          <tr
            v-for="(row, rowIdx) in visibleRows"
            :key="row.id"
            class="excel-row"
            :class="{
              'row-active': activeCell?.rowId === row.id,
              'row-dragging': draggingId === row.id,
              'row-drag-over': dragOverId === row.id,
            }"
            @contextmenu.stop="showCtx($event, row, activeCell?.col ?? 'data')"
            @dragover="onDragOver($event, row.id)"
            @dragleave="onDragLeave(row.id)"
            @drop="onDrop($event, row.id)"
          >
            <td
              class="td-rownum td-handle"
              draggable="true"
              @dragstart="onDragStart($event, row.id)"
              @dragend="onDragEnd"
              @contextmenu.stop="showCtx($event, row, 'data')"
              title="Arraste para reordenar · botão direito para mais opções"
            >
              <i class="pi pi-bars drag-icon" />
              <span class="row-num">{{ visibleRange.start + rowIdx + 1 }}</span>
            </td>

            <td
              v-for="col in visibleCols" :key="col.key"
              :data-cell="`${row.id}-${col.key}`"
              class="excel-td"
              :class="{
                'td-calc': col.type === 'calc' || col.type === 'calc-rent',
                'td-active': isActive(row.id, col.key),
                'td-right': col.align === 'right',
                'td-center': col.align === 'center',
              }"
              @click.stop="onCellClick(row, col)"
              @contextmenu.stop="showCtx($event, row, col.key)"
            >
              <!-- Display -->
              <template v-if="!isActive(row.id, col.key) || ['calc','calc-rent','status','checkbox'].includes(col.type)">

                <span v-if="col.type === 'status'"
                  class="status-tag" :class="row.status"
                  @click.stop="toggleStatus(row)"
                  title="Clique para alternar"
                >
                  <i :class="row.status === 'entregue' ? 'pi pi-check-circle' : 'pi pi-clock'" style="font-size:10px" />
                  {{ row.status === 'entregue' ? 'Entregue' : 'Em andamento' }}
                </span>

                <input v-else-if="col.type === 'checkbox'"
                  type="checkbox" class="canhoto-check"
                  :checked="row.canhotoPago"
                  @change.stop="toggleCanhoto(row)"
                />

                <span v-else-if="col.type === 'calc-rent'"
                  class="rent" :class="rentCor(row.percentRentabilidade)">
                  {{ PCT(row.percentRentabilidade) }}
                </span>

                <span v-else-if="col.key === 'comissaoValor'"
                  style="color:#7c3aed;font-weight:600;padding:0 8px">
                  {{ BRL(row.comissaoValor) }}
                </span>

                <span v-else class="cell-text"
                  :class="{ 'text-right': col.align === 'right', 'text-empty': !displayVal(row, col) }"
                >{{ displayVal(row, col) || '—' }}</span>
              </template>

              <!-- Edição -->
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

                <select v-else-if="col.type === 'select-motorista'" class="cell-input cell-select"
                  :value="(row as any)[col.key]"
                  @change="(row as any)[col.key] = parseInt(($event.target as HTMLSelectElement).value)"
                  @blur="deactivate(row)" @keydown.tab="onTab($event, row, col.key)"
                  @keydown.escape.stop="onEscape">
                  <option value="">—</option>
                  <option v-for="m in motoristas" :key="m.id" :value="m.id">{{ m.nome }}</option>
                </select>
              </template>
            </td>
            <td class="td-spacer"></td>
          </tr>
          <tr v-if="bottomPadding > 0" class="vscroll-pad">
            <td :colspan="visibleCols.length + 2" :style="{ height: bottomPadding + 'px' }" />
          </tr>
          </template>
        </tbody>

        <!-- Totais -->
        <tfoot>
          <tr class="totals-row">
            <td class="td-rownum total-label">Σ</td>
            <td v-for="col in visibleCols" :key="col.key" class="total-cell"
              :class="{ 'td-right': col.align === 'right', 'td-center': col.align === 'center' }">
              <template v-if="col.key === 'valorEmpresa'">
                <span class="total-val">{{ BRL(totais.valorEmpresa) }}</span>
              </template>
              <template v-else-if="col.key === 'valorMotorista'">
                <span class="total-val">{{ BRL(totais.valorMotorista) }}</span>
              </template>
              <template v-else-if="col.key === 'comissaoValor'">
                <span class="total-val" style="color:#7c3aed">{{ BRL(totais.comissaoValor) }}</span>
              </template>
              <template v-else-if="col.key === 'lucro'">
                <span class="total-val" style="color:#16a34a">{{ BRL(totais.lucro) }}</span>
              </template>
              <template v-else-if="col.key === 'percentRentabilidade'">
                <span class="total-val rent" :class="rentCor(totais.percentRentabilidade)">
                  {{ PCT(totais.percentRentabilidade) }}
                </span>
              </template>
              <span v-else />
            </td>
            <td class="td-spacer"></td>
          </tr>
          <tr>
            <td :colspan="visibleCols.length + 2" style="padding:0;border:1px solid #e8ecf0">
              <button class="add-row-btn" @click.stop="addRow">
                <i class="pi pi-plus" /> Adicionar linha
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Atalhos hint -->
    <div class="shortcuts-hint">
      <span><kbd>Tab</kbd> próxima célula</span>
      <span><kbd>Enter</kbd> linha abaixo</span>
      <span><kbd>Del</kbd> limpar célula</span>
      <span><kbd>Ctrl+C</kbd> copiar</span>
      <span><kbd>Ctrl+D</kbd> duplicar linha</span>
      <span><kbd>Botão direito</kbd> mais opções</span>
    </div>
  </div>

  <!-- ── Menu de contexto ────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="ctxMenu" class="ctx-menu" :style="ctxStyle(ctxMenu.x, ctxMenu.y)" @click.stop>
      <button class="ctx-item" @click="moveRowCtx('up')"
        :class="{ 'ctx-disabled': cargasFiltradas.findIndex(r => r.id === ctxMenu.rowId) === 0 || !!sortState }">
        <i class="pi pi-angle-up" /> Mover linha para cima
      </button>
      <button class="ctx-item" @click="moveRowCtx('down')"
        :class="{ 'ctx-disabled': cargasFiltradas.findIndex(r => r.id === ctxMenu.rowId) === cargasFiltradas.length - 1 || !!sortState }">
        <i class="pi pi-angle-down" /> Mover linha para baixo
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="insertRowAbove(ctxMenu.rowId)">
        <i class="pi pi-plus" /> Inserir linha acima
      </button>
      <button class="ctx-item" @click="insertRowBelow(ctxMenu.rowId)">
        <i class="pi pi-plus" /> Inserir linha abaixo
      </button>
      <button class="ctx-item" @click="duplicateRow(ctxMenu.rowId)">
        <i class="pi pi-copy" /> Duplicar linha
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="ctxCopyCell">
        <i class="pi pi-clipboard" /> Copiar valor da célula
      </button>
      <button class="ctx-item" @click="ctxClearCell">
        <i class="pi pi-eraser" /> Limpar célula
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="ctxSetStatus('entregue')">
        <i class="pi pi-check-circle" style="color:#16a34a" /> Marcar como Entregue
      </button>
      <button class="ctx-item" @click="ctxSetStatus('em_andamento')">
        <i class="pi pi-clock" style="color:#d97706" /> Marcar como Em andamento
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item ctx-danger" @click="deleteRow(ctxMenu.rowId); hideCtx()">
        <i class="pi pi-trash" /> Excluir linha
      </button>
    </div>
  </Teleport>

  <!-- ── Menu de contexto de coluna ────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="colCtxMenu" class="ctx-menu" :style="ctxStyle(colCtxMenu.x, colCtxMenu.y, 220)" @click.stop>
      <div class="col-ctx-filter">
        <label>Filtrar por {{ colCtxMenu.col.label }}</label>
        <div style="display:flex;gap:4px;align-items:center">
          <input
            class="filter-input"
            type="text"
            v-model="filters[colCtxMenu.col.key]"
            placeholder="Digite para filtrar..."
            autofocus
            @click.stop
          />
          <button v-if="filters[colCtxMenu.col.key]" class="col-ctx-clear" @click.stop="filters[colCtxMenu.col.key] = ''">✕</button>
        </div>
      </div>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="sortState = { col: colCtxMenu.col.key, dir: 'asc' }; hideColCtx()">
        <i class="pi pi-sort-amount-up-alt" /> Ordenar A → Z
      </button>
      <button class="ctx-item" @click="sortState = { col: colCtxMenu.col.key, dir: 'desc' }; hideColCtx()">
        <i class="pi pi-sort-amount-down-alt" /> Ordenar Z → A
      </button>
      <button v-if="sortState?.col === colCtxMenu.col.key" class="ctx-item" @click="sortState = null; hideColCtx()">
        <i class="pi pi-times" /> Limpar ordenação
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item ctx-danger" @click="hideColumn(colCtxMenu.col.key)">
        <i class="pi pi-eye-slash" /> Ocultar coluna
      </button>
    </div>
  </Teleport>

  <!-- ── Modal Nova Carga ────────────────────────────────────────────────── -->
  <Dialog v-model:visible="dialogAberto" header="Nova Carga" :style="{ width: '780px' }" modal :draggable="false">
    <div class="form-2col">
      <div class="form-field"><label>Data</label><DatePicker v-model="form.dataObj" dateFormat="dd/mm/yy" showIcon fluid /></div>
      <div class="form-field"><label>CTE <span style="color:#94a3b8;font-weight:400">(opcional)</span></label><InputText v-model="form.cte" /></div>
      <div class="form-field"><label>Origem</label><InputText v-model="form.origem" placeholder="ex: São Paulo/SP" /></div>
      <div class="form-field"><label>Destino</label><InputText v-model="form.destino" placeholder="ex: Salvador/BA" /></div>
      <div class="form-field"><label>Cliente</label><Select v-model="form.clienteId" :options="opcoesCliente" optionLabel="label" optionValue="value" placeholder="Selecione" fluid /></div>
      <div class="form-field"><label>Motorista</label><Select v-model="form.motoristaId" :options="opcoesMotorista" optionLabel="label" optionValue="value" placeholder="Selecione" fluid /></div>
      <div class="form-field"><label>Valor Empresa (R$)</label><InputNumber v-model="form.valorEmpresa" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Valor Motorista (R$)</label><InputNumber v-model="form.valorMotorista" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Valor NF (R$)</label><InputNumber v-model="form.valorNf" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Comissão (%)</label><InputNumber v-model="form.percentComissao" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>ICMS (%)</label><InputNumber v-model="form.icmsPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>C.O (%)</label><InputNumber v-model="form.coPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>Imposto (%)</label><InputNumber v-model="form.impostoPercent" suffix="%" :minFractionDigits="1" fluid /></div>
      <div class="form-field"><label>Seguro (%)</label><InputNumber v-model="form.seguroPercent" suffix="%" :minFractionDigits="2" fluid /></div>
      <div class="form-field"><label>Dias para Pagamento</label><InputNumber v-model="form.diasPagamento" suffix=" dias" fluid /></div>
      <div class="form-field"><label>Tipo de Entrega</label><Select v-model="form.tipoEntrega" :options="opcoesTipoEntrega" optionLabel="label" optionValue="value" placeholder="CIF / FOB" fluid /></div>
      <div class="form-field form-full"><label>Forma de Pagamento</label><Select v-model="form.formaPagamento" :options="opcoesFormaPagamento" optionLabel="label" optionValue="value" fluid /></div>
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
      <Button label="Salvar Carga" icon="pi pi-check" :disabled="!calc || form.clienteId == null || form.motoristaId == null" @click="salvarModal" />
    </template>
  </Dialog>
</template>

<style scoped>
.vscroll-pad td { border: none !important; padding: 0 !important; background: white !important; pointer-events: none; }

/* ── Toolbar ─────────────────────────────────────────────────── */
.toolbar-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 7px;
  border: 1px solid #e2e8f0; background: white;
  font-size: 13px; color: #64748b; cursor: pointer;
  transition: all 0.14s; position: relative;
}
.toolbar-btn:hover { border-color: #7c3aed; color: #7c3aed; }
.toolbar-btn-active { background: #f3e8ff; border-color: #7c3aed; color: #7c3aed; }
.dot-active { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: #7c3aed; border-radius: 50%; }
.filter-badge { display: inline-flex; align-items: center; background: #f3e8ff; color: #7c3aed; font-size: 11px; padding: 1px 7px; border-radius: 10px; margin-left: 6px; }

/* ── Resize handle ───────────────────────────────────────────── */
.col-resize-handle {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 6px; cursor: col-resize; z-index: 2;
  transition: background 0.12s;
}
.col-resize-handle:hover { background: rgba(124,58,237,0.25); }

/* ── Wrap text ───────────────────────────────────────────────── */
.excel-table.wrap-text .excel-td { height: auto; min-height: 36px; }
.excel-table.wrap-text .cell-text {
  white-space: normal; height: auto; min-height: 36px;
  align-items: flex-start; padding-top: 6px; padding-bottom: 6px;
  overflow: visible;
}
.excel-table.wrap-text .cell-input { height: auto; min-height: 36px; }

/* ── Tabela ───────────────────────────────────────────────────── */
.excel-wrap {
  overflow: auto;
  max-height: calc(100vh - 190px);
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.excel-table {
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12.5px;
}

.th-spacer {
  width: auto;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  position: sticky; top: 0; z-index: 10;
}
.td-spacer { border-bottom: 1px solid #e8ecf0; background: white; }
.totals-row .td-spacer { background: #f0f4ff !important; }

/* Header */
.excel-table thead th {
  position: sticky; top: 0; z-index: 10;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px 14px 6px 8px; /* padding-right extra para o handle não cobrir texto */
  overflow: visible;
  font-size: 11px; font-weight: 600; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.04em;
  white-space: nowrap; user-select: none;
  cursor: default;
  transition: background 0.12s;
}
.excel-table thead th:hover { background: #f0f4ff; }
.th-sorted { background: #ede9fe !important; color: #7c3aed !important; }
.th-filter-active { color: #7c3aed !important; }
.th-rownum { width: 52px; min-width: 52px; text-align: center; cursor: default !important; }
.th-right .th-inner { justify-content: flex-end; }
.th-center .th-inner { justify-content: center; }

.th-inner { display: flex; align-items: center; gap: 5px; }

/* Linha de filtros */
.filter-row th { position: sticky; top: 33px; z-index: 9; }
.filter-input {
  width: 100%; height: 24px;
  border: 1px solid #cbd5e1; border-radius: 4px;
  padding: 2px 6px; font-size: 11.5px;
  background: white; color: #374151;
  font-family: inherit;
  box-sizing: border-box;
}
.filter-input:focus { outline: 2px solid #7c3aed; outline-offset: -1px; border-color: transparent; }

/* Rows */
.excel-row { transition: background 0.08s; }
.excel-row:nth-child(even) td { background: #fdfdfe; }
.excel-row:hover td { background: #f8faff !important; }
.row-active td:not(.td-calc) { background: #faf8ff !important; }

.td-rownum {
  width: 52px;
  border: 1px solid #e8ecf0; background: #f8fafc !important;
  text-align: center; color: #94a3b8;
  font-size: 11px; padding: 0 4px; user-select: none;
}

.td-handle {
  cursor: grab;
  display: flex; align-items: center; justify-content: center; gap: 3px;
}
.td-handle:active { cursor: grabbing; }

.drag-icon {
  font-size: 11px; color: #cbd5e1;
  opacity: 0; transition: opacity 0.12s;
  flex-shrink: 0;
}
.excel-row:hover .drag-icon { opacity: 1; }
.row-dragging .drag-icon { opacity: 1; color: #7c3aed; }
.row-num { flex-shrink: 0; font-size: 12px; }

.row-dragging td { opacity: 0.4; }
.row-drag-over td { box-shadow: 0 -2px 0 0 #7c3aed inset !important; background: #f5f0ff !important; }

.excel-td {
  border: 1px solid #e8ecf0;
  height: 36px; padding: 0; vertical-align: middle;
  cursor: cell; position: relative; background: white;
  overflow: hidden;
}
.excel-td.td-calc { background: #f8fafc !important; cursor: default; }
.excel-td.td-active { outline: 2px solid #6366f1; outline-offset: -2px; z-index: 5; }

.cell-text {
  display: flex; align-items: center;
  padding: 4px 8px; height: 36px;
  color: #1e293b; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.cell-text.text-right { justify-content: flex-end; }
.cell-text.text-empty { color: #cbd5e1; font-style: italic; }
.td-right .cell-text { justify-content: flex-end; }
.td-center { text-align: center; }

.cell-input {
  display: block; width: 100%; height: 36px;
  border: none; outline: 2px solid #6366f1; outline-offset: -2px;
  padding: 4px 8px; font-size: 12.5px;
  font-family: inherit; background: white; color: #1e293b;
  box-sizing: border-box;
}
.cell-input[type="number"] { text-align: right; }
.cell-input[type="date"] { padding: 4px; }
.cell-select { appearance: none; cursor: pointer; }


/* Totais */
.totals-row td {
  border: 1px solid #e2e8f0;
  background: #f0f4ff !important;
  padding: 0;
  height: 30px;
}
.total-label {
  text-align: center; font-weight: 700; font-size: 13px;
  color: #7c3aed; background: #ede9fe !important;
}
.total-cell { vertical-align: middle; }
.total-val {
  display: flex; align-items: center;
  padding: 4px 8px; font-weight: 700;
  font-size: 12.5px; color: #374151; white-space: nowrap;
}
.td-right .total-val { justify-content: flex-end; }

/* Botão + linha */
.add-row-btn {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 8px 14px;
  border: none; background: none;
  color: #94a3b8; font-size: 12.5px;
  font-family: inherit; cursor: pointer;
  transition: all 0.14s;
}
.add-row-btn:hover { background: #f0f4ff; color: #7c3aed; }

/* Atalhos hint */
.shortcuts-hint {
  display: flex; flex-wrap: wrap; gap: 12px;
  margin-top: 10px; padding: 0 20px;
  font-size: 11.5px; color: #94a3b8;
}
.shortcuts-hint kbd {
  background: #f1f5f9; border: 1px solid #e2e8f0;
  border-radius: 4px; padding: 1px 5px;
  font-family: inherit; font-size: 10.5px;
  color: #64748b;
}

/* ── Menu de contexto ────────────────────────────────────────── */
.ctx-menu {
  position: fixed; z-index: 9999;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
  padding: 4px; min-width: 210px;
}
.ctx-item {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 7px 12px;
  border: none; background: none; border-radius: 6px;
  font-size: 13px; color: #374151;
  cursor: pointer; text-align: left;
  transition: background 0.1s;
}
.ctx-item .pi { font-size: 13px; width: 14px; text-align: center; color: #64748b; }
.ctx-item:hover { background: #f8fafc; }
.ctx-danger { color: #ef4444 !important; }
.ctx-danger .pi { color: #ef4444 !important; }
.ctx-danger:hover { background: #fef2f2 !important; }
.ctx-disabled { opacity: 0.35; pointer-events: none; }
.ctx-sep { height: 1px; background: #f1f5f9; margin: 4px 0; }

/* ── Menu de coluna ──────────────────────────────────────────── */
.col-ctx-filter { padding: 8px 10px 6px; display: flex; flex-direction: column; gap: 6px; }
.col-ctx-filter label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.col-ctx-clear {
  flex-shrink: 0; width: 22px; height: 24px;
  border: 1px solid #e2e8f0; border-radius: 4px;
  background: white; color: #64748b; cursor: pointer; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.col-ctx-clear:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

/* ── Painel restaurar colunas ────────────────────────────────── */
.col-restore-panel {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: white; border: 1px solid #e2e8f0;
  border-radius: 9px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  padding: 4px; z-index: 500; min-width: 160px;
}
.col-restore-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 12px;
  border: none; background: none; border-radius: 6px;
  font-size: 13px; cursor: pointer; color: #374151;
  font-family: inherit;
}
.col-restore-item:hover { background: #f0f4ff; color: #7c3aed; }

/* ── Skeleton ─────────────────────────────────────────────────── */
.skeleton-row td { cursor: default !important; }
.skel-bar {
  display: block;
  height: 10px;
  margin: 13px 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.5s infinite linear;
}
@keyframes skel-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

</style>
