import * as XLSX from 'xlsx';
import type { WorkoutDay, Exercise, ExerciseSet, DayCode } from '../types/workout';

export function parseDayCode(header: string): { code: DayCode; name: string; isAlphabetical: boolean } {
  const upper = header.toUpperCase();

  // Check letter division (Treino A, Treino B, Ficha C, etc.)
  const treinoMatch = upper.match(/(?:TREINO|FICHA)\s+([A-Z])/i);
  if (treinoMatch) {
    const letter = treinoMatch[1].toUpperCase();
    return { code: letter, name: `Treino ${letter}`, isAlphabetical: true };
  }
  const singleLetterMatch = upper.match(/^([A-Z])\s*[—–-]/i);
  if (singleLetterMatch) {
    const letter = singleLetterMatch[1].toUpperCase();
    return { code: letter, name: `Treino ${letter}`, isAlphabetical: true };
  }

  // Week days
  if (upper.includes('SEG')) return { code: 'SEG', name: 'Segunda', isAlphabetical: false };
  if (upper.includes('TER')) return { code: 'TER', name: 'Terça', isAlphabetical: false };
  if (upper.includes('QUA')) return { code: 'QUA', name: 'Quarta', isAlphabetical: false };
  if (upper.includes('QUI')) return { code: 'QUI', name: 'Quinta', isAlphabetical: false };
  if (upper.includes('SEX')) return { code: 'SEX', name: 'Sexta', isAlphabetical: false };
  if (upper.includes('SAB') || upper.includes('SÁB')) return { code: 'SAB', name: 'Sábado', isAlphabetical: false };
  if (upper.includes('DOM')) return { code: 'DOM', name: 'Domingo', isAlphabetical: false };

  return { code: 'SEG', name: 'Segunda', isAlphabetical: false };
}

export function convertToAlphabeticalDivision(days: WorkoutDay[]): WorkoutDay[] {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return days.map((day, idx) => {
    const letter = letters[idx % letters.length];
    const cleanTitle = day.title
      .replace(/^(Hoje|Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo|\(|\)|•|—|-|\s)+/i, '')
      .replace(/^Treino\s+[A-Z]\s*[-—–]*\s*/i, '')
      .trim() || `Treino ${letter}`;
    return {
      ...day,
      dayCode: letter,
      dayName: `Treino ${letter}`,
      title: cleanTitle.toLowerCase().startsWith('treino') ? cleanTitle : `Treino ${letter} — ${cleanTitle}`,
      shortLabel: `Treino ${letter}`,
      categoryBadge: `TREINO ${letter}`,
      divisionType: 'alphabetical'
    };
  });
}

export function convertToWeeklyDivision(days: WorkoutDay[]): WorkoutDay[] {
  const weekDays = [
    { code: 'SEG', name: 'Segunda' },
    { code: 'TER', name: 'Terça' },
    { code: 'QUA', name: 'Quarta' },
    { code: 'QUI', name: 'Quinta' },
    { code: 'SEX', name: 'Sexta' },
    { code: 'SAB', name: 'Sábado' },
    { code: 'DOM', name: 'Domingo' }
  ];
  return days.map((day, idx) => {
    const week = weekDays[idx % weekDays.length];
    const cleanTitle = day.title.replace(/^Treino\s+[A-Z]\s*[-—–]*\s*/i, '').trim() || day.title;
    return {
      ...day,
      dayCode: week.code,
      dayName: week.name,
      title: cleanTitle,
      shortLabel: cleanTitle.slice(0, 8),
      categoryBadge: `${week.name.toUpperCase()} • ${cleanTitle.toUpperCase()}`,
      divisionType: 'weekly'
    };
  });
}

function detectCategory(name: string): string {
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
  if (n.includes('abdominal') || n.includes('prancha') || n.includes('dead bug') || n.includes('pallof') || n.includes('core') || n.includes('bracing')) return 'CORE';
  if (n.includes('esteira') || n.includes('bicicleta') || n.includes('caminhada') || n.includes('aeróbico') || n.includes('cardio')) return 'CARDIO';
  if (n.includes('marcha') || n.includes('bird dog') || n.includes('funcional')) return 'FUNCIONAL';
  return 'GERAL';
}

function buildSets(seriesCount: number, repsDescription: string): ExerciseSet[] {
  const count = Math.max(1, isNaN(seriesCount) ? 2 : seriesCount);
  return Array.from({ length: count }, (_, idx) => ({
    id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx + 1}`,
    setNumber: idx + 1,
    targetReps: repsDescription || '10-12 reps',
    weight: 0,
    completed: false
  }));
}

// Parse Excel Workbook or CSV
export function parseSpreadsheet(data: ArrayBuffer): WorkoutDay[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const parsedDays: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;
  let order = 1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (!firstCell) continue;

    // Check if row is a Day / Workout Header (e.g. "SEGUNDA — SUPERIORES A", "TREINO A — PEITO", "FICHA B")
    const isDayHeader = /^(SEGUNDA|TERÇA|TERCA|QUARTA|QUINTA|SEXTA|SÁBADO|SABADO|DOMINGO|TREINO\s+[A-Z]|FICHA\s+[A-Z]|[A-Z]\s*[—–-])/i.test(firstCell);

    if (isDayHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
        parsedDays.push(currentDay);
      }

      const { code, name, isAlphabetical } = parseDayCode(firstCell);
      const splitHeader = firstCell.split(/[—–-]/);
      const title = splitHeader.length > 1 ? splitHeader.slice(1).join(' - ').trim() : firstCell;

      currentDay = {
        id: `day-${code.toLowerCase()}-${Date.now()}`,
        dayCode: code,
        dayName: name,
        title: title || `${name}`,
        shortLabel: isAlphabetical ? `Treino ${code}` : title.slice(0, 8),
        categoryBadge: title.toUpperCase(),
        subtitle: 'Carregando exercícios...',
        exercises: [],
        divisionType: isAlphabetical ? 'alphabetical' : 'weekly'
      };
      order = 1;
      continue;
    }

    // Check if this row is a column title (e.g. "Exercício", "Séries", etc.)
    if (/exerc[ií]cio|s[ée]ries/i.test(firstCell)) {
      continue;
    }

    // Check if we are inside a day
    if (currentDay) {
      const name = firstCell;
      const seriesRaw = row[1] !== undefined ? String(row[1]).trim() : '2';
      const seriesCount = parseInt(seriesRaw, 10) || 2;
      const repsDescription = row[2] !== undefined ? String(row[2]).trim() : '10-12 reps';
      const restDescription = row[3] !== undefined ? String(row[3]).trim() : '60-90 s';
      const orientation = row[4] !== undefined ? String(row[4]).trim() : '';

      const exercise: Exercise = {
        id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order: order++,
        name,
        category: detectCategory(name),
        seriesCount,
        repsDescription,
        restDescription: restDescription || '-',
        suggestedRestOptions: [45, 60, 90, 120],
        orientation: orientation || 'Executar com postura controlada.',
        sets: buildSets(seriesCount, repsDescription),
        isExpanded: true
      };

      currentDay.exercises.push(exercise);
    }
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
    parsedDays.push(currentDay);
  }

  return parsedDays;
}

const DEFAULT_WEEK_DAYS = [
  { code: 'SEG' as DayCode, name: 'Segunda', defaultTitle: 'Inferior A' },
  { code: 'TER' as DayCode, name: 'Terça', defaultTitle: 'Superior A' },
  { code: 'QUA' as DayCode, name: 'Quarta', defaultTitle: 'Condicionamento + Core' },
  { code: 'QUI' as DayCode, name: 'Quinta', defaultTitle: 'Inferior B' },
  { code: 'SEX' as DayCode, name: 'Sexta', defaultTitle: 'Superior B' },
  { code: 'SAB' as DayCode, name: 'Sábado', defaultTitle: 'Cardio Opcional' },
  { code: 'DOM' as DayCode, name: 'Domingo', defaultTitle: 'Descanso' }
];

// Parse free-form or OCR-extracted text
export function parsePlainTextPlan(text: string): WorkoutDay[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsedDays: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;
  let dayIdx = -1;
  let order = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/(?:plano|orienta[çc]|ciclo\s+inicial|objetivo|semanal|preencha)/i.test(line)) {
      continue;
    }

    // 1. Detecta cabeçalhos de treino/dia (semana, letra ou subtítulo de grupamento)
    const hasWeek = /(?:SEGUNDA|TER[CÇ]A|QUARTA|QUINTA|SEXTA|S[AÁ]BADO|DOMINGO|TREINO\s+[A-Z0-9]|FICHA\s+[A-Z0-9])/i.test(line);
    const hasCategoryHeader = /^(?:Quadr[ií]ceps|Peito|Esteira\s*\+|Posterior|Costas|Aproveitar|Superior|Inferior)/i.test(line.replace(/^[^\w\s]*\s*/, ''));

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

      const { code, name, isAlphabetical } = parseDayCode(line);
      const dayCode = isAlphabetical ? code : week.code;
      const dayName = isAlphabetical ? name : week.name;

      currentDay = {
        id: `day-${dayCode.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode,
        dayName,
        title: title || dayName,
        shortLabel: isAlphabetical ? `Treino ${dayCode}` : title.slice(0, 10),
        categoryBadge: `${dayName.toUpperCase()} • ${title.toUpperCase()}`,
        subtitle: 'Exercícios importados',
        exercises: [],
        divisionType: isAlphabetical ? 'alphabetical' : 'weekly'
      };
      parsedDays.push(currentDay);
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
        parsedDays.push(currentDay);
        order = 1;
      }
      continue;
    }

    // Ignora linhas que são cabeçalhos de colunas ou rodapés informativos
    if (/^(exerc[ií]cio|s[ée]ries|repeti|descanso|tempo|carga|ordem|observa|final|cardio|intensidade)/i.test(line)) continue;

    // Extrai informações do exercício
    const parsedEx = parseExerciseDetailsFromLine(line);
    if (!parsedEx) continue;

    // 3. Se o exercício é o # 1 e o dia atual já tem 2 ou mais exercícios: transição de dia!
    if (parsedEx.exerciseNumber === 1 && currentDay && currentDay.exercises.length >= 2) {
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
      parsedDays.push(currentDay);
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
      parsedDays.push(currentDay);
      order = 1;
    }

    currentDay.exercises.push({
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${order}`,
      order: order++,
      name: parsedEx.name,
      category: detectCategory(parsedEx.name),
      seriesCount: parsedEx.seriesCount,
      repsDescription: parsedEx.repsDescription,
      restDescription: parsedEx.restDescription,
      suggestedRestOptions: [45, 60, 90, 120],
      orientation: parsedEx.orientation || 'Movimento e respiração controlados.',
      sets: buildSets(parsedEx.seriesCount, parsedEx.repsDescription),
      isExpanded: true
    });
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
  }

  return parsedDays;
}

// Analisador inteligente de linha de exercício (delimitado ou linguagem natural de OCR)
function parseExerciseDetailsFromLine(line: string): {
  exerciseNumber: number | null;
  name: string;
  seriesCount: number;
  repsDescription: string;
  restDescription: string;
  orientation: string;
} | null {
  if (/^(plano de trein|exerc[ií]cio|s[ée]ries|repeti|descanso|tempo|carga|ordem|observa|final|cardio|intensidade|preencha as colunas)/i.test(line)) {
    return null;
  }

  let clean = line.replace(/^[^\w\s]*\s*/, '').trim();

  // Detecta número inicial do exercício (ex: "1 ", "1. ", "02 - ", "3) ")
  const numMatch = clean.match(/^(\d+)[\.\-\)\s]+\s*/);
  const exerciseNumber = numMatch ? parseInt(numMatch[1], 10) : null;
  if (numMatch) {
    clean = clean.replace(numMatch[0], '').trim();
  }

  if (clean.length < 2) return null;

  // 1. Caso esteja delimitado por tabulação, pipe ou ponto-e-vírgula
  if (clean.includes('\t') || clean.includes('|') || clean.includes(';')) {
    const parts = clean.split(/[\t|;]/).map(p => p.trim()).filter(Boolean);
    const name = parts[0]?.replace(/^[\-–—\|;]+/, '').trim() || '';
    if (name.length < 2) return null;

    let seriesCount = 3;
    let repsDescription = '10-12 reps';
    let restDescription = '60s';
    let orientation = '';

    if (parts.length > 1) {
      seriesCount = parseInt(parts[1], 10) || 3;
    }
    if (parts.length > 2) {
      repsDescription = parts[2];
      if (!/reps|min|s|km|cada/i.test(repsDescription)) {
        repsDescription = `${repsDescription} reps`;
      }
    }
    if (parts.length > 3) {
      restDescription = parts[3];
    }
    if (parts.length > 4) {
      orientation = parts[4];
    }

    return { exerciseNumber, name, seriesCount, repsDescription, restDescription, orientation };
  }

  // 2. Extração para OCR / texto livre
  let restDescription = '60s';
  const restMatch = clean.match(/(?:descanso|intervalo)?\s*(\d{2,3}\s*(?:s|seg|segundos)|1\s*min(?:uto)?)/i);
  if (restMatch) {
    restDescription = restMatch[1].trim();
    clean = clean.replace(restMatch[0], ' ').trim();
  }

  let seriesCount = 3;
  let repsDescription = '10-12 reps';

  // Padrões de séries e repetições:
  const endNumbersMatch = clean.match(/\b(\d+)\s+(\d{1,2}(?:\s*[-–a]\s*\d{1,2})?(?:\s*(?:reps|min|s|km|cada lado|cada perna))?)\s*$/i);
  const xPatternMatch = clean.match(/(\d+)\s*[xX]\s*([\d\s\-–a-zA-ZáéíóúÁÉÍÓÚ]+)/);
  const seriesWordMatch = clean.match(/(\d+)\s*s[ée]ries?\s*(?:de\s*)?([\d\s\-–a-zA-Z]+)?/i);

  if (endNumbersMatch) {
    seriesCount = parseInt(endNumbersMatch[1], 10) || 3;
    repsDescription = endNumbersMatch[2].trim();
    if (!/reps|min|s|km|cada/i.test(repsDescription)) {
      repsDescription = `${repsDescription} reps`;
    }
    clean = clean.replace(endNumbersMatch[0], ' ').trim();
  } else if (xPatternMatch) {
    seriesCount = parseInt(xPatternMatch[1], 10) || 3;
    const rawReps = xPatternMatch[2].trim();
    repsDescription = rawReps.toLowerCase().includes('rep') ? rawReps : `${rawReps} reps`;
    clean = clean.replace(xPatternMatch[0], ' ').trim();
  } else if (seriesWordMatch) {
    seriesCount = parseInt(seriesWordMatch[1], 10) || 3;
    if (seriesWordMatch[2]) {
      const rawReps = seriesWordMatch[2].trim();
      repsDescription = rawReps.toLowerCase().includes('rep') ? rawReps : `${rawReps} reps`;
    }
    clean = clean.replace(seriesWordMatch[0], ' ').trim();
  }

  const name = clean.replace(/[\-–—\|;]+$/, '').replace(/^[\-–—\|;]+/, '').trim();
  if (name.length < 2) return null;

  return {
    exerciseNumber,
    name,
    seriesCount,
    repsDescription,
    restDescription,
    orientation: ''
  };
}

// Export current workouts to Excel spreadsheet
export function exportToExcel(days: WorkoutDay[], userName = 'Luan Azevedo') {
  const rows: (string | number)[][] = [];

  rows.push([`PLANO DE TREINAMENTO — ${userName.toUpperCase()}`]);
  rows.push(['Gerado pelo AppFit - PWA']);
  rows.push([]);

  days.forEach(day => {
    rows.push([`${day.dayName.toUpperCase()} — ${day.title.toUpperCase()}`]);
    rows.push(['Exercício', 'Séries', 'Repetições / duração', 'Descanso', 'Orientações', 'Última Carga (kg)']);
    
    day.exercises.forEach(ex => {
      const lastWeight = ex.sets.find(s => s.weight > 0)?.weight || 0;
      rows.push([
        ex.name,
        ex.seriesCount,
        ex.repsDescription,
        ex.restDescription,
        ex.orientation,
        lastWeight
      ]);
    });
    rows.push([]); // blank line between days
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plano semanal');
  XLSX.writeFile(workbook, `AppFit_Plano_Treino_${userName.replace(/\s+/g, '_')}.xlsx`);
}
