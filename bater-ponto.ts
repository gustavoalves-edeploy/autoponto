#!/usr/bin/env tsx

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { createInterface } from "readline/promises";
import schedule from "node-schedule";

interface Ponto {
  horario: string;
  timestamp: string;
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
  return (h2 * 60 + m2) - (h1 * 60 + m1);
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
  console.log(`\n⏰ O script será executado automaticamente no horário agendado.`);
  console.log(`   Para cancelar, pressione Ctrl+C\n`);

  schedule.scheduleJob(horarioAgendado, () => {
    console.log(`\n🔔 Executando ponto agendado...`);
    main();
  });

  // Mantém o processo rodando
  await new Promise(() => {});
}

async function main() {
  try {
    console.log("🚀 Executando teste Cypress...\n");

    // Executa o teste Cypress
    execSync("npx cypress run --spec cypress/e2e/autoponto.cy.ts", {
      stdio: "inherit",
    });

    // Lê o JSON do dia atual
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();
    const caminhoJson = `pontos/${ano}/${mes}/${dia}.json`;

    if (!existsSync(caminhoJson)) {
      console.error(`❌ Arquivo ${caminhoJson} não encontrado!`);
      process.exit(1);
    }

    const pontos: Ponto[] = JSON.parse(readFileSync(caminhoJson, "utf-8"));

    console.log("\n📊 RESUMO DA JORNADA\n");
    console.log("⏰ Pontos batidos:");
    pontos.forEach((ponto, index) => {
      const tipo =
        index === 0
          ? "Entrada"
          : index === 1
          ? "Saída para almoço"
          : index === 2
          ? "Retorno do almoço"
          : "Saída";
      console.log(`   ${index + 1}. ${ponto.horario} - ${tipo}`);
    });

    // Calcula informações baseadas na quantidade de pontos
    const primeiraEntrada = pontos[0].horario;

    if (pontos.length === 1) {
      // Apenas entrada
      const fimJornada8h = adicionarMinutos(primeiraEntrada, 8 + 1 * 60); // 1h de almoço
      const fimJornada10h = adicionarMinutos(primeiraEntrada, 10 + 1 * 60); // 1h de almoço

      console.log("\n📌 Informações:");
      console.log(`   🕐 Jornada de 8h encerra às: ${fimJornada8h}`);
      console.log(`   🕐 Jornada de 10h encerra às: ${fimJornada10h}`);
      console.log(`   💡 OBS: As previsões consideram 1h de almoço.`);
    } else if (pontos.length === 2) {
      // Entrada + Saída para almoço
      const saidaAlmoco = pontos[1].horario;
      const retornoMinimo = adicionarMinutos(saidaAlmoco, 60); // 1h de almoço
      const retornoMaximo = adicionarMinutos(saidaAlmoco, 120); // 2h de almoço

      // Calcula quanto tempo trabalhou até agora
      const minutosTrabalhadosManha = calcularDiferencaMinutos(
        primeiraEntrada,
        saidaAlmoco
      );

      // Calcula quando encerra 8h (considerando 1h de almoço mínimo)
      const minutosRestantes8h = 8 * 60 - minutosTrabalhadosManha;
      const fimJornada8h = adicionarMinutos(retornoMinimo, minutosRestantes8h);

      // Calcula quando encerra 10h (considerando 1h de almoço mínimo)
      const minutosRestantes10h = 10 * 60 - minutosTrabalhadosManha;
      const fimJornada10h = adicionarMinutos(retornoMinimo, minutosRestantes10h);

      console.log("\n📌 Informações:");
      console.log(`   🍽️  Retorno do almoço (mínimo): ${retornoMinimo}`);
      console.log(`   🍽️  Retorno do almoço (máximo): ${retornoMaximo}`);
      console.log(
        `   🕐 Jornada de 8h encerra às: ${fimJornada8h} (se voltar às ${retornoMinimo})`
      );
      console.log(
        `   🕐 Jornada de 10h encerra às: ${fimJornada10h} (se voltar às ${retornoMinimo})`
      );

      // Pergunta se quer agendar o próximo ponto
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log("\n🤔 Deseja agendar o retorno do almoço automaticamente?");
      const resposta = await rl.question(
        `   Digite o horário (HH:MM) ou pressione Enter para pular: `
      );
      rl.close();

      if (resposta.trim()) {
        await agendarProximoPonto(resposta.trim());
      } else {
        console.log("\n✅ Ponto batido com sucesso! Até a próxima! 👋\n");
      }
    } else if (pontos.length === 3) {
      // Entrada + Saída almoço + Retorno almoço
      const saidaAlmoco = pontos[1].horario;
      const retornoAlmoco = pontos[2].horario;

      // Calcula tempo trabalhado de manhã e tempo de almoço
      const minutosTrabalhadosManha = calcularDiferencaMinutos(
        primeiraEntrada,
        saidaAlmoco
      );
      const minutosAlmoco = calcularDiferencaMinutos(saidaAlmoco, retornoAlmoco);

      // Calcula quando encerra 8h e 10h
      const minutosRestantes8h = 8 * 60 - minutosTrabalhadosManha;
      const minutosRestantes10h = 10 * 60 - minutosTrabalhadosManha;

      const fimJornada8h = adicionarMinutos(retornoAlmoco, minutosRestantes8h);
      const fimJornada10h = adicionarMinutos(retornoAlmoco, minutosRestantes10h);

      console.log("\n📌 Informações:");
      console.log(`   ⏱️  Tempo de almoço: ${minutosAlmoco} minutos`);
      console.log(`   🕐 Jornada de 8h encerra às: ${fimJornada8h}`);
      console.log(`   🕐 Jornada de 10h encerra às: ${fimJornada10h}`);

      // Pergunta se quer agendar a saída
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log("\n🤔 Deseja agendar a saída automaticamente?");
      const resposta = await rl.question(
        `   Digite o horário (HH:MM) ou pressione Enter para pular: `
      );
      rl.close();

      if (resposta.trim()) {
        await agendarProximoPonto(resposta.trim());
      } else {
        console.log("\n✅ Ponto batido com sucesso! Até a próxima! 👋\n");
      }
    } else {
      // 4 pontos ou mais - jornada completa
      console.log("\n✅ Jornada completa! Bom descanso! 😴\n");
    }
  } catch (error) {
    console.error("❌ Erro ao executar:", error);
    process.exit(1);
  }
}

main();
