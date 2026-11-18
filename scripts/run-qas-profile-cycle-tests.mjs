/**
 * Bateria de Testes Automatizados - Perfil de Usuário & Duração do Treino (QAS Local)
 * 
 * Valida:
 * 1. Alterações de perfil (Nome, E-mail, Foto base64)
 * 2. Consistência e persistência no PostgreSQL local
 * 3. Validações de segurança (e-mail duplicado, formato inválido)
 * 4. Configuração manual do ciclo de treino via endpoint atômico (/api/workouts/cycle)
 * 5. Garantia de que a duração configurada NÃO é sobrescrita ao salvar novos treinos
 * 6. Detecção inteligente de duração em semanas a partir do OCR ("Ciclo inicial: 8 semanas")
 * 7. Resiliência do cálculo de datas contra strings ISO do banco (sem NaN / Invalid Date)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateCycleFromDates,
  calculateEndDateFromWeeks,
  formatDateBr,
  getDaysRemaining,
  normalizeDateString
} from './dateUtils.mjs';
import { detectWorkoutCycle } from './importUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QAS_BASE_URL = process.env.QAS_URL || 'http://127.0.0.1:3001/api';

console.log('================================================================');
console.log('   BATERIA DE TESTES QAS LOCAL: PERFIL & DURAÇÃO DO TREINO      ');
console.log('================================================================');
console.log(`Endpoint QAS: ${QAS_BASE_URL}\n`);

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
  // TESTE 1: Cálculos de Datas e Sanitização de Formatos ISO do PostgreSQL
  // --------------------------------------------------------------------------
  console.log('--- 1. Testando Sanitização e Cálculo de Datas ---');
  
  const isoPostgresDate = '2026-11-17T00:00:00.000Z';
  const cleanNormalized = normalizeDateString(isoPostgresDate);
  recordTest('Cálculo de Datas', 'Normalização de data ISO do PostgreSQL para YYYY-MM-DD', cleanNormalized === '2026-11-17', `Entrada: ${isoPostgresDate} -> Saída: ${cleanNormalized}`);

  const formattedBr = formatDateBr(isoPostgresDate);
  recordTest('Cálculo de Datas', 'Formatação brasileira DD/MM/AAAA a partir de ISO', formattedBr === '17/11/2026', `Resultado: ${formattedBr}`);

  const endDate8Weeks = calculateEndDateFromWeeks('2026-11-17', 8);
  recordTest('Cálculo de Datas', 'Cálculo de data de término para 8 semanas', endDate8Weeks === '2027-01-12', `Término: ${endDate8Weeks}`);

  const cycleCalc = calculateCycleFromDates(isoPostgresDate, endDate8Weeks);
  const cycleValid = cycleCalc.durationWeeks === 8 && !isNaN(cycleCalc.durationWeeks) && cycleCalc.startDate === '2026-11-17';
  recordTest('Cálculo de Datas', 'Cálculo de ciclo em semanas sem NaN / Invalid Date', cycleValid, `Semanas: ${cycleCalc.durationWeeks}, Meses: ${cycleCalc.durationMonths}`);

  // --------------------------------------------------------------------------
  // TESTE 2: Cadastro de Novo Usuário para Teste de Perfil
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testando Cadastro do Usuário de Teste ---');
  const testUserId = `usr_qas_perfil_${Date.now()}`;
  const initialEmail = `atleta_perfil_${Date.now()}@appfit.test`;
  const initialUser = {
    id: testUserId,
    name: 'Atleta Original',
    email: initialEmail,
    role: 'user'
  };

  try {
    const syncRes = await fetch(`${QAS_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialUser)
    });
    const syncData = await syncRes.json();
    recordTest('Perfil do Usuário', 'Criação do usuário de teste no PostgreSQL', syncRes.ok && syncData.id === testUserId, `ID: ${testUserId}`);
  } catch (err) {
    recordTest('Perfil do Usuário', 'Criação do usuário de teste', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 3: Alteração de Nome
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testando Alteração de Nome ---');
  const updatedName = 'Luan Azevedo (Perfil Atualizado)';
  try {
    const res = await fetch(`${QAS_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, name: updatedName })
    });
    const data = await res.json();
    const namePersisted = res.ok && data.name === updatedName;
    recordTest('Perfil do Usuário', 'Alteração e Persistência do Nome Completo', namePersisted, `Nome retornado: ${data.name}`);
  } catch (err) {
    recordTest('Perfil do Usuário', 'Alteração do Nome Completo', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 4: Alteração de E-mail e Validações de Segurança
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testando Alteração de E-mail ---');
  const updatedEmail = `luan_atualizado_${Date.now()}@appfit.test`;
  try {
    // 4.1 Formato inválido deve ser rejeitado (400)
    const invalidRes = await fetch(`${QAS_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, email: 'email_invalido_sem_arroba' })
    });
    recordTest('Perfil do Usuário', 'Rejeição de formato de e-mail inválido', invalidRes.status === 400, `Status: ${invalidRes.status}`);

    // 4.2 Atualização com e-mail válido
    const emailRes = await fetch(`${QAS_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, email: updatedEmail })
    });
    const emailData = await emailRes.json();
    recordTest('Perfil do Usuário', 'Alteração e Persistência do E-mail', emailRes.ok && emailData.email === updatedEmail, `Novo e-mail: ${emailData.email}`);

    // 4.3 Tentativa de e-mail duplicado de outro usuário existente deve retornar 409
    const secondUserId = `usr_qas_sec_${Date.now()}`;
    await fetch(`${QAS_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: secondUserId, name: 'Segundo Usuário', email: `outro_${Date.now()}@appfit.test` })
    });

    const duplicateRes = await fetch(`${QAS_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: secondUserId, email: updatedEmail })
    });
    recordTest('Perfil do Usuário', 'Bloqueio de E-mail Duplicado (Retorno 409 Conflict)', duplicateRes.status === 409, `Status: ${duplicateRes.status}`);
  } catch (err) {
    recordTest('Perfil do Usuário', 'Testes de E-mail', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 5: Alteração e Persistência da Foto de Perfil (Avatar Base64)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testando Foto de Perfil (Avatar) ---');
  // Cria um base64 válido simulando uma imagem JPEG comprimida
  const samplePhotoBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  try {
    const photoRes = await fetch(`${QAS_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, avatarUrl: samplePhotoBase64 })
    });
    const photoData = await photoRes.json();
    const photoPersisted = photoRes.ok && photoData.avatarUrl === samplePhotoBase64;
    recordTest('Perfil do Usuário', 'Alteração e Persistência da Foto de Perfil', photoPersisted, `Foto gravada: ${(photoData.avatarUrl || '').slice(0, 30)}...`);

    // Consulta de verificação se persiste no banco
    const checkRes = await fetch(`${QAS_BASE_URL}/users/check?userId=${encodeURIComponent(testUserId)}`);
    const checkData = await checkRes.json();
    const checkOk = checkData.exists && checkData.user.name === updatedName && checkData.user.email === updatedEmail && (checkData.user.avatarUrl === samplePhotoBase64 || checkData.user.avatar_url === samplePhotoBase64);
    recordTest('Perfil do Usuário', 'Verificação e Consistência Global do Perfil no PostgreSQL', checkOk, `Nome: ${checkData.user?.name}, E-mail: ${checkData.user?.email}`);
  } catch (err) {
    recordTest('Perfil do Usuário', 'Alteração de Foto de Perfil', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 6: Configuração Manual da Duração do Treino via Endpoint Atômico
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testando Configuração Manual da Duração do Treino ---');
  const customWeeks = 12; // Usuário define 12 semanas manualmente
  const cycleStartDate = '2026-11-17';
  const cycleEndDate = calculateEndDateFromWeeks(cycleStartDate, customWeeks);

  try {
    const cycleRes = await fetch(`${QAS_BASE_URL}/workouts/cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        startDate: cycleStartDate,
        endDate: cycleEndDate,
        durationWeeks: customWeeks,
        durationMonths: 2.8
      })
    });

    const cycleData = await cycleRes.json();
    const cycleSaved = cycleRes.ok && cycleData.success && cycleData.cycle.durationWeeks === 12;
    recordTest('Duração do Treino', 'Configuração Manual do Ciclo via Endpoint Atômico (/api/workouts/cycle)', cycleSaved, `Duração: ${cycleData.cycle?.durationWeeks} semanas, Fim: ${cycleData.cycle?.endDate}`);
  } catch (err) {
    recordTest('Duração do Treino', 'Configuração Manual do Ciclo', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 7: PREMISSA CRÍTICA: Upload de Treino NÃO PODE Sobrescrever a Duração Definida
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testando Preservação da Duração Manual contra Sobrescritas ---');
  try {
    // Simula upload de um novo treino onde o payload envia cycle padrão (ex: 4 semanas ou 8 semanas)
    const newWorkoutDays = [
      {
        id: `day-seg-${Date.now()}`,
        dayCode: 'SEG',
        dayName: 'Segunda',
        title: 'Superiores Teste',
        shortLabel: 'Superiores',
        categoryBadge: 'SUPERIORES',
        subtitle: '1 exercício',
        exercises: [
          {
            id: `ex-supino-${Date.now()}`,
            order: 1,
            name: 'Supino Reto',
            category: 'PEITORAL',
            seriesCount: 3,
            repsDescription: '3x 10',
            restDescription: '60s',
            sets: [
              { id: `s1-${Date.now()}`, setNumber: 1, targetReps: '10', weight: 30, completed: false }
            ]
          }
        ]
      }
    ];

    // O upload de treino passa cycle default (durationWeeks: 4), MAS NÃO passa forceCycleOverride
    const saveWorkoutRes = await fetch(`${QAS_BASE_URL}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        workoutDays: newWorkoutDays,
        cycle: {
          startDate: '2026-11-17',
          endDate: '2026-12-15',
          durationWeeks: 4 // tentativa de sobrescrever com 4 semanas
        }
      })
    });

    const saveWorkoutData = await saveWorkoutRes.json();
    recordTest('Duração do Treino', 'Envio de Nova Ficha de Treino (POST /api/workouts)', saveWorkoutRes.ok && saveWorkoutData.success, `Versão sync: ${saveWorkoutData.version}`);

    // Consulta os treinos no PostgreSQL e verifica se o ciclo de 12 semanas FOI PRESERVADO!
    const fetchWorkoutRes = await fetch(`${QAS_BASE_URL}/workouts?userId=${encodeURIComponent(testUserId)}`);
    const fetchWorkoutData = await fetchWorkoutRes.json();
    const durationPreserved = fetchWorkoutData.cycle && fetchWorkoutData.cycle.durationWeeks === 12;
    recordTest('Duração do Treino', 'PRESERVAÇÃO DA DURAÇÃO: 12 semanas mantidas intactas após upload de treino', Boolean(durationPreserved), `Duração no banco: ${fetchWorkoutData.cycle?.durationWeeks} semanas (esperado: 12 semanas)`);
  } catch (err) {
    recordTest('Duração do Treino', 'Teste de Preservação de Duração', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 8: Detecção Inteligente da Duração em OCR e Planilhas
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Testando Detecção Inteligente da Duração no Upload ---');
  
  // 8.1 Caso da Ficha Real: "Ciclo inicial: 8 semanas"
  const textFichaReal = 'PLANO DE TREINAMENTO — LUAN AZEVEDO\nCiclo inicial: 8 semanas | Objetivos: hipertrofia\nSEGUNDA — SUPERIORES A';
  const detected1 = detectWorkoutCycle(textFichaReal);
  recordTest('Detecção Inteligente', 'Extração de "Ciclo inicial: 8 semanas"', detected1?.durationWeeks === 8, `Detectado: ${detected1?.durationWeeks} semanas (Match: ${detected1?.rawMatch})`);

  // 8.2 Caso OCR com ruído visual do Tesseract: "Cr cia! 8 semanas"
  const textOcrRuidoso = 'Plano semanal\nPLANO DE TREINAMENTO\nCr cia! 8 semanas | Objetivos empgrecimento\nSEGUNDA — SUPERIORES A';
  const detected2 = detectWorkoutCycle(textOcrRuidoso);
  recordTest('Detecção Inteligente', 'Extração sob ruído OCR ("Cr cia! 8 semanas")', detected2?.durationWeeks === 8, `Detectado: ${detected2?.durationWeeks} semanas (Match: ${detected2?.rawMatch})`);

  // 8.3 Caso Planilha: "Duração: 6 semanas"
  const textPlanilha = 'PLANO DE TREINAMENTO\nDuração: 6 semanas\nTREINO A - PEITO';
  const detected3 = detectWorkoutCycle(textPlanilha);
  recordTest('Detecção Inteligente', 'Extração de "Duração: 6 semanas"', detected3?.durationWeeks === 6, `Detectado: ${detected3?.durationWeeks} semanas (Match: ${detected3?.rawMatch})`);

  // 8.4 Caso Meses: "Ciclo: 3 meses"
  const textMeses = 'PLANO ANUAL\nCiclo: 3 meses\nTREINO A';
  const detected4 = detectWorkoutCycle(textMeses);
  recordTest('Detecção Inteligente', 'Conversão de "Ciclo: 3 meses" para semanas (~13 sem)', detected4?.durationWeeks === 13, `Detectado: ${detected4?.durationWeeks} semanas (${detected4?.durationMonths} meses)`);

  // 8.5 Caso Endpoint Real de OCR (/api/ocr/analyze-workout com a foto anexada)
  const imagePath = path.join(__dirname, '..', 'test-assets', 'imagem_usuario_a.jpg');
  if (fs.existsSync(imagePath)) {
    try {
      const imgBuffer = fs.readFileSync(imagePath);
      const ocrRes = await fetch(`${QAS_BASE_URL}/ocr/analyze-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${imgBuffer.toString('base64')}` })
      });
      const ocrData = await ocrRes.json();
      const ocrCycleFound = ocrRes.ok && ocrData.detectedCycle && ocrData.detectedCycle.durationWeeks === 8;
      recordTest('Detecção Inteligente', 'OCR Real da Ficha Anexada detectando 8 semanas via endpoint', Boolean(ocrCycleFound), `Duração detectada no OCR: ${ocrData.detectedCycle?.durationWeeks} semanas`);
    } catch (err) {
      recordTest('Detecção Inteligente', 'OCR Real da Ficha Anexada', false, err.message);
    }
  }

  // --------------------------------------------------------------------------
  // RESUMO DOS TESTES
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('       RESUMO DOS TESTES DE PERFIL E DURAÇÃO (QAS LOCAL)        ');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  console.log(`Total de Casos de Teste: ${total}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Reprovados: ${failed}`);
  console.log(`Taxa de Sucesso: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES DE PERFIL E DURAÇÃO PASSARAM COM SUCESSO!');
  } else {
    console.log(`\n⚠️  ATENÇÃO: ${failed} TESTE(S) FALHARAM.`);
  }

  // Grava relatório JSON
  fs.writeFileSync('test-assets/relatorio_perfil_ciclo_qas.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: 'QAS (Local Windows)',
    port: 3001,
    database: 'appfit_db (Local)',
    summary: { total, passed, failed, successRate: `${((passed / total) * 100).toFixed(1)}%` },
    tests: testResults
  }, null, 2));

  console.log('\nRelatório salvo em test-assets/relatorio_perfil_ciclo_qas.json');
}

runTests();
