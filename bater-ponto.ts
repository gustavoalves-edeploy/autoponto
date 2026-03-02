#!/usr/bin/env tsx

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
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

  await executarPontoEExibirStatus();
}

bootstrap().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Erro inesperado ao executar comando.";
  console.error(`❌ ${message}`);
  process.exit(1);
});
