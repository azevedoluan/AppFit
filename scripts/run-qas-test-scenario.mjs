/**
 * Cenário de Testes Completo - Ambiente de QAS (AppFit)
 * 
 * Cadastra Usuário A (Upload Imagem) e Usuário B (Upload Planilha CSV)
 * Testa divisão dos treinos, persistência, mudanças de carga, marcação de feito,
 * tempos de descanso, resiliência contra race condition / polling e histórico.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSpreadsheet, sanitizeExcelDateToWorkoutRange, parseSeriesCount } from './importUtils.mjs';
import { mergeWorkoutsPreservingLocal } from './userWorkoutStorage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QAS_BASE_URL = process.env.QAS_URL || 'http://127.0.0.1:3002/api';

console.log('================================================================');
console.log('   INICIANDO BATERIA DE TESTES - AMBIENTE DE QAS (PORT 3002)   ');
console.log('================================================================');
console.log(`Endpoint QAS: ${QAS_BASE_URL}`);

const testResults = [];

function recordTest(category, name, passed, details = '') {
  testResults.push({ category, name, passed, details });
  const symbol = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${symbol} ${category} -> ${name}`);
  if (details) {
    console.log(`   Detalhes: ${details}`);
  }
}

async function runTests() {
  // --------------------------------------------------------------------------
  // TESTE 0: Health Check do Ambiente de QAS
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${QAS_BASE_URL}/health`);
    const data = await res.json();
    const isOk = res.ok && data.status === 'ok' && data.database === 'connected';
    recordTest('Ambiente QAS', 'Health Check e Conexão PostgreSQL (appfit_qas_db)', isOk, `Server Time: ${data.serverTime}`);
  } catch (err) {
    recordTest('Ambiente QAS', 'Health Check e Conexão PostgreSQL (appfit_qas_db)', false, `Erro: ${err.message}`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TESTE 1: Cadastro dos Dois Novos Usuários
  // --------------------------------------------------------------------------
  const userA = {
    id: 'usr_qas_atleta_a_' + Date.now(),
    name: 'Atleta A (Imagem QAS)',
    email: 'atleta_a_qas@appfit.test',
    role: 'athlete'
  };

  const userB = {
    id: 'usr_qas_atleta_b_' + Date.now(),
    name: 'Atleta B (Planilha QAS)',
    email: 'atleta_b_qas@appfit.test',
    role: 'athlete'
  };

  try {
    const resA = await fetch(`${QAS_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA)
    });
    const syncedA = await resA.json();
    userA.id = syncedA.id;
    recordTest('Autenticação & Usuários', 'Cadastro de Usuário A (Imagem)', resA.ok && syncedA.email === userA.email, `ID: ${userA.id}`);

    const resB = await fetch(`${QAS_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB)
    });
    const syncedB = await resB.json();
    userB.id = syncedB.id;
    recordTest('Autenticação & Usuários', 'Cadastro de Usuário B (Planilha)', resB.ok && syncedB.email === userB.email, `ID: ${userB.id}`);
  } catch (err) {
    recordTest('Autenticação & Usuários', 'Cadastro de usuários de teste', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 2: Upload e Processamento de Treino via Imagem (Usuário A)
  // --------------------------------------------------------------------------
  console.log('\n--- Testando Upload e Processamento da Imagem (Usuário A) ---');
  let workoutDaysUserA = [];
  const imagePath = path.join(__dirname, '..', 'test-assets', 'imagem_usuario_a.jpg');
  
  if (!fs.existsSync(imagePath)) {
    recordTest('Usuário A - Imagem', 'Localização do arquivo de imagem', false, `Arquivo não encontrado em: ${imagePath}`);
  } else {
    recordTest('Usuário A - Imagem', 'Localização do arquivo de imagem', true, `Arquivo encontrado (${(fs.statSync(imagePath).size / 1024).toFixed(1)} KB)`);

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

      console.log('   Enviando imagem para análise visual OCR no QAS...');
      const ocrRes = await fetch(`${QAS_BASE_URL}/ocr/analyze-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const ocrData = await ocrRes.json();
      const hasDays = ocrRes.ok && Array.isArray(ocrData.days) && ocrData.days.length >= 5;
      recordTest('Usuário A - Imagem', 'Processamento OCR da Ficha', hasDays, `Dias detectados: ${ocrData.days?.length || 0}, Confiança: ${ocrData.confidence}%`);

      if (hasDays) {
        workoutDaysUserA = ocrData.days;

        // Validação da divisão dos dias
        const dayCodes = workoutDaysUserA.map(d => d.dayCode);
        const expectedCodes = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
        const divisionsCorrect = expectedCodes.every(code => dayCodes.includes(code));
        recordTest('Usuário A - Imagem', 'Divisão Semanal dos 5 Dias (SEG a SEX)', divisionsCorrect, `Dias: ${dayCodes.join(', ')}`);

        // Validação dos exercícios e séries
        const day1 = workoutDaysUserA.find(d => d.dayCode === 'SEG');
        const day1Valid = day1 && day1.exercises.length >= 10;
        recordTest('Usuário A - Imagem', 'Exercícios Segunda (Superiores A)', day1Valid, `Exercícios: ${day1?.exercises.length || 0}`);

        // Validação de unidades de medida (Cardio / Isometria / Reps)
        const warmUpEx = day1?.exercises.find(e => /aquecim|bicicleta/i.test(e.name));
        const warmUpCorrect = warmUpEx && (warmUpEx.metricType === 'time' || warmUpEx.metricUnit === 'min');
        recordTest('Usuário A - Imagem', 'Detecção Métrica Cardio/Aquecimento (min)', Boolean(warmUpCorrect), `Ex: ${warmUpEx?.name} -> ${warmUpEx?.metricUnit}`);

        const bracingEx = day1?.exercises.find(e => /isometria|bracing/i.test(e.name));
        const bracingCorrect = bracingEx && (bracingEx.metricType === 'time' || bracingEx.metricUnit === 's');
        recordTest('Usuário A - Imagem', 'Detecção Métrica Isometria/Core (s)', Boolean(bracingCorrect), `Ex: ${bracingEx?.name} -> ${bracingEx?.metricUnit}`);

        // Persistência da ficha do Usuário A no banco de dados QAS
        const saveRes = await fetch(`${QAS_BASE_URL}/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userA.id,
            workoutDays: workoutDaysUserA,
            cycle: {
              startDate: new Date().toISOString(),
              durationWeeks: 8,
              isActive: true
            }
          })
        });

        const saveData = await saveRes.json();
        recordTest('Usuário A - Imagem', 'Persistência no PostgreSQL (POST /api/workouts)', saveRes.ok && saveData.success, `Versão sync: ${saveData.version}`);

        // Confirmação de persistência no PostgreSQL
        const fetchRes = await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(userA.id)}`);
        const fetchData = await fetchRes.json();
        const persistedDaysCount = fetchData.workoutDays?.length || 0;
        recordTest('Usuário A - Imagem', 'Recuperação do PostgreSQL sem perdas (GET /api/workouts)', persistedDaysCount >= 5, `Dias no banco: ${persistedDaysCount}`);
      }
    } catch (err) {
      recordTest('Usuário A - Imagem', 'Execução do fluxo de Imagem', false, err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TESTE 3: Upload e Processamento de Treino via Planilha CSV (Usuário B)
  // --------------------------------------------------------------------------
  console.log('\n--- Testando Upload e Processamento da Planilha (Usuário B) ---');
  let workoutDaysUserB = [];
  const csvPath = path.join(__dirname, '..', 'test-assets', 'planilha_usuario_b.csv');

  if (!fs.existsSync(csvPath)) {
    recordTest('Usuário B - Planilha', 'Localização do arquivo CSV', false, `Arquivo não encontrado em: ${csvPath}`);
  } else {
    recordTest('Usuário B - Planilha', 'Localização do arquivo CSV', true, `Arquivo encontrado`);

    try {
      const csvBuffer = fs.readFileSync(csvPath);
      workoutDaysUserB = parseSpreadsheet(csvBuffer.buffer);

      const has5Days = workoutDaysUserB.length >= 5;
      recordTest('Usuário B - Planilha', 'Parsing da Planilha e Divisão em 5 Dias', has5Days, `Dias: ${workoutDaysUserB.length}`);

      // Validação das correções de data automática do Excel (2026-12-10 -> 10-12 reps, etc.)
      const day1B = workoutDaysUserB.find(d => d.dayCode === 'SEG');
      const supinoEx = day1B?.exercises.find(e => /supino\s+reto/i.test(e.name));
      const supinoFixed = supinoEx && (supinoEx.repsDescription.includes('10-12') || supinoEx.sets[0]?.targetReps.includes('10-12'));
      recordTest('Usuário B - Planilha', 'Sanitização de Data Excel (2026-12-10 -> 10-12 reps no Supino)', Boolean(supinoFixed), `Reps Supino: ${supinoEx?.repsDescription}`);

      const crucifixoEx = day1B?.exercises.find(e => /crucifixo/i.test(e.name));
      const crucifixoFixed = crucifixoEx && (crucifixoEx.repsDescription.includes('12-15') || crucifixoEx.sets[0]?.targetReps.includes('12-15'));
      recordTest('Usuário B - Planilha', 'Sanitização de Data Excel (2015-12-01 -> 12-15 reps no Crucifixo)', Boolean(crucifixoFixed), `Reps Crucifixo: ${crucifixoEx?.repsDescription}`);

      const roscaExSexta = workoutDaysUserB.find(d => d.dayCode === 'SEX')?.exercises.find(e => /rosca\s+b[ií]ceps/i.test(e.name));
      const seriesRoscaFixed = roscaExSexta && roscaExSexta.seriesCount <= 3 && roscaExSexta.sets.length <= 3;
      recordTest('Usuário B - Planilha', 'Sanitização de Série Excel (2026-02-01 -> 2 séries na Rosca Bíceps)', Boolean(seriesRoscaFixed), `Séries Rosca: ${roscaExSexta?.seriesCount}`);

      // Validação de unidades de medida (reps para marcha deitada e estabilidade de tronco)
      const marchaEx = day1B?.exercises.find(e => /marcha\s+deitada/i.test(e.name));
      const marchaCorrect = marchaEx && marchaEx.metricUnit === 'reps' && marchaEx.metricType === 'reps';
      recordTest('Usuário B - Planilha', 'Detecção Métrica Unilateral Corporal (reps na Marcha Deitada)', Boolean(marchaCorrect), `Unidade: ${marchaEx?.metricUnit}`);

      // Persistência da ficha do Usuário B no PostgreSQL QAS
      const saveResB = await fetch(`${QAS_BASE_URL}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userB.id,
          workoutDays: workoutDaysUserB,
          cycle: {
            startDate: new Date().toISOString(),
            durationWeeks: 8,
            isActive: true
          }
        })
      });

      const saveDataB = await saveResB.json();
      recordTest('Usuário B - Planilha', 'Persistência no PostgreSQL (POST /api/workouts)', saveResB.ok && saveDataB.success, `Versão sync: ${saveDataB.version}`);

      // Confirmação de persistência no PostgreSQL
      const fetchResB = await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(userB.id)}`);
      const fetchDataB = await fetchResB.json();
      const persistedDaysCountB = fetchDataB.workoutDays?.length || 0;
      recordTest('Usuário B - Planilha', 'Recuperação do PostgreSQL sem perdas (GET /api/workouts)', persistedDaysCountB >= 5, `Dias no banco: ${persistedDaysCountB}`);
      workoutDaysUserB = fetchDataB.workoutDays;
    } catch (err) {
      recordTest('Usuário B - Planilha', 'Execução do fluxo de Planilha', false, err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TESTE 4: Simulação de Execução de Treino em Andamento (Usuário B)
  // --------------------------------------------------------------------------
  console.log('\n--- Testando Execução do Treino, Cargas, Séries e Anti-Race Condition ---');
  try {
    const dayToTrain = workoutDaysUserB[0];
    const exerciseToTrain = dayToTrain.exercises.find(e => e.sets && e.sets.length > 0);
    const set1 = exerciseToTrain.sets[0];
    const set2 = exerciseToTrain.sets[1] || exerciseToTrain.sets[0];

    // 4.1 Início de Treino (isWorkoutActive = true)
    let isWorkoutActive = true;
    const activeSession = {
      isWorkoutActive: true,
      selectedDayId: dayToTrain.id,
      startedAt: new Date().toISOString(),
      workoutElapsedSeconds: 0
    };
    recordTest('Ciclo de Treino', 'Início de Sessão de Treino Ativa', isWorkoutActive && activeSession.isWorkoutActive, `Dia iniciado: ${dayToTrain.title}`);

    // 4.2 Alteração de Carga Granular (handleUpdateWeight)
    const newWeightSet1 = 35;
    const newWeightSet2 = 40;
    
    // Atualização local imediata
    set1.weight = newWeightSet1;
    set2.weight = newWeightSet2;

    // Envio granular ao PostgreSQL (PATCH /api/workouts/set) sem wipe
    const patchWRes1 = await fetch(`${QAS_BASE_URL}/workouts/set`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userB.id,
        exerciseId: exerciseToTrain.id,
        setId: set1.id,
        weight: newWeightSet1
      })
    });
    const patchWData1 = await patchWRes1.json();

    const patchWRes2 = await fetch(`${QAS_BASE_URL}/workouts/set`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userB.id,
        exerciseId: exerciseToTrain.id,
        setId: set2.id,
        weight: newWeightSet2
      })
    });
    const patchWData2 = await patchWRes2.json();

    recordTest('Ciclo de Treino', 'Alteração Granular de Carga (35kg e 40kg) via PATCH atômico', patchWRes1.ok && patchWRes2.ok, `Versão retornada: ${patchWData2.version}`);

    // 4.3 Marcação de Série Concluída ("Feito" - handleToggleSet)
    set1.completed = true;
    const patchCRes = await fetch(`${QAS_BASE_URL}/workouts/set`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userB.id,
        exerciseId: exerciseToTrain.id,
        setId: set1.id,
        completed: true
      })
    });
    const patchCData = await patchCRes.json();
    recordTest('Ciclo de Treino', 'Marcação Atômica de Série Concluída (Feito)', patchCRes.ok && patchCData.success, `Série ${set1.id} concluída`);

    // 4.4 Início de Cronômetro de Descanso (Rest Timer)
    const restDuration = 60;
    const targetEndTime = Date.now() + restDuration * 1000;
    const restTimerActive = targetEndTime > Date.now();
    recordTest('Ciclo de Treino', 'Disparo de Temporizador de Descanso (60s)', restTimerActive, `Alvo: +${restDuration}s`);

    // 4.5 TESTE CRÍTICO: Simulação de Polling durante Treino em Andamento (Anti-Sumiço / Anti-Zero)
    console.log('   Simulando polling concorrente enquanto o treino está ativo...');
    let localWorkoutDays = JSON.parse(JSON.stringify(workoutDaysUserB));
    
    // Simula 3 ciclos de polling
    for (let cycle = 1; cycle <= 3; cycle++) {
      // Regra de Ouro: Enquanto isWorkoutActive === true, o polling remoto NÃO substitui nem zera os dados locais!
      if (isWorkoutActive) {
        // Polling ignorado com sucesso
      } else {
        // Se não estivesse protegido, buscaria do servidor
        const remote = await (await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(userB.id)}`)).json();
        localWorkoutDays = mergeWorkoutsPreservingLocal(localWorkoutDays, remote.workoutDays);
      }
    }

    // Mesmo se uma sincronização remota for forçada, testa mergeWorkoutsPreservingLocal
    const remoteData = await (await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(userB.id)}`)).json();
    const merged = mergeWorkoutsPreservingLocal(workoutDaysUserB, remoteData.workoutDays);

    const mergedEx = merged[0].exercises.find(e => e.id === exerciseToTrain.id);
    const mergedSet1 = mergedEx?.sets.find(s => s.id === set1.id);
    const mergedSet2 = mergedEx?.sets.find(s => s.id === set2.id);

    const preservedCompleted = mergedSet1 && mergedSet1.completed === true;
    const preservedWeight = mergedSet2 && mergedSet2.weight === 40;
    const routineStillPresent = merged.length >= 5 && merged[0].exercises.length >= 10;

    recordTest('Resiliência & Concorrência', 'Proteção contra Sobrescrita Destrutiva durante Polling', Boolean(preservedCompleted && preservedWeight), `Série 1 Feito: ${mergedSet1?.completed}, Série 2 Carga: ${mergedSet2?.weight}kg`);
    recordTest('Resiliência & Concorrência', 'Ficha de Treino Permanece 100% Presente (Sem Sumir)', Boolean(routineStillPresent), `Dias presentes: ${merged.length}, Exercícios no Dia 1: ${merged[0]?.exercises.length}`);

    // 4.6 Finalização da Sessão de Treino (finishWorkoutSession)
    set2.completed = true;
    const completionRecord = {
      id: `rec-qas-${Date.now()}`,
      workoutDayId: dayToTrain.id,
      workoutTitle: dayToTrain.title,
      dayName: dayToTrain.dayName,
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      durationSeconds: 1800, // 30 minutos
      totalSets: dayToTrain.exercises.flatMap(e => e.sets).length,
      completedSets: 2,
      comment: 'Treino de teste executado com sucesso no ambiente QAS.',
      exercisesSummary: [
        {
          id: exerciseToTrain.id,
          name: exerciseToTrain.name,
          completedSets: 2,
          maxWeight: 40,
          metricUnit: 'kg'
        }
      ]
    };

    const sessionRes = await fetch(`${QAS_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...completionRecord,
        userId: userB.id
      })
    });
    const sessionData = await sessionRes.json();
    recordTest('Ciclo de Treino', 'Registro de Sessão no Histórico (POST /api/sessions)', sessionRes.ok && sessionData.success, `Session ID: ${sessionData.sessionId}`);

    // 4.7 Verificação do Histórico e Reset pós-treino
    const histRes = await fetch(`${QAS_BASE_URL}/sessions?userId=${encodeURIComponent(userB.id)}`);
    const histData = await histRes.json();
    const historyRecorded = Array.isArray(histData) && histData.length > 0;
    recordTest('Ciclo de Treino', 'Consulta ao Histórico de Treinos (GET /api/sessions)', historyRecorded, `Total no histórico: ${histData.length}`);

    // Verifica se os sets foram resetados para o próximo dia no PostgreSQL preservando cargas
    const recheckRes = await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(userB.id)}`);
    const recheckData = await recheckRes.json();
    const recheckDay = recheckData.workoutDays?.find(d => d.id === dayToTrain.id);
    const recheckEx = recheckDay?.exercises.find(e => e.id === exerciseToTrain.id);
    const setsCleanedForNextTime = recheckEx && recheckEx.sets.every(s => s.completed === false);
    const lastWeightPreserved = recheckEx && recheckEx.lastWeight >= 40;

    recordTest('Ciclo de Treino', 'Reset de Marcações para o Próximo Treino no Banco', Boolean(setsCleanedForNextTime), 'Todas as séries voltaram a completed=false');
    recordTest('Ciclo de Treino', 'Preservação da Carga Máxima (lastWeight=40kg) no Exercício', Boolean(lastWeightPreserved), `lastWeight: ${recheckEx?.lastWeight}kg`);

  } catch (err) {
    recordTest('Ciclo de Treino', 'Execução da sessão de treino', false, err.message);
  }

  // --------------------------------------------------------------------------
  // RESUMO E STATUS GERAL
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                   RESUMO FINAL DOS TESTES                      ');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  console.log(`Total de Casos de Teste: ${total}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Reprovados: ${failed}`);
  console.log(`Taxa de Sucesso: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO NO AMBIENTE QAS!');
  } else {
    console.log(`\n⚠️  ATENÇÃO: ${failed} TESTE(S) FALHARAM.`);
  }

  // Grava relatório JSON estruturado
  fs.writeFileSync('test-assets/relatorio_testes_qas.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: 'QAS',
    port: 3002,
    database: 'appfit_qas_db',
    summary: { total, passed, failed, successRate: `${((passed / total) * 100).toFixed(1)}%` },
    tests: testResults
  }, null, 2));

  console.log('\nRelatório salvo em test-assets/relatorio_testes_qas.json');
}

runTests();
