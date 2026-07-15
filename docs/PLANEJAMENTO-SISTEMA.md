# Planejamento — Sistema de Desempenho Pessoal (Thiago)

Documento de trabalho para definir, tópico por tópico, as regras e decisões antes de começar a construir o sistema que vai substituir a planilha `DESEMPENHO PESSOAL - THIAGO.xlsx`.

Objetivo do Thiago (cliente): sair do Excel porque está difícil manter tantos dados manualmente. Ele quer um sistema web para **cadastrar mais fácil** (lançar cargas/carregamentos) e **visualizar melhor** (dashboards, metas, comparativos).

Cada seção abaixo é um tópico de decisão. Onde fizer sentido, deixei uma recomendação inicial — mas todas são abertas para discussão.

**Princípio geral combinado:** começar simples — só os campos estritamente necessários em cada entidade — e incrementar depois conforme a necessidade aparecer no uso real. Evitar over-engineering no modelo de dados do MVP.

---

## 1. Escopo e usuários do sistema

- [ ] **Quem vai usar o sistema?** Só o Thiago, ou também alguém da equipe dele (assistente, financeiro)?
- [ ] É só para uso pessoal dele, ou existe intenção futura de virar produto para outros corretores/transportadoras (multi-tenant)?
- [ ] Vai ter só um "papel" de usuário (dono) ou precisa de perfis diferentes (ex: admin vs. visualizador)?

> Isso define se vale a pena já desenhar multi-tenant desde o início ou se um sistema single-tenant simples resolve por agora (mais rápido de entregar).

---

## 2. Entidades principais (modelo de dados) ✅ FECHADO PARA O MVP

Campos mínimos definidos (só o essencial — dá pra incrementar depois, conforme princípio geral acima):

- **Carregamento/Carga**: data, CTE, origem, destino, cliente, motorista, valor motorista, valor empresa (cobrado), valor da NF, ICMS, comissão (%, R$), % rentabilidade, status (em andamento / entregue), canhoto (enviado sim/não), tipo de entrega, forma de pagamento, dia de pagamento.
- **Cliente**: nome, CNPJ, contato, meta mensal, histórico de faturamento.
- **Motorista**: nome, telefone (campo único, com ressalva ✅ DECIDIDA abaixo). Campos extras (veículo/placa, PIX, cidade) ficam para uma fase futura, se sentir falta.
  - **Telefone único, porém opcional para motoristas migrados**: unicidade validada só quando o telefone está preenchido (índice único "parcial") — permite vários motoristas antigos sem telefone, mas nunca dois com o mesmo telefone preenchido colidindo.
  - **Cadastro novo (não migrado) exige telefone obrigatório** a partir de agora.
  - Motorista "telefone pendente" pode ser completado depois, no momento em que ele for reutilizado numa carga nova — sem bloquear o lançamento.
- **Meta mensal**: **tabela própria (mês + cliente + valor da meta)**, editável — não meta fixa. Decidido com base no áudio do Thiago: "todo mês eu coloco uma meta específica para ele" (meta muda mês a mês, por cliente).
- **Indicador semanal** (aba FEEDBACK SEMANAL): ligações, cargas, leads adicionados/declinados, clientes potenciais.

> Nota: pode haver campos da planilha que ainda não mapeamos 100%. Isso não bloqueia o início — vamos capturando e ajustando o modelo à medida que aparecer no uso real, sem preocupação em antecipar tudo agora.

---

## 3. Regras de negócio / cálculos

Consegui extrair as fórmulas reais direto do arquivo `.xlsx` (abri o XML interno da planilha, não só os prints). Isso elimina a maior parte do "achismo" — segue a cadeia de cálculo por carga, confirmada, coluna a coluna (aba MAIO - 2026, linha 4 como exemplo):

| Coluna  | Campo                                       | Fórmula / origem                                                                                                                      |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| N       | Valor motorista                             | input manual                                                                                                                           |
| O       | Valor empresa (cobrado do cliente)          | input manual                                                                                                                           |
| P       | Valor da NF                                 | input manual                                                                                                                           |
| Q / R   | Seguro (% e R$)                             | R =`NF * Q`                                                                                                                          |
| S       | ICMS (%)                                    | input manual                                                                                                                           |
| U       | "C.O" (%)                                   | input manual (varia por carga: 0% ou 3,5% observado)                                                                                   |
| W       | "CO" (R$)                                   | `U * valor empresa`                                                                                                                  |
| X / Y   | Imposto (% e R$)                            | Y =`valor empresa * X`                                                                                                               |
| AA      | Dias para pagamento                         | input manual                                                                                                                           |
| Z       | "Boleto" (custo, %)                         | `dias_pagamento * 0,00133` (custo financeiro proporcional ao prazo)                                                                  |
| AJ      | "MOVA" (R$)                                 | `Z * valor empresa`                                                                                                                  |
| AK / AL | "ADQ TAB" (taxa adquirente, % e R$)         | AL =`0,85% * valor empresa`                                                                                                          |
| AB      | Total taxas (%)                             | `ICMS% + C.O% + Imposto% + Boleto%`                                                                                                  |
| AC      | Valor imposto total (R$)                    | `valor empresa * AB + ADQ TAB(AL)`                                                                                                   |
| AD      | **% Comissão**                       | **input manual por carga** (observei variando: 7%, 8%, 10%, 13%, 0%)                                                             |
| AE      | **Comissão (R$)**                    | `(valor empresa − valor motorista) * % comissão (AD)`                                                                              |
| AF      | Boletos (R$) | valor fixo R$17,50 por carga |                                                                                                                                        |
| AG      | **Lucro (R$)**                        | `valor empresa − valor motorista − seguro(R) − valor imposto total(AC) − comissão(AE) − boletos(AF)`                           |
| AH      | **% Rentabilidade**                   | `Lucro (AG) / valor empresa (O)` — **não é só (empresa−motorista)/empresa, já desconta impostos/taxas/comissão/boleto** |

Consolidação por cliente (dentro do mês): `REALIZADO = SOMASE(cliente, valor empresa)`, `COMISSÃO = SOMASE(cliente, comissão)`, `% REALIZADA = REALIZADO / META do cliente`.

"Meta diária" = `(Meta do mês − Total já faturado) / Dias úteis restantes` — quanto falta faturar por dia útil para bater a meta do mês.

Perguntas que **só o Thiago sabe responder** (não dá pra ver isso na fórmula, é regra de negócio dele):

- [ ] **% de Comissão (AD)** varia carga a carga (vi 0%, 7%, 8%, 10%, 13%) — o que determina esse percentual? É por cliente, por tipo de carga, por negociação pontual?
- [ ] **"C.O" (U)** — o que significa essa sigla, e o que determina se uma carga tem esse custo (3,5%) ou não (0%)? Depende da forma de pagamento?
- [ ] **"MOVA" e "ADQ TAB"** — são taxas de plataforma/maquininha de recebimento? O "ADQ TAB" parece fixo em 0,85% — confirma que é sempre fixo?
- [ ] O "**Parâmetro 100k**" e a tabela de "**Carregamento**" por faixa de % (vista no print, agrupando cargas por 5%/9,6%/5,6%) — o que esse agrupamento representa pra ele na prática? É uma meta de bater R$100mil considerando só cargas de uma certa faixa de comissão?

> As fórmulas de cálculo (colunas da tabela acima) já estão praticamente prontas para virar regras de negócio no sistema. O que falta é só entender o "porquê" dos inputs manuais (AD, U, S) para saber se dá pra automatizar algo ou se continuam sendo digitados carga a carga.

---

## 4. Funcionalidades do sistema ✅ TODAS ESSENCIAIS (sem fase 2 — tudo entra)

Decidido: não separar MVP x fase 2 por funcionalidade — todo o escopo abaixo é essencial desde já.

- [X] Cadastro rápido de carregamento (formulário simples, mobile-friendly já que ele deve lançar do celular às vezes — a confirmar prioridade de responsividade mobile)
- [X] Edição de status da carga (em andamento → entregue, canhoto enviado)
- [X] Definição de meta mensal por cliente (editável todo mês)
- [X] Dashboard mensal: total faturado, comissão total, % de meta batida, ranking de clientes
- [X] Dashboard anual: comparativo mês a mês (o que hoje é a aba PROJEÇÃO)
- [X] Gráficos / dashboards (ver proposta detalhada abaixo — pensados para o perfil dele de vendedor)
- [X] Indicadores semanais (ligações, cargas, leads)
- [X] **Exportar para Excel** (relatório mensal/anual, para histórico ou prestação de contas)
- [X] **Alertas e notificações** (a definir gatilhos — ver perguntas abaixo)

### Gráficos — pensados para o perfil de vendedor

Ele pediu para pensar em gráficos "interessantes pra ele, que é vendedor" — ou seja, não só relatório frio, mas algo que **motive e dê senso de progresso/urgência**, no estilo dashboard de vendas:

1. **Barra de progresso da meta do mês** (estilo "corrida", como já existe no Excel) — % batido por cliente e geral, com cor (verde/amarelo/vermelho) como já faz hoje.
2. **Ritmo necessário ("pace")**: gráfico mostrando quanto falta faturar por dia útil restante para bater a meta (usa a fórmula de "Meta diária" que já existe) — dá senso de urgência real-time.
3. **Linha de evolução acumulada no mês**: faturamento realizado dia a dia (linha) comparado com uma linha "ideal" linear até a meta — ele vê se está "na frente" ou "atrás" do ritmo esperado.
4. **Ranking de clientes**: barra horizontal ordenada por faturamento ou comissão no mês — gamificação, "quem são meus melhores clientes agora".
5. **Comissão acumulada no mês** (R$ ganho por ele) como número grande em destaque — é o número que mais importa pessoalmente pro vendedor.
6. **Comparativo ano a ano** (2025 vs 2026, mês a mês) — sensação de evolução de carreira.
7. **Funil de conversão semanal**: ligações → leads adicionados → clientes fechados — mostra eficiência da prospecção.
8. **Rentabilidade média do período** — trend simples para não perder de vista a margem, não só o volume.

✅ DECIDIDO: implementar **todas as 8**, e ir validando com uso real quais ficam e quais saem depois.

> **Requisito de arquitetura**: os gráficos precisam ser fáceis de tirar/colocar/trocar no futuro. Cada gráfico deve ser implementado como um **componente/classe isolada e independente** (ex: `MetaProgressoChart`, `RitmoDiarioChart`, `RankingClientesChart`, etc.), plugável num dashboard — não lógica acoplada/hardcoded numa tela monolítica. Isso vira requisito de arquitetura no tópico 6 (stack) também.

✅ FECHADO: nenhuma métrica faltando por hora — as 8 acima são suficientes para começar.

### Alertas/notificações ✅ DECIDIDO

- **Só in-app por enquanto**: um ícone de notificações (tipo sininho) que ele clica e vê a lista. Sem e-mail, sem WhatsApp, sem outros canais — deixa para o futuro se fizer falta.
- **Gatilhos**: ficam a meu critério planejar (proposta inicial: "faltam N dias úteis e a meta está abaixo de X%", "cliente sem lançamento há X dias", "carga sem canhoto enviado há mais de X dias", "meta batida!"). Vou detalhar isso quando chegarmos na implementação.

> **Requisito de arquitetura**: assim como os gráficos, os gatilhos de notificação **não podem ficar engessados** — devem ser fáceis de alterar/adicionar/remover depois (ex: regras configuráveis em vez de condicionais hardcoded espalhados pelo código). Mesmo princípio de modularidade do tópico dos gráficos, aplicado aqui.

---

## 5. Migração dos dados históricos ✅ DECIDIDO

- **Importar todo o histórico** (2025 e 2026) da planilha atual para o sistema novo — dados considerados consistentes o suficiente para migração automática.
- Isso inclui: cargas/carregamentos por mês (com todas as colunas já mapeadas no tópico 3 — valores, motorista, comissão, rentabilidade etc.), clientes com suas metas mensais históricas, e os indicadores semanais (aba FEEDBACK SEMANAL).
- Motoristas e clientes precisarão ser **deduplicados** na importação: hoje "motorista" é texto livre na planilha (coluna TELEFONE existe mas está vazia em todas as linhas conferidas). ✅ DECIDIDO: agrupar por **nome normalizado** (trim, maiúsculas, espaços duplos removidos — ex. "GHILLIARD GHEEFERSON" com espaço sobrando no nome original) na importação, criar o motorista **sem telefone**, e permitir completar o telefone depois, na primeira vez que ele for reutilizado numa carga nova (ver tópico 2). Telefone só passa a ser obrigatório para motoristas cadastrados a partir de agora, não para os migrados.

> Nota técnica para quando formos implementar: como já tenho o parser que li o `.xlsx` bruto (extraindo XML + fórmulas resolvidas) para descobrir as regras do tópico 3, o mesmo caminho serve de base para o script de migração/importação real.

---

## 6. Stack tecnológica ✅ FECHADO

- [X] **Frontend** ✅ DECIDIDO: **Vue 3** (estilo `<script setup>`, padrão atual da Composition API) + **PrimeVue** (biblioteca de componentes, forte em tabelas/formulários — bom encaixe pro perfil data-heavy do sistema) + **Pinia** (gerenciamento de estado, sucessor do Vuex, sem atrito com PrimeVue).
- [X] **Backend** ✅ DECIDIDO: **Express** (versão atual) + **TypeScript** (o usuário já domina TS, mesmo sem muita experiência de backend em si).
- [X] **Banco de dados** ✅ DECIDIDO: **PostgreSQL**.
- [X] **Hospedagem** ✅ DECIDIDO: **gratuita**. Proposta concreta:
  - **Frontend (Vue)**: Vercel ou Netlify — free tier resolve bem para SPA/build estático.
  - **Backend (Express)**: Render free tier — ressalva importante: no plano gratuito o serviço "dorme" após ~15 min sem uso e demora alguns segundos para acordar na próxima requisição. Para um sistema pessoal de uso esporádico isso tende a ser aceitável, mas é bom o Thiago saber que pode ter esse delay ocasional.
  - **Banco (PostgreSQL)**: Neon — Postgres serverless com free tier generoso, feito pra esse tipo de uso (escala a zero quando não em uso).
- [X] **Autenticação** ✅ DECIDIDO: **JWT simples** (login com email/senha, hash de senha com bcrypt, token JWT emitido pelo Express) — sem OAuth, sem complexidade extra, condizente com ser single-user.
- [ ] **Arquitetura de gráficos** (requisito vindo do tópico 4): cada gráfico como componente isolado/plugável — definir qual lib de charts (ex: Recharts, Chart.js, D3) permite isso de forma mais natural no frontend escolhido.
- [ ] **Arquitetura de notificações** (requisito vindo do tópico 4): gatilhos configuráveis, não hardcoded — avaliar um pequeno "motor de regras" (lista de regras avaliadas periodicamente) em vez de lógica fixa espalhada pelo backend.

---

## 7. Fases / Roadmap sugerido

Como todas as funcionalidades do tópico 4 são essenciais (nada fica de fora), as fases abaixo são só **ordem de construção**, não corte de escopo — o objetivo é ter tudo funcionando no fim, construído em etapas que já entregam valor incremental:

1. **Fase 1 — MVP**: cadastro de carregamentos + cliente + motorista, cálculo automático de comissão/rentabilidade, listagem/filtro.
2. **Fase 2 — Metas e dashboard mensal**: metas por cliente, % realizado, totais do mês.
3. **Fase 3 — Comparativo anual e gráficos**: réplica das visões de PROJEÇÃO e dashboards visuais.
4. **Fase 4 — Indicadores semanais e extras**: ligações/leads, exportações, alertas.

- [ ] Essa ordem faz sentido para você, ou o Thiago tem prioridade diferente (ex: ele quer ver o dashboard funcionando primeiro, mesmo com cadastro simples)?

---

## 8. Prazo e formato de entrega

- [ ] Existe um prazo combinado com o Thiago?
- [ ] Vai ser cobrado como projeto fechado ou por fases entregues?

> Nota: este sistema não vai ser cobrado do Thiago. A estimativa de horas/valor abaixo é **só para referência pessoal** de quanto o sistema valeria de mercado, não é uma cobrança real.

### Estimativa de horas e valor (referência pessoal, não cobrado)

Estimativa por módulo, considerando todo o escopo fechado nos tópicos 1-7 (CRUD completo, cadeia de cálculo replicada do Excel, 8 gráficos modulares, notificações com motor de regras, exportação Excel, migração de dados históricos):

| Módulo | Horas (estimativa) |
| --- | --- |
| Setup do projeto (repo, banco, hospedagem, CI) | 8 – 12h |
| Autenticação (JWT) | 6 – 10h |
| CRUD Cliente | 8 – 12h |
| CRUD Motorista (com regra de telefone único/opcional) | 6 – 10h |
| CRUD Carregamento/Carga (mais complexo — ~15 campos calculados) | 20 – 30h |
| Metas mensais por cliente | 8 – 12h |
| Dashboard mensal | 10 – 15h |
| Dashboard anual comparativo | 8 – 12h |
| 8 gráficos modulares/plugáveis | 16 – 24h |
| Indicadores semanais (Feedback Semanal) | 6 – 10h |
| Notificações in-app + motor de regras | 10 – 15h |
| Exportação para Excel | 6 – 10h |
| Migração dos dados históricos (2025/2026) | 10 – 16h |
| Testes, ajustes finos, revisão com o Thiago | 15 – 20h |
| **Total estimado** | **~137 – 208h** (média ~170h) |

**Valor de mercado (referência, freelancer BR para sistema sob medida):**

- Faixa de hora trabalhada: **R$ 80 – R$ 150/h** (freelancer pleno/sênior fazendo sistema customizado para pequeno negócio)
- Total estimado: **~R$ 11.000 a R$ 31.000**, com um cenário mais realista em torno de **R$ 15.000 a R$ 20.000** (170h × R$ 100–120/h)

> É uma estimativa grosseira de planejamento, não uma proposta comercial — serve só para você ter noção de ordem de grandeza do que está construindo.

---

## Próximo passo

Sugiro irmos tópico por tópico (pode ser na ordem acima) respondendo o que já souber e me perguntando o que precisar — conforme fecharmos cada um, eu vou atualizando este documento com as decisões tomadas.
