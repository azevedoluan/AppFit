// Analisador inteligente de fichas de treino (extrai dias da semana, treinos e exercícios)

export function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('aquec') || n.includes('mobilidade')) return 'AQUECIMENTO';
  if (n.includes('quadríceps') || n.includes('quadriceps') || n.includes('extensora') || n.includes('agachamento') || n.includes('afundo') || n.includes('smith')) return 'QUADRÍCEPS';
  if (n.includes('flexora') || n.includes('stiff')) return 'POSTERIOR COXA';
  if (n.includes('leg press')) return 'COMPOSTO';
  if (n.includes('abdutora') || n.includes('glúteo') || n.includes('gluteo') || n.includes('pélvica') || n.includes('pelvica')) return 'GLÚTEO';
  if (n.includes('panturrilha')) return 'PANTURRILHAS';
  if (n.includes('supino') || n.includes('crucifixo') || n.includes('peitoral')) return 'PEITORAL';
  if (n.includes('remada') || n.includes('puxada') || n.includes('dorsal') || n.includes('face pull')) return 'COSTAS';
  if (n.includes('elevação lateral') || n.includes('elevacao lateral') || n.includes('desenvolvimento') || n.includes('ombro') || n.includes('deltoide')) return 'OMBROS';
  if (n.includes('bíceps') || n.includes('biceps') || n.includes('rosca')) return 'BÍCEPS';
  if (n.includes('tríceps') || n.includes('triceps') || n.includes('testa') || n.includes('francês') || n.includes('frances')) return 'TRÍCEPS';
  if (n.includes('abdominal') || n.includes('prancha') || n.includes('infra') || n.includes('supra') || n.includes('obliquo') || n.includes('core') || n.includes('bracing') || n.includes('estabilidade')) return 'CORE';
  if (n.includes('esteira') || n.includes('bicicleta') || n.includes('bike') || n.includes('cardio') || n.includes('aeróbico') || n.includes('aerobico') || n.includes('corrida') || n.includes('caminhada') || n.includes('elíptico') || n.includes('eliptico') || n.includes('escada') || n.includes('spinning') || n.includes('remo')) return 'CARDIO';
  return 'GERAL';
}

export function detectMetricUnit(name, repsDescription = '', category = '') {
  const n = (name || '').toLowerCase();
  const r = (repsDescription || '').toLowerCase();

  // Cardio / Aquecimento / Aeróbico
  if (
    n.includes('esteira') ||
    n.includes('bicicleta') ||
    n.includes('tiocieta') ||
    n.includes('bike') ||
    n.includes('cardio') ||
    n.includes('aeróbico') ||
    n.includes('aerobico') ||
    n.includes('aerótico') ||
    n.includes('aeróbtico') ||
    n.includes('agrdtico') ||
    n.includes('corrida') ||
    n.includes('caminhada') ||
    n.includes('elíptico') ||
    n.includes('eliptico') ||
    n.includes('escada') ||
    n.includes('spinning') ||
    n.includes('remo') ||
    n.includes('corda') ||
    n.includes('aquec') ||
    n.includes('mobilidade') ||
    n.includes('hiit')
  ) {
    if (r.includes('seg') || /\b\d+\s*s\b/.test(r)) {
      return { metricType: 'time', metricUnit: 's' };
    }
    return { metricType: 'time', metricUnit: 'min' };
  }

  // Core / Isometria / Prancha
  if (
    n.includes('prancha') ||
    n.includes('isometria') ||
    n.includes('isométric') ||
    n.includes('vácuo') ||
    n.includes('vacuo') ||
    n.includes('wall sit') ||
    n.includes('hollow')
  ) {
    if (r.includes('min') || r.includes('minuto')) {
      return { metricType: 'time', metricUnit: 'min' };
    }
    return { metricType: 'time', metricUnit: 's' };
  }

  // Reps text explicitamente expressa tempo
  if (r.includes('minuto') || /\b\d+\s*(?:min|mn|mia)\b/.test(r)) {
    return { metricType: 'time', metricUnit: 'min' };
  }
  if (r.includes('segundo') || /\b\d+\s*s\b/.test(r) || /\b\d+\s*seg\b/.test(r)) {
    return { metricType: 'time', metricUnit: 's' };
  }

  // Apenas repetições ou peso corporal / execuções unilaterais sem carga
  if (
    r.includes('apenas reps') ||
    r.includes('por lado') ||
    r.includes('cada lado') ||
    r.includes('cada perna') ||
    r.includes('cada braço') ||
    n.includes('peso corporal') ||
    n.includes('sem carga') ||
    n.includes('marcha deitada') ||
    n.includes('estabilidade de tronco')
  ) {
    return { metricType: 'reps', metricUnit: 'reps' };
  }

  // Musculação padrão: Quilos (kg)
  return { metricType: 'kg', metricUnit: 'kg' };
}

function buildSets(seriesCount, repsDescription) {
  const count = Math.max(1, isNaN(seriesCount) ? 2 : seriesCount);
  return Array.from({ length: count }, (_, idx) => ({
    id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx + 1}`,
    setNumber: idx + 1,
    targetReps: repsDescription || '10-12 reps',
    weight: 0,
    completed: false
  }));
}

export function parseExerciseLine(line) {
  if (/^(plano|orienta[çc]|ciclo|objetivo|semanal|exerc[ií]cio|s[ée]ries|repeti|descanso|tempo|carga|ordem|observa|final|cardio|intensidade|preencha)/i.test(line)) {
    return null;
  }

  let clean = line.replace(/^[^\w\s]*\s*/, '').trim();

  // Detecta número inicial do exercício (ex: "1 ", "1. ", "02 - ", "3) ")
  const numMatch = clean.match(/^(\d+)[\.\-\)\s]+\s*/);
  const exerciseNumber = numMatch ? parseInt(numMatch[1], 10) : null;
  if (numMatch) {
    clean = clean.replace(numMatch[0], '').trim();
  }

  if (clean.length < 3) return null;

  let seriesCount = 2;
  let repsDescription = '10-12 reps';
  let restDescription = '60-90 s';
  let orientation = '';

  // 1. Padrão Tabular OCR: [Nome] [Séries (1-4)] [Reps] [Descanso] [Orientações...]
  const tabularMatch = clean.match(/^(.+?)\s+(\d{1,2}|r2|12)\s+([\d\s\-–a-zA-Z\u00C0-\u00FF\+xX]+?)\s+((?:\d{2,4}(?:\s*[-–]\s*\d{2,4})?\s*[sS58]?|[-–—]|Conforme\s+exerc[ií]cio))\s*(.*)$/i);
  if (tabularMatch) {
    let rawName = tabularMatch[1].trim();
    let rawSeries = tabularMatch[2].trim().replace(/^r/i, '');
    if (rawSeries === '12' && rawName.toLowerCase().includes('estabilidade')) {
      rawSeries = '2';
    }
    let rawReps = tabularMatch[3].trim().replace(/\bmn\b|\bmia\b/i, 'min');
    let rawRest = tabularMatch[4].trim().replace(/[58]$/, 's');
    if (/^\d{2,4}(?:\s*[-–]\s*\d{2,4})?$/.test(rawRest)) {
      rawRest = `${rawRest} s`;
    }
    orientation = tabularMatch[5]?.trim() || '';

    seriesCount = parseInt(rawSeries, 10) || 2;
    repsDescription = rawReps;
    if (!/reps|min|s|km|cada|lado|perna|conforme/i.test(repsDescription)) {
      repsDescription = `${repsDescription} reps`;
    }
    restDescription = rawRest;
    clean = rawName;
  } else {
    // 2. Padrão cardio sem descanso
    const cardioMatch = clean.match(/^(.+?)\s+(\d{1,2})\s+(\d+[-–\d\s]*(?:min|mn|mia|reps|s)?)\s*(.*)$/i);
    if (cardioMatch) {
      clean = cardioMatch[1].trim();
      seriesCount = parseInt(cardioMatch[2], 10) || 1;
      repsDescription = cardioMatch[3].trim().replace(/\bmn\b|\bmia\b/i, 'min');
      restDescription = '-';
      orientation = cardioMatch[4]?.trim() || '';
    } else {
      // 3. Padrões alternativos de séries e repetições
      const match = clean.match(/\|\s*(\d+)\s*\|\s*([\d\s\-–a-zA-Z]+)/) ||
                    clean.match(/(\d+)\s*[xX]\s*([\d\s\-–a-zA-Z]+)/) ||
                    clean.match(/\b(\d+)\s+(\d{1,2}(?:\s*[-–a]\s*\d{1,2})?(?:\s*(?:reps|min|s|km|cada lado|cada perna))?)\s*$/i);

      if (match) {
        seriesCount = parseInt(match[1], 10) || 2;
        repsDescription = match[2].trim();
        if (!/reps|min|s|km|cada/i.test(repsDescription)) {
          repsDescription = `${repsDescription} reps`;
        }
        clean = clean.replace(match[0], '').trim();
      }
    }
  }

  const name = clean.replace(/[\|;—–\-\.\,]+$/, '').replace(/^[\|;—–\-\.\,]+/, '').trim();
  if (name.length < 3) return null;

  const category = detectCategory(name);
  const { metricType, metricUnit } = detectMetricUnit(name, repsDescription, category);

  return {
    exerciseNumber,
    name,
    seriesCount,
    repsDescription,
    restDescription,
    orientation: orientation || 'Executar com postura controlada.',
    category,
    metricType,
    metricUnit
  };
}

const DEFAULT_WEEK_DAYS = [
  { code: 'SEG', name: 'Segunda', defaultTitle: 'Inferior A' },
  { code: 'TER', name: 'Terça', defaultTitle: 'Superior A' },
  { code: 'QUA', name: 'Quarta', defaultTitle: 'Condicionamento + Core' },
  { code: 'QUI', name: 'Quinta', defaultTitle: 'Inferior B' },
  { code: 'SEX', name: 'Sexta', defaultTitle: 'Superior B' },
  { code: 'SAB', name: 'Sábado', defaultTitle: 'Cardio Opcional' },
  { code: 'DOM', name: 'Domingo', defaultTitle: 'Descanso' }
];

export function parseWorkoutPlanFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const days = [];
  let currentDay = null;
  let dayIdx = -1;
  let order = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/(?:plano|orienta[çc]|ciclo\s+inicial|objetivo|semanal|preencha)/i.test(line)) {
      continue;
    }

    // 1. Detecta cabeçalho de dia (semana ou categoria)
    const hasWeek = /(?:SEGUNDA|TER[CÇ]A|QUARTA|QUINTA|SEXTA|S[AÁ]BADO|DOMINGO|TREINO\s+[A-Z0-9]|FICHA\s+[A-Z0-9])/i.test(line);
    const hasCategoryHeader = /^(Quadr[ií]ceps|Peito|Esteira\s*\+|Posterior|Costas|Aproveitar|Superior|Inferior)/i.test(line.replace(/^[^\w\s]*\s*/, ''));

    // Se ainda não encontrou o primeiro dia e não é cabeçalho de dia, ignora ruído do cabeçalho
    if (!currentDay && !hasWeek && !hasCategoryHeader) {
      continue;
    }

    if (hasWeek || hasCategoryHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
      }

      if (hasWeek) {
        let foundWeekIdx = -1;
        if (/SEGUNDA/i.test(line)) foundWeekIdx = 0;
        else if (/TER[CÇ]A/i.test(line)) foundWeekIdx = 1;
        else if (/QUARTA/i.test(line)) foundWeekIdx = 2;
        else if (/QUINTA/i.test(line)) foundWeekIdx = 3;
        else if (/SEXTA/i.test(line)) foundWeekIdx = 4;
        else if (/S[AÁ]BADO/i.test(line)) foundWeekIdx = 5;
        else if (/DOMINGO/i.test(line)) foundWeekIdx = 6;

        if (foundWeekIdx !== -1) {
          dayIdx = foundWeekIdx;
        } else {
          dayIdx++;
        }
      } else {
        dayIdx++;
      }

      const defaultDay = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
      const splitHeader = line.split(/[—–-]/);
      const title = splitHeader.length > 1 ? splitHeader.slice(1).join(' - ').trim() : line;

      currentDay = {
        id: `day-${defaultDay.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode: defaultDay.code,
        dayName: defaultDay.name,
        title: title || defaultDay.defaultTitle,
        shortLabel: defaultDay.name,
        categoryBadge: title.toUpperCase(),
        subtitle: 'Carregando exercícios...',
        exercises: []
      };

      days.push(currentDay);
      order = 1;
      continue;
    }

    // 2. Extrai exercício para o dia ativo
    if (currentDay) {
      // Se for linha de continuação do nome ou orientação (ex: "allernados)")
      if (/^[a-z0-9\)\.\,\-–\s]{2,20}$/i.test(line) && !/\d+\s*[-–]\s*\d+/.test(line) && currentDay.exercises.length > 0) {
        const lastEx = currentDay.exercises[currentDay.exercises.length - 1];
        if (lastEx.name.endsWith('(') || /\)$/.test(line)) {
          lastEx.name = `${lastEx.name} ${line}`.trim();
        } else {
          lastEx.orientation = `${lastEx.orientation} ${line}`.trim();
        }
        continue;
      }

      const ex = parseExerciseLine(line);
      if (ex) {
        ex.order = order++;
        ex.id = `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${ex.order}`;
        ex.sets = buildSets(ex.seriesCount, ex.repsDescription);
        ex.suggestedRestOptions = [45, 60, 90, 120];
        ex.isOptional = /opcional/i.test(line);
        ex.isExpanded = true;
        currentDay.exercises.push(ex);
      }
    }
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
  }

  return days;
}
