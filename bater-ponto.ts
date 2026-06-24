#!/usr/bin/env tsx

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import schedule from "node-schedule";

interface Ponto {
  hourMin: string;
  timestamp: string;
}

function getCaminhoJsonHoje(): string {
  const hoje = new Date();
  return `pontos/${hoje.getFullYear()}/${hoje.getMonth() + 1}/${hoje.getDate()}.json`;
}

function lerPontosHoje(): Ponto[] | null {
  const caminho = getCaminhoJsonHoje();
  if (!existsSync(caminho)) return null;
  return JSON.parse(readFileSync(caminho, "utf-8"));
}

function formatarMinutosHumano(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}min`;
  return `${horas}h${minutos.toString().padStart(2, "0")}min`;
}

function formatarHora(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function adicionarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m + minutos, 0, 0);
  return formatarHora(date);
}

function calcularDiferencaMinutos(hora1: string, hora2: string): number {
  const [h1, m1] = hora1.split(":").map(Number);
  const [h2, m2] = hora2.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

async function agendarProximoPonto(horaRetorno: string) {
  const [horas, minutos] = horaRetorno.split(":").map(Number);
  const agora = new Date();
  const horarioAgendado = new Date();
  horarioAgendado.setHours(horas, minutos, 0, 0);

  // Se o horário já passou hoje, agenda para amanhã
  if (horarioAgendado <= agora) {
    horarioAgendado.setDate(horarioAgendado.getDate() + 1);
  }

  console.log(`\n✅ Ponto agendado para ${formatarHora(horarioAgendado)}`);
  console.log(`📅 Data: ${horarioAgendado.toLocaleDateString("pt-BR")}`);
  console.log(
    `\n⏰ O script será executado automaticamente no horário agendado.`,
  );
  console.log(`   Para cancelar, pressione Ctrl+C\n`);

  schedule.scheduleJob(horarioAgendado, () => {
    void executarPontoEExibirStatus();
  });

  // Mantém o processo rodando
  await new Promise(() => { });
}

async function main() {
  execSync("npx cypress run --spec cypress/e2e/autoponto.cy.ts", {
    stdio: "pipe",
  });

  const caminhoJson = getCaminhoJsonHoje();
  const pontos = lerPontosHoje();

  if (!pontos) {
    throw new Error(`Arquivo ${caminhoJson} não encontrado.`);
  }
}

async function executarPontoEExibirStatus() {
  await main();
  status();
}

function status() {
  const pontos = lerPontosHoje();

  if (!pontos || pontos.length === 0) {
    console.log("\n🔍 STATUS DO DIA\n");
    console.log("  😴 Nenhum ponto registrado hoje.");
    console.log("  📌 Você ainda não iniciou sua jornada.\n");
    return;
  }

  const agora = new Date();
  const horaAtual = formatarHora(agora);
  const primeiraEntrada = pontos[0].hourMin;

  console.log("\n🔍 STATUS DO DIA\n");
  console.log(`  🕐 Hora atual: ${horaAtual}`);
  console.log("  ⏰ Pontos registrados:");
  pontos.forEach((ponto, index) => {
    const emoji = index % 2 === 0 ? "🟢" : "🔴";
    const tipo =
      index === 0
        ? "Entrada"
        : index === 1
          ? "Saída para almoço"
          : index === 2
            ? "Retorno do almoço"
            : "Saída";
    console.log(`     ${index + 1}. ${emoji} ${ponto.hourMin} - ${tipo}`);
  });
  console.log("");

  if (pontos.length === 1) {
    const minutosTrabalhadosAte = calcularDiferencaMinutos(primeiraEntrada, horaAtual);

    console.log(`  💼 Você está trabalhando! Iniciou às ${primeiraEntrada}.`);
    console.log(`  ⏱️  Tempo trabalhado até agora: ${formatarMinutosHumano(minutosTrabalhadosAte)}`);
    console.log("");

    const fimJornada8h = adicionarMinutos(primeiraEntrada, (8 + 1) * 60);
    const fimJornada10h = adicionarMinutos(primeiraEntrada, (10 + 1) * 60);

    console.log("  📊 Previsões (considerando 1h de almoço):");
    console.log(`     🏁 Jornada de 8h encerra às: ${fimJornada8h}`);
    console.log(`     🏁 Jornada de 10h encerra às: ${fimJornada10h}`);
    console.log("");
  } else if (pontos.length === 2) {
    const saidaAlmoco = pontos[1].hourMin;
    const retornoMinimo = adicionarMinutos(saidaAlmoco, 60);
    const retornoMaximo = adicionarMinutos(saidaAlmoco, 120);
    const minutosTrabalhadosManha = calcularDiferencaMinutos(primeiraEntrada, saidaAlmoco);
    const minutosNoAlmoco = calcularDiferencaMinutos(saidaAlmoco, horaAtual);

    console.log("  🍽️  Você está no seu horário de almoço!");
    console.log(`  ⏱️  Tempo trabalhado pela manhã: ${formatarMinutosHumano(minutosTrabalhadosManha)}`);
    console.log(`  🕐 Tempo no almoço: ${formatarMinutosHumano(minutosNoAlmoco)}`);
    console.log("");
    console.log(`  ⏰ Você pode voltar no mínimo às ${retornoMinimo}`);
    console.log(`  ⏰ Você pode voltar no máximo às ${retornoMaximo}`);
    console.log("");

    const minutosRestantes8h = 8 * 60 - minutosTrabalhadosManha;
    const fimJornada8h = adicionarMinutos(retornoMinimo, minutosRestantes8h);
    const fimJornada10h = adicionarMinutos(retornoMinimo, minutosRestantes8h + 2 * 60);

    console.log("  📊 Previsões (se voltar no horário mínimo):");
    console.log(`     🏁 Jornada de 8h encerra às: ${fimJornada8h}`);
    console.log(`     🏁 Jornada de 10h encerra às: ${fimJornada10h}`);
    console.log("");
  } else if (pontos.length === 3) {
    const saidaAlmoco = pontos[1].hourMin;
    const retornoAlmoco = pontos[2].hourMin;
    const minutosTrabalhadosManha = calcularDiferencaMinutos(primeiraEntrada, saidaAlmoco);
    const minutosTrabalhadosTarde = calcularDiferencaMinutos(retornoAlmoco, horaAtual);
    const totalMinutosTrabalhados = minutosTrabalhadosManha + minutosTrabalhadosTarde;
    const minutosIntervalo = calcularDiferencaMinutos(saidaAlmoco, retornoAlmoco);

    const minutosRestantes8h = 8 * 60 - totalMinutosTrabalhados;
    const minutosRestantes10h = 10 * 60 - totalMinutosTrabalhados;

    console.log("  💼 Você está trabalhando no período da tarde!");
    console.log(`  ⏱️  Tempo trabalhado: ${formatarMinutosHumano(totalMinutosTrabalhados)}`);
    console.log(`  🍽️  Tempo de intervalo: ${formatarMinutosHumano(minutosIntervalo)}`);
    console.log("");

    if (minutosRestantes8h > 0) {
      const fimJornada8h = adicionarMinutos(horaAtual, minutosRestantes8h);
      const fimJornada10h = adicionarMinutos(horaAtual, minutosRestantes10h);
      console.log(`  📊 Faltam ${formatarMinutosHumano(minutosRestantes8h)} para completar 8h.`);
      console.log(`     🏁 Jornada de 8h encerra às: ${fimJornada8h}`);
      console.log(`     🏁 Jornada de 10h encerra às: ${fimJornada10h}`);
    } else if (minutosRestantes10h > 0) {
      console.log("  ✅ Você já completou 8h de trabalho!");
      const fimJornada10h = adicionarMinutos(horaAtual, minutosRestantes10h);
      console.log(`  📊 Faltam ${formatarMinutosHumano(minutosRestantes10h)} para completar 10h.`);
      console.log(`     🏁 Jornada de 10h encerra às: ${fimJornada10h}`);
    } else {
      console.log("  ⚠️  Você já ultrapassou 10h de trabalho! Hora de encerrar!");
    }
    console.log("");
  } else {
    const saidaAlmoco = pontos[1].hourMin;
    const retornoAlmoco = pontos[2].hourMin;
    const saida = pontos[3].hourMin;

    const minutosManha = calcularDiferencaMinutos(primeiraEntrada, saidaAlmoco);
    const minutosTarde = calcularDiferencaMinutos(retornoAlmoco, saida);
    const totalMinutosTrabalhados = minutosManha + minutosTarde;
    const minutosIntervalo = calcularDiferencaMinutos(saidaAlmoco, retornoAlmoco);

    console.log("  ✅ Jornada completa! Você já pode descansar! 🎉");
    console.log(`  💼 Tempo total trabalhado: ${formatarMinutosHumano(totalMinutosTrabalhados)}`);
    console.log(`  🍽️  Tempo de intervalo: ${formatarMinutosHumano(minutosIntervalo)}`);
    console.log("");
  }
}

async function agendar(horario: string) {
  if (!/^\d{2}:\d{2}$/.test(horario)) {
    console.error("❌ Formato inválido! Use o formato HH:mm (ex: 14:30)");
    process.exit(1);
  }

  const [horas, minutos] = horario.split(":").map(Number);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    console.error("❌ Horário inválido! Horas devem ser 00-23 e minutos 00-59.");
    process.exit(1);
  }

  console.log(`\n📋 Agendando batida de ponto para ${horario}...`);
  await agendarProximoPonto(horario);
}

interface DiaHistorico {
  data: string;
  diaSemana: string;
  pontos: Ponto[];
  minutosTrabalhados: number | null;
  minutosAlmoco: number | null;
  jornadaCompleta: boolean;
}

function lerHistoricoCompleto(): DiaHistorico[] {
  const baseDir = "pontos";
  const dias: DiaHistorico[] = [];

  if (!existsSync(baseDir)) return dias;

  const anos = readdirSync(baseDir).filter((n) => /^\d{4}$/.test(n));
  for (const ano of anos.sort()) {
    const dirAno = path.join(baseDir, ano);
    const meses = readdirSync(dirAno).filter((n) => /^\d{1,2}$/.test(n));
    for (const mes of meses.sort((a, b) => Number(a) - Number(b))) {
      const dirMes = path.join(dirAno, mes);
      const arquivos = readdirSync(dirMes).filter((n) => n.endsWith(".json"));
      for (const arquivo of arquivos.sort(
        (a, b) => parseInt(a) - parseInt(b),
      )) {
        const dia = arquivo.replace(".json", "");
        const caminho = path.join(dirMes, arquivo);
        let pontos: Ponto[];
        try {
          pontos = JSON.parse(readFileSync(caminho, "utf-8"));
        } catch {
          continue;
        }
        if (!Array.isArray(pontos)) continue;

        const dataIso = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        const dataObj = new Date(`${dataIso}T12:00:00`);
        const diaSemana = dataObj.toLocaleDateString("pt-BR", {
          weekday: "long",
        });

        let minutosTrabalhados: number | null = null;
        let minutosAlmoco: number | null = null;
        let jornadaCompleta = false;

        if (pontos.length === 0) {
          minutosTrabalhados = 0;
        } else if (pontos.length >= 4) {
          const manha = calcularDiferencaMinutos(
            pontos[0].hourMin,
            pontos[1].hourMin,
          );
          const tarde = calcularDiferencaMinutos(
            pontos[2].hourMin,
            pontos[3].hourMin,
          );
          minutosTrabalhados = manha + tarde;
          minutosAlmoco = calcularDiferencaMinutos(
            pontos[1].hourMin,
            pontos[2].hourMin,
          );
          jornadaCompleta = true;
        } else if (pontos.length === 3) {
          minutosTrabalhados = calcularDiferencaMinutos(
            pontos[0].hourMin,
            pontos[1].hourMin,
          );
          minutosAlmoco = calcularDiferencaMinutos(
            pontos[1].hourMin,
            pontos[2].hourMin,
          );
        } else if (pontos.length === 2) {
          minutosTrabalhados = calcularDiferencaMinutos(
            pontos[0].hourMin,
            pontos[1].hourMin,
          );
        }

        dias.push({
          data: dataIso,
          diaSemana,
          pontos,
          minutosTrabalhados,
          minutosAlmoco,
          jornadaCompleta,
        });
      }
    }
  }

  return dias;
}

function gerarHtmlHistorico(dias: DiaHistorico[]): string {
  const dadosJson = JSON.stringify(dias);
  const totalDias = dias.length;
  const diasCompletos = dias.filter((d) => d.jornadaCompleta).length;
  const totalMinutosTrabalhados = dias.reduce(
    (acc, d) => acc + (d.minutosTrabalhados ?? 0),
    0,
  );
  const mediaMinutos = diasCompletos
    ? Math.round(
        dias
          .filter((d) => d.jornadaCompleta)
          .reduce((acc, d) => acc + (d.minutosTrabalhados ?? 0), 0) /
          diasCompletos,
      )
    : 0;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Histórico de Pontos</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface-2: #334155;
    --border: #475569;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --green: #4ade80;
    --yellow: #fbbf24;
    --red: #f87171;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-2: #f1f5f9;
      --border: #cbd5e1;
      --text: #0f172a;
      --muted: #64748b;
      --accent: #0284c7;
      --green: #16a34a;
      --yellow: #ca8a04;
      --red: #dc2626;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 28px; }
  .subtitle { color: var(--muted); margin-bottom: 24px; font-size: 14px; }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }
  .stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }
  .stat-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 22px; font-weight: 600; margin-top: 4px; }
  .controls {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    align-items: center;
  }
  select, input {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  th {
    background: var(--surface-2);
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    white-space: nowrap;
  }
  th:hover { color: var(--accent); }
  th.sort-asc::after { content: " ▲"; color: var(--accent); }
  th.sort-desc::after { content: " ▼"; color: var(--accent); }
  tbody tr:hover { background: var(--surface-2); }
  tbody tr:last-child td { border-bottom: none; }
  td.num { font-variant-numeric: tabular-nums; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-ok { background: color-mix(in srgb, var(--green) 20%, transparent); color: var(--green); }
  .badge-warn { background: color-mix(in srgb, var(--yellow) 20%, transparent); color: var(--yellow); }
  .badge-incomplete { background: color-mix(in srgb, var(--red) 20%, transparent); color: var(--red); }
  .empty { padding: 48px; text-align: center; color: var(--muted); }
  .weekday { color: var(--muted); font-size: 12px; text-transform: capitalize; }
  .saldo-pos { color: var(--green); }
  .saldo-neg { color: var(--red); }
  tfoot td {
    background: var(--surface-2);
    font-weight: 600;
    border-top: 2px solid var(--border);
    border-bottom: none;
  }
</style>
</head>
<body>
<div class="container">
  <h1>📊 Histórico de Pontos</h1>
  <div class="subtitle">Gerado em <span id="generatedAt"></span></div>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Dias registrados</div>
      <div class="stat-value">${totalDias}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Jornadas completas</div>
      <div class="stat-value">${diasCompletos}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total trabalhado</div>
      <div class="stat-value">${formatMin(totalMinutosTrabalhados)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Média / dia completo</div>
      <div class="stat-value">${formatMin(mediaMinutos)}</div>
    </div>
  </div>

  <div class="controls">
    <select id="monthFilter">
      <option value="">Todos os meses</option>
    </select>
    <input type="search" id="search" placeholder="Buscar data (ex: 2026-04)" />
  </div>

  <table id="tabela">
    <thead>
      <tr>
        <th data-sort="data">Data</th>
        <th data-sort="diaSemana">Dia</th>
        <th data-sort="entrada">Entrada</th>
        <th data-sort="saidaAlmoco">Saída almoço</th>
        <th data-sort="retornoAlmoco">Retorno</th>
        <th data-sort="saida">Saída</th>
        <th data-sort="trabalhado">Trabalhado</th>
        <th data-sort="almoco">Almoço</th>
        <th data-sort="saldo">Saldo</th>
        <th data-sort="status">Status</th>
      </tr>
    </thead>
    <tbody></tbody>
    <tfoot>
      <tr>
        <td colspan="6">Total visível</td>
        <td class="num" id="totalTrabalhado"></td>
        <td class="num" id="totalAlmoco"></td>
        <td class="num" id="totalSaldo"></td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</div>

<script>
  const dados = ${dadosJson};

  function formatMin(min) {
    if (min == null) return "-";
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return m + "min";
    return h + "h" + String(m).padStart(2, "0") + "min";
  }

  function formatSaldo(min) {
    if (min == null) return { text: "-", cls: "" };
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const fmt = h === 0 ? m + "min" : h + "h" + String(m).padStart(2, "0") + "min";
    if (min >= 0) return { text: "+" + fmt, cls: "saldo-pos" };
    return { text: "−" + fmt, cls: "saldo-neg" };
  }

  function statusInfo(d) {
    if (d.pontos.length === 0) return { label: "Faltou", cls: "badge-incomplete" };
    if (d.jornadaCompleta) return { label: "Completa", cls: "badge-ok" };
    if (d.pontos.length === 3) return { label: "Tarde", cls: "badge-warn" };
    if (d.pontos.length === 2) return { label: "Almoço", cls: "badge-warn" };
    return { label: "Parcial", cls: "badge-incomplete" };
  }

  function rowFor(d) {
    const p = d.pontos;
    const trabalhado = d.minutosTrabalhados;
    const almoco = d.minutosAlmoco;
    return {
      data: d.data,
      diaSemana: d.diaSemana,
      entrada: p[0]?.hourMin ?? "",
      saidaAlmoco: p[1]?.hourMin ?? "",
      retornoAlmoco: p[2]?.hourMin ?? "",
      saida: p[3]?.hourMin ?? "",
      trabalhado: trabalhado,
      almoco: almoco,
      saldo: trabalhado != null ? trabalhado - 480 : null,
      status: statusInfo(d),
      _raw: d,
    };
  }

  let rows = dados.map(rowFor);
  let sortKey = "data";
  let sortDir = -1;

  const meses = [...new Set(dados.map((d) => d.data.slice(0, 7)))].sort().reverse();
  const select = document.getElementById("monthFilter");
  for (const m of meses) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  }

  const search = document.getElementById("search");
  select.addEventListener("change", render);
  search.addEventListener("input", render);

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir = -sortDir;
      else { sortKey = key; sortDir = 1; }
      render();
    });
  });

  function compare(a, b) {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (sortKey === "status") {
      return (va.label > vb.label ? 1 : va.label < vb.label ? -1 : 0) * sortDir;
    }
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va > vb) return 1 * sortDir;
    if (va < vb) return -1 * sortDir;
    return 0;
  }

  function render() {
    const monthVal = select.value;
    const searchVal = search.value.toLowerCase().trim();
    const filtered = rows
      .filter((r) => !monthVal || r.data.startsWith(monthVal))
      .filter((r) => !searchVal || r.data.includes(searchVal) || r.diaSemana.toLowerCase().includes(searchVal))
      .sort(compare);

    const tbody = document.querySelector("#tabela tbody");
    tbody.innerHTML = "";
    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="10" class="empty">Nenhum registro encontrado.</td>';
      tbody.appendChild(tr);
    } else {
      for (const r of filtered) {
        const tr = document.createElement("tr");
        const s = formatSaldo(r.saldo);
        tr.innerHTML =
          '<td class="num">' + r.data + '</td>' +
          '<td class="weekday">' + r.diaSemana + '</td>' +
          '<td class="num">' + r.entrada + '</td>' +
          '<td class="num">' + r.saidaAlmoco + '</td>' +
          '<td class="num">' + r.retornoAlmoco + '</td>' +
          '<td class="num">' + r.saida + '</td>' +
          '<td class="num">' + formatMin(r.trabalhado) + '</td>' +
          '<td class="num">' + formatMin(r.almoco) + '</td>' +
          '<td class="num ' + s.cls + '">' + s.text + '</td>' +
          '<td><span class="badge ' + r.status.cls + '">' + r.status.label + '</span></td>';
        tbody.appendChild(tr);
      }
    }

    const totalT = filtered.reduce((acc, r) => acc + (r.trabalhado ?? 0), 0);
    const totalA = filtered.reduce((acc, r) => acc + (r.almoco ?? 0), 0);
    const totalS = filtered.filter((r) => r.saldo != null).reduce((acc, r) => acc + r.saldo, 0);
    document.getElementById("totalTrabalhado").textContent = formatMin(totalT);
    document.getElementById("totalAlmoco").textContent = formatMin(totalA);
    const totalSaldoEl = document.getElementById("totalSaldo");
    const ts = formatSaldo(filtered.some((r) => r.saldo != null) ? totalS : null);
    totalSaldoEl.textContent = ts.text;
    totalSaldoEl.className = "num " + ts.cls;

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
      if (th.dataset.sort === sortKey) {
        th.classList.add(sortDir > 0 ? "sort-asc" : "sort-desc");
      }
    });
  }

  document.getElementById("generatedAt").textContent = new Date().toLocaleString("pt-BR");
  render();
</script>
</body>
</html>`;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}min`;
}

function historico() {
  const dias = lerHistoricoCompleto();
  if (dias.length === 0) {
    console.log("\n📊 HISTÓRICO\n");
    console.log("  😴 Nenhum registro encontrado em pontos/.\n");
    return;
  }

  const html = gerarHtmlHistorico(dias);
  const destino = "pontos/historico.html";
  writeFileSync(destino, html, "utf-8");

  console.log("\n📊 HISTÓRICO GERADO\n");
  console.log(`  📁 Arquivo: ${destino}`);
  console.log(`  📅 Dias registrados: ${dias.length}`);
  console.log("");

  if (process.platform === "darwin") {
    try {
      execSync(`open "${destino}"`, { stdio: "ignore" });
      console.log("  🌐 Abrindo no navegador...\n");
    } catch {
      console.log(`  💡 Abra manualmente: open ${destino}\n`);
    }
  } else {
    console.log(`  💡 Abra o arquivo no seu navegador para visualizar.\n`);
  }
}

const command = process.argv[2];

async function bootstrap() {
  if (command === "status") {
    status();
    return;
  }

  if (command === "agendar") {
    const horario = process.argv[3];
    if (!horario) {
      throw new Error("Informe o horário. Uso: npm run agendar -- HH:mm");
    }
    await agendar(horario);
    return;
  }

  if (command === "historico") {
    historico();
    return;
  }

  await executarPontoEExibirStatus();
}

bootstrap().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Erro inesperado ao executar comando.";
  console.error(`❌ ${message}`);
  process.exit(1);
});
