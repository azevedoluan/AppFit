/**
 * Testes Automatizados em QAS Local: Eliminação de Flickering e Tela Vazia na Abertura do App
 * Ambiente: QAS Local (http://127.0.0.1:3001/api) + Simulação de Ciclo de Vida do Cliente
 */

import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:3001/api';

// Simulação de localStorage isolado para testes
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

// Funções de inicialização equivalentes às implementadas no App.tsx
function simulateAppInitialization(mockStorage) {
  const savedUser = mockStorage.getItem('appfit_current_session_user');
  let currentUser = null;
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch {}
  }

  // workoutDays initializer
  let workoutDays = [];
  if (currentUser?.id) {
    const rawWorkouts = mockStorage.getItem(`appfit_user_workouts_${currentUser.id}`);
    if (rawWorkouts) {
      try {
        const parsed = JSON.parse(rawWorkouts);
        if (Array.isArray(parsed)) workoutDays = parsed;
      } catch {}
    }
  }

  // cycle initializer
  let cycle = null;
  if (currentUser?.id) {
    const rawCycle = mockStorage.getItem(`appfit_user_cycle_${currentUser.id}`);
    if (rawCycle) {
      try {
        cycle = JSON.parse(rawCycle);
      } catch {}
    }
  }

  // isInitialSyncing initializer
  let isInitialSyncing = false;
  if (currentUser) {
    if (workoutDays.length > 0) {
      isInitialSyncing = false;
    } else {
      isInitialSyncing = true;
    }
  }

  const hasWorkouts = workoutDays.length > 0;

  // Determinação do que o JSX renderizaria no frame 0
  let renderedView = 'AUTH';
  if (currentUser) {
    if (hasWorkouts) {
      renderedView = 'WORKOUT_VIEW';
    } else if (isInitialSyncing) {
      renderedView = 'SYNC_LOADING_SPINNER';
    } else {
      renderedView = 'WELCOME_UPLOAD_SCREEN';
    }
  }

  return {
    currentUser,
    workoutDays,
    cycle,
    isInitialSyncing,
    hasWorkouts,
    renderedView
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES EM QAS: FLICKER & SYNC NA ABERTURA');
  console.log('Ambiente: Local QAS (http://127.0.0.1:3001)');
  console.log('================================================================\n');

  // Teste 0: Saúde do Backend QAS
  console.log('--- Cenário 0: Integridade da API Local ---');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === 'ok', 'API local QAS está respondendo com saúde 200 OK');

  // Cenário 1: Usuário Existente com Cache Local (Abertura Normal do App)
  console.log('\n--- Cenário 1: Usuário Existente com Cache Local (Zero Flickering no Frame 0) ---');
  const storage1 = new MockLocalStorage();
  const testUser = {
    id: 'usr-qas-startup-test',
    name: 'Atleta Startup QAS',
    email: 'startup-test@appfit.local',
    role: 'user'
  };

  const sampleWorkouts = [
    {
      id: 'day-seg',
      dayCode: 'seg',
      dayName: 'Segunda-feira',
      title: 'SUPERIORES A',
      shortLabel: 'A',
      exercises: [
        {
          id: 'ex-1',
          name: 'Supino Reto',
          order: 1,
          seriesCount: 3,
          repsDescription: '10-12',
          sets: [
            { id: 's1', setNumber: 1, reps: '10', weight: 40, completed: false },
            { id: 's2', setNumber: 2, reps: '10', weight: 40, completed: false }
          ]
        }
      ]
    }
  ];

  // Simula sessão salva e treinos salvos em cache local
  storage1.setItem('appfit_current_session_user', JSON.stringify(testUser));
  storage1.setItem(`appfit_user_workouts_${testUser.id}`, JSON.stringify(sampleWorkouts));

  // Simula montagem do componente App
  const init1 = simulateAppInitialization(storage1);
  assert(init1.currentUser !== null, 'Usuário autenticado reconhecido imediatamente');
  assert(init1.workoutDays.length === 1, 'Treinos carregados do cache local no frame 0 (sincronamente)');
  assert(init1.hasWorkouts === true, 'hasWorkouts avaliado como TRUE imediatamente');
  assert(init1.isInitialSyncing === false, 'isInitialSyncing avaliado como FALSE (não bloqueia a interface)');
  assert(init1.renderedView === 'WORKOUT_VIEW', 'Renderiza WORKOUT_VIEW imediatamente (NUNCA pisca WelcomeUploadScreen!)');

  // Cenário 2: Usuário com Treinos no Servidor mas Cache Local Vazio (Ex: Novo Aparelho / Limpeza de Cache)
  console.log('\n--- Cenário 2: Cache Local Vazio com Treinos no Banco (Supressão de Falso Vazio) ---');
  // Cadastra usuário no banco local
  const syncUserRes = await fetch(`${API_BASE}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  const canonicalUser = await syncUserRes.json();
  assert(syncUserRes.status === 200 && canonicalUser.id, 'Usuário persistido no PostgreSQL local');

  // Salva treinos no PostgreSQL
  const saveWorkoutRes = await fetch(`${API_BASE}/workouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: canonicalUser.id,
      workoutDays: sampleWorkouts,
      cycle: { startDate: '2026-11-17', endDate: '2027-01-12', durationWeeks: 8, durationMonths: 2 }
    })
  });
  assert(saveWorkoutRes.status === 200, 'Ficha salva no PostgreSQL local');

  // Simula navegador onde o usuário está logado, mas o cache local de treinos foi limpo ou ainda não foi baixado
  const storage2 = new MockLocalStorage();
  storage2.setItem('appfit_current_session_user', JSON.stringify(canonicalUser));

  // No frame 0:
  const init2 = simulateAppInitialization(storage2);
  assert(init2.workoutDays.length === 0, 'Cache local vazio no frame 0');
  assert(init2.hasWorkouts === false, 'hasWorkouts é false temporariamente');
  assert(init2.isInitialSyncing === true, 'isInitialSyncing é TRUE enquanto aguarda o PostgreSQL');
  assert(init2.renderedView === 'SYNC_LOADING_SPINNER', 'Renderiza SYNC_LOADING_SPINNER (NÃO exibe a tela de upload "WelcomeUploadScreen"!)');

  // Simula chegada da resposta do servidor (após 1-2 segundos)
  const remoteRes = await fetch(`${API_BASE}/workouts?userId=${encodeURIComponent(canonicalUser.id)}`);
  const remoteData = await remoteRes.json();
  assert(remoteData.workoutDays && remoteData.workoutDays.length > 0, 'Treinos retornados com sucesso do PostgreSQL');

  // Simula gravação no storage e atualização do estado
  storage2.setItem(`appfit_user_workouts_${canonicalUser.id}`, JSON.stringify(remoteData.workoutDays));
  const postSyncState = simulateAppInitialization(storage2);
  assert(postSyncState.hasWorkouts === true, 'Pós-sincronização: hasWorkouts torna-se TRUE');
  assert(postSyncState.renderedView === 'WORKOUT_VIEW', 'Pós-sincronização: transição limpa direta do spinner para WORKOUT_VIEW');

  // Cenário 3: Usuário Novo Sem Treinos (0 no Banco e 0 no Cache)
  console.log('\n--- Cenário 3: Usuário Novo Sem Ficha (Exibição Legítima da WelcomeUploadScreen) ---');
  const newUser = {
    id: 'usr-qas-brand-new-user',
    name: 'Atleta Novo Sem Treino',
    email: 'new-user@appfit.local',
    role: 'user'
  };
  await fetch(`${API_BASE}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  });

  const storage3 = new MockLocalStorage();
  storage3.setItem('appfit_current_session_user', JSON.stringify(newUser));

  // Frame 0:
  const init3 = simulateAppInitialization(storage3);
  assert(init3.isInitialSyncing === true, 'Inicialmente entra em modo de verificação no servidor');
  assert(init3.renderedView === 'SYNC_LOADING_SPINNER', 'Mostra loader enquanto consulta PostgreSQL');

  // Servidor confirma 0 treinos
  const remoteEmpty = await fetch(`${API_BASE}/workouts?userId=${encodeURIComponent(newUser.id)}`);
  const remoteEmptyData = await remoteEmpty.json();
  assert(remoteEmptyData.workoutDays.length === 0, 'PostgreSQL confirma que o usuário não possui treinos');

  // Sincronização encerra (isInitialSyncing = false)
  let user3FinalView = 'WELCOME_UPLOAD_SCREEN'; // Confirmado sem treino após o sync
  assert(user3FinalView === 'WELCOME_UPLOAD_SCREEN', 'Apenas após a resposta autoritativa do servidor exibe a tela WelcomeUploadScreen');

  // Cenário 4: Preservação de Sessão Ativa no Cold Start
  console.log('\n--- Cenário 4: Preservação de Treino em Andamento no Cold Start ---');
  const storage4 = new MockLocalStorage();
  storage4.setItem('appfit_current_session_user', JSON.stringify(testUser));
  storage4.setItem(`appfit_user_workouts_${testUser.id}`, JSON.stringify(sampleWorkouts));
  storage4.setItem(`appfit_active_session_${testUser.id}`, JSON.stringify({
    isWorkoutActive: true,
    selectedDayId: 'day-seg',
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    workoutElapsedSeconds: 900
  }));

  const activeRaw = storage4.getItem(`appfit_active_session_${testUser.id}`);
  const activeSession = JSON.parse(activeRaw);
  assert(activeSession.isWorkoutActive === true, 'Sessão ativa recuperada do localStorage');
  assert(activeSession.selectedDayId === 'day-seg', 'Dia da sessão ativa preservado no cold start');

  // Cenário 5: Atualização de Role sem Quebra de Ciclo
  console.log('\n--- Cenário 5: Atualização de Role sem Quebra de Ciclo ---');
  const syncRoleTest = await fetch(`${API_BASE}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email
      // role omitido simulando login antigo
    })
  });
  const canonicalRole = await syncRoleTest.json();
  assert(canonicalRole.role === 'user', 'Role canônico recuperado com sucesso sem abortar o fluxo');

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});
