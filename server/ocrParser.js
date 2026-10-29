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
  if (n.includes('elevação lateral') || n.includes('elevacao lateral') || n.includes('desenvolvimento') || n.includes('ombro')) return 'OMBROS';
  if (n.includes('bíceps') || n.includes('biceps') || n.includes('rosca')) return 'BÍCEPS';
  if (n.includes('tríceps') || n.includes('triceps')) return 'TRÍCEPS';
  if (n.includes('abdominal') || n.includes('prancha') || n.includes('dead bug') || n.includes('pallof') || n.includes('core')) return 'CORE';
  if (n.includes('esteira') || n.includes('bicicleta') || n.includes('caminhada') || n.includes('aeróbico') || n.includes('cardio')) return 'CARDIO';
  return 'GERAL';
}

function buildSets(seriesCount, repsDescription) {
  const count = Math.max(1, isNaN(seriesCount) ? 3 : seriesCount);
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

  let seriesCount = 3;
  let repsDescription = '10-12 reps';
  let restDescription = '60s';

  // Padrões de séries e repetições
  const match = clean.match(/\|\s*(\d+)\s*\|\s*([\d\s\-–a-zA-Z]+)/) ||
                clean.match(/(\d+)\s*[xX]\s*([\d\s\-–a-zA-Z]+)/) ||
                clean.match(/\b(\d+)\s+(\d{1,2}(?:\s*[-–a]\s*\d{1,2})?(?:\s*(?:reps|min|s|km|cada lado|cada perna))?)\s*$/i);

  if (match) {
    seriesCount = parseInt(match[1], 10) || 3;
    repsDescription = match[2].trim();
    if (!/reps|min|s|km|cada/i.test(repsDescription)) {
      repsDescription = `${repsDescription} reps`;
    }
    clean = clean.replace(match[0], '').trim();
  }

  const name = clean.replace(/[\|;—–\-\.\,]+$/, '').replace(/^[\|;—–\-\.\,]+/, '').trim();
  if (name.length < 3) return null;

  return {
    exerciseNumber,
    name,
    seriesCount,
    repsDescription,
    restDescription,
    category: detectCategory(name)
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

      const week = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
      let title = week.defaultTitle;

      if (hasWeek) {
        const cleanDay = line
          .replace(/^[^\w\s]*\s*/, '')
          .replace(/^(?:SEGUNDA|TER[CÇ]A|QUARTA|QUINTA|SEXTA|S[AÁ]BADO|DOMINGO|TREINO\s+[A-Z0-9]|FICHA\s+[A-Z0-9])\s*[-—–:]*\s*/i, '')
          .trim();
        if (cleanDay.length > 2) title = cleanDay;
      } else if (hasCategoryHeader) {
        title = `${week.defaultTitle} — ${line.replace(/^[^\w\s]*\s*/, '').trim()}`;
      }

      currentDay = {
        id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode: week.code,
        dayName: week.name,
        title: title,
        shortLabel: title.slice(0, 10),
        categoryBadge: `${week.name.toUpperCase()} • ${title.toUpperCase()}`,
        subtitle: 'Exercícios importados',
        exercises: [],
        divisionType: 'weekly'
      };
      days.push(currentDay);
      order = 1;
      continue;
    }

    // 2. Se a tabela repetir o cabeçalho (Exercício ... Séries) e o dia atual já tiver exercícios:
    if (/exerc[ií]cio/i.test(line) && /s[ée]ries/i.test(line)) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
        dayIdx++;
        const week = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
        currentDay = {
          id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
          dayCode: week.code,
          dayName: week.name,
          title: week.defaultTitle,
          shortLabel: week.defaultTitle.slice(0, 10),
          categoryBadge: `${week.name.toUpperCase()} • ${week.defaultTitle.toUpperCase()}`,
          subtitle: 'Exercícios importados',
          exercises: [],
          divisionType: 'weekly'
        };
        days.push(currentDay);
        order = 1;
      }
      continue;
    }

    const ex = parseExerciseLine(line);
    if (!ex) continue;

    // 3. Se o exercício é o # 1 e o dia atual já tem 2 ou mais exercícios: transição de dia!
    if (ex.exerciseNumber === 1 && currentDay && currentDay.exercises.length >= 2) {
      currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
      dayIdx++;
      const week = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
      currentDay = {
        id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode: week.code,
        dayName: week.name,
        title: week.defaultTitle,
        shortLabel: week.defaultTitle.slice(0, 10),
        categoryBadge: `${week.name.toUpperCase()} • ${week.defaultTitle.toUpperCase()}`,
        subtitle: 'Exercícios importados',
        exercises: [],
        divisionType: 'weekly'
      };
      days.push(currentDay);
      order = 1;
    }

    if (!currentDay) {
      dayIdx = 0;
      const week = DEFAULT_WEEK_DAYS[0];
      currentDay = {
        id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode: week.code,
        dayName: week.name,
        title: week.defaultTitle,
        shortLabel: week.defaultTitle.slice(0, 10),
        categoryBadge: `${week.name.toUpperCase()} • ${week.defaultTitle.toUpperCase()}`,
        subtitle: 'Exercícios importados',
        exercises: [],
        divisionType: 'weekly'
      };
      days.push(currentDay);
      order = 1;
    }

    currentDay.exercises.push({
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${order}`,
      order: order++,
      name: ex.name,
      category: ex.category,
      seriesCount: ex.seriesCount,
      repsDescription: ex.repsDescription,
      restDescription: ex.restDescription || '60s',
      suggestedRestOptions: [45, 60, 90, 120],
      orientation: 'Executar com postura controlada.',
      sets: buildSets(ex.seriesCount, ex.repsDescription),
      isExpanded: true
    });
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
  }

  return days;
}
