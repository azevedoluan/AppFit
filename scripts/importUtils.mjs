// src/utils/importUtils.ts
import * as XLSX from "xlsx";
function parseDayCode(header) {
  const upper = header.toUpperCase();
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
  if (upper.includes("SEG")) return { code: "SEG", name: "Segunda", isAlphabetical: false };
  if (upper.includes("TER")) return { code: "TER", name: "Ter\xE7a", isAlphabetical: false };
  if (upper.includes("QUA")) return { code: "QUA", name: "Quarta", isAlphabetical: false };
  if (upper.includes("QUI")) return { code: "QUI", name: "Quinta", isAlphabetical: false };
  if (upper.includes("SEX")) return { code: "SEX", name: "Sexta", isAlphabetical: false };
  if (upper.includes("SAB") || upper.includes("S\xC1B")) return { code: "SAB", name: "S\xE1bado", isAlphabetical: false };
  if (upper.includes("DOM")) return { code: "DOM", name: "Domingo", isAlphabetical: false };
  return { code: "SEG", name: "Segunda", isAlphabetical: false };
}
function convertToAlphabeticalDivision(days) {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return days.map((day, idx) => {
    const letter = letters[idx % letters.length];
    const cleanTitle = day.title.replace(/^(Hoje|Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo|\(|\)|•|—|-|\s)+/i, "").replace(/^Treino\s+[A-Z]\s*[-—–]*\s*/i, "").trim() || `Treino ${letter}`;
    return {
      ...day,
      dayCode: letter,
      dayName: `Treino ${letter}`,
      title: cleanTitle.toLowerCase().startsWith("treino") ? cleanTitle : `Treino ${letter} \u2014 ${cleanTitle}`,
      shortLabel: `Treino ${letter}`,
      categoryBadge: `TREINO ${letter}`,
      divisionType: "alphabetical"
    };
  });
}
function convertToWeeklyDivision(days) {
  const weekDays = [
    { code: "SEG", name: "Segunda" },
    { code: "TER", name: "Ter\xE7a" },
    { code: "QUA", name: "Quarta" },
    { code: "QUI", name: "Quinta" },
    { code: "SEX", name: "Sexta" },
    { code: "SAB", name: "S\xE1bado" },
    { code: "DOM", name: "Domingo" }
  ];
  return days.map((day, idx) => {
    const week = weekDays[idx % weekDays.length];
    const cleanTitle = day.title.replace(/^Treino\s+[A-Z]\s*[-—–]*\s*/i, "").trim() || day.title;
    return {
      ...day,
      dayCode: week.code,
      dayName: week.name,
      title: cleanTitle,
      shortLabel: cleanTitle.slice(0, 8),
      categoryBadge: `${week.name.toUpperCase()} \u2022 ${cleanTitle.toUpperCase()}`,
      divisionType: "weekly"
    };
  });
}
function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("aquec") || n.includes("mobilidade")) return "AQUECIMENTO";
  if (n.includes("quadr\xEDceps") || n.includes("quadriceps") || n.includes("extensora") || n.includes("agachamento") || n.includes("afundo") || n.includes("smith")) return "QUADR\xCDCEPS";
  if (n.includes("flexora") || n.includes("stiff")) return "POSTERIOR COXA";
  if (n.includes("leg press")) return "COMPOSTO";
  if (n.includes("abdutora") || n.includes("gl\xFAteo") || n.includes("gluteo") || n.includes("p\xE9lvica") || n.includes("pelvica")) return "GL\xDATEO";
  if (n.includes("panturrilha")) return "PANTURRILHAS";
  if (n.includes("supino") || n.includes("crucifixo") || n.includes("peitoral")) return "PEITORAL";
  if (n.includes("remada") || n.includes("puxada") || n.includes("dorsal") || n.includes("face pull")) return "COSTAS";
  if (n.includes("eleva\xE7\xE3o lateral") || n.includes("elevacao lateral") || n.includes("desenvolvimento") || n.includes("ombro")) return "OMBROS";
  if (n.includes("b\xEDceps") || n.includes("biceps") || n.includes("rosca")) return "B\xCDCEPS";
  if (n.includes("tr\xEDceps") || n.includes("triceps")) return "TR\xCDCEPS";
  if (n.includes("abdominal") || n.includes("prancha") || n.includes("dead bug") || n.includes("pallof") || n.includes("core") || n.includes("bracing")) return "CORE";
  if (n.includes("esteira") || n.includes("bicicleta") || n.includes("caminhada") || n.includes("aer\xF3bico") || n.includes("cardio")) return "CARDIO";
  if (n.includes("marcha") || n.includes("bird dog") || n.includes("funcional")) return "FUNCIONAL";
  return "GERAL";
}
function detectMetricUnit(name, repsDescription = "", category = "") {
  const n = `${name} ${category}`.toLowerCase();
  const r = (repsDescription || "").toLowerCase();
  if (n.includes("esteira") || n.includes("bicicleta") || n.includes("bike") || n.includes("cardio") || n.includes("aer\xF3bico") || n.includes("aerobico") || n.includes("corrida") || n.includes("caminhada") || n.includes("el\xEDptico") || n.includes("eliptico") || n.includes("escada") || n.includes("spinning") || n.includes("remo") || n.includes("corda") || n.includes("hiit")) {
    if (r.includes("seg") || /\b\d+\s*s\b/.test(r)) {
      return { metricType: "time", metricUnit: "s" };
    }
    return { metricType: "time", metricUnit: "min" };
  }
  if (n.includes("prancha") || n.includes("isometria") || n.includes("isom\xE9tric") || n.includes("v\xE1cuo") || n.includes("vacuo") || n.includes("wall sit") || n.includes("hollow")) {
    if (r.includes("min") || r.includes("minuto")) {
      return { metricType: "time", metricUnit: "min" };
    }
    return { metricType: "time", metricUnit: "s" };
  }
  if (r.includes("minuto") || /\b\d+\s*min\b/.test(r)) {
    return { metricType: "time", metricUnit: "min" };
  }
  if (r.includes("segundo") || /\b\d+\s*s\b/.test(r) || /\b\d+\s*seg\b/.test(r)) {
    return { metricType: "time", metricUnit: "s" };
  }
  if (r.includes("apenas reps") || r.includes("por lado") || r.includes("cada lado") || r.includes("cada perna") || r.includes("cada bra\xE7o") || n.includes("peso corporal") || n.includes("sem carga") || n.includes("marcha deitada") || n.includes("estabilidade de tronco")) {
    return { metricType: "reps", metricUnit: "reps" };
  }
  return { metricType: "kg", metricUnit: "kg" };
}
function buildSets(seriesCount, repsDescription) {
  const count = Math.max(1, isNaN(seriesCount) ? 2 : seriesCount);
  return Array.from({ length: count }, (_, idx) => ({
    id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx + 1}`,
    setNumber: idx + 1,
    targetReps: repsDescription || "10-12 reps",
    weight: 0,
    completed: false
  }));
}
function sanitizeExcelDateToWorkoutRange(val) {
  if (val === void 0 || val === null || val === "") return "";
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (y === 2015 && m === 12) return "12-15";
    if (d < m) return `${d}-${m}`;
    return `${m}-${d}`;
  }
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    if (y === 15 || y === 2015) return "12-15";
    if (p1 < p2) return `${p1}-${p2}`;
    return `${p2}-${p1}`;
  }
  const num = parseFloat(str);
  if (!isNaN(num) && num > 35e3 && num < 6e4) {
    const utcDays = Math.floor(num - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1e3);
    const y = dateInfo.getUTCFullYear();
    const m = dateInfo.getUTCMonth() + 1;
    const d = dateInfo.getUTCDate();
    if (y === 2015 && m === 12) return "12-15";
    if (d < m) return `${d}-${m}`;
    return `${m}-${d}`;
  }
  return str;
}
function parseSeriesCount(val) {
  const sanitized = sanitizeExcelDateToWorkoutRange(val);
  const matchRange = sanitized.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (matchRange) {
    return parseInt(matchRange[2], 10);
  }
  const count = parseInt(sanitized, 10);
  return isNaN(count) || count < 1 ? 2 : count;
}
function parseSpreadsheet(data) {
  const workbook = XLSX.read(data, { type: "array", raw: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
  const parsedDays = [];
  let currentDay = null;
  let order = 1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const firstCell = String(row[0] || "").trim();
    if (!firstCell) continue;
    const isDayHeader = /^(SEGUNDA|TERÇA|TERCA|QUARTA|QUINTA|SEXTA|SÁBADO|SABADO|DOMINGO|TREINO\s+[A-Z]|FICHA\s+[A-Z]|[A-Z]\s*[—–-])/i.test(firstCell);
    if (isDayHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
        parsedDays.push(currentDay);
      }
      const { code, name, isAlphabetical } = parseDayCode(firstCell);
      const splitHeader = firstCell.split(/[—–-]/);
      const title = splitHeader.length > 1 ? splitHeader.slice(1).join(" - ").trim() : firstCell;
      currentDay = {
        id: `day-${code.toLowerCase()}-${Date.now()}`,
        dayCode: code,
        dayName: name,
        title: title || `${name}`,
        shortLabel: isAlphabetical ? `Treino ${code}` : title.slice(0, 8),
        categoryBadge: title.toUpperCase(),
        subtitle: "Carregando exerc\xEDcios...",
        exercises: [],
        divisionType: isAlphabetical ? "alphabetical" : "weekly"
      };
      order = 1;
      continue;
    }
    if (/exerc[ií]cio|s[ée]ries/i.test(firstCell)) {
      continue;
    }
    if (currentDay) {
      const name = firstCell;
      const seriesRaw = row[1] !== void 0 ? String(row[1]).trim() : "2";
      const seriesCount = parseSeriesCount(seriesRaw);
      const repsDescription = sanitizeExcelDateToWorkoutRange(row[2]) || "10-12 reps";
      const restDescription = row[3] !== void 0 ? String(row[3]).trim() : "60-90 s";
      const orientation = row[4] !== void 0 ? String(row[4]).trim() : "";
      const category = detectCategory(name);
      const { metricType, metricUnit } = detectMetricUnit(name, repsDescription, category);
      const exercise = {
        id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order: order++,
        name,
        category,
        seriesCount,
        repsDescription,
        restDescription: restDescription || "-",
        suggestedRestOptions: [45, 60, 90, 120],
        orientation: orientation || "Executar com postura controlada.",
        sets: buildSets(seriesCount, repsDescription),
        metricType,
        metricUnit,
        isExpanded: true
      };
      currentDay.exercises.push(exercise);
    }
  }
  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
    parsedDays.push(currentDay);
  }
  return parsedDays;
}
var DEFAULT_WEEK_DAYS = [
  { code: "SEG", name: "Segunda", defaultTitle: "Inferior A" },
  { code: "TER", name: "Ter\xE7a", defaultTitle: "Superior A" },
  { code: "QUA", name: "Quarta", defaultTitle: "Condicionamento + Core" },
  { code: "QUI", name: "Quinta", defaultTitle: "Inferior B" },
  { code: "SEX", name: "Sexta", defaultTitle: "Superior B" },
  { code: "SAB", name: "S\xE1bado", defaultTitle: "Cardio Opcional" },
  { code: "DOM", name: "Domingo", defaultTitle: "Descanso" }
];
function parsePlainTextPlan(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const parsedDays = [];
  let currentDay = null;
  let dayIdx = -1;
  let order = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:plano|orienta[çc]|ciclo\s+inicial|objetivo|semanal|preencha)/i.test(line)) {
      continue;
    }
    const hasWeek = /(?:SEGUNDA|TER[CÇ]A|QUARTA|QUINTA|SEXTA|S[AÁ]BADO|DOMINGO|TREINO\s+[A-Z0-9]|FICHA\s+[A-Z0-9])/i.test(line);
    const hasCategoryHeader = /^(?:Quadr[ií]ceps|Peito|Esteira\s*\+|Posterior|Costas|Aproveitar|Superior|Inferior)/i.test(line.replace(/^[^\w\s]*\s*/, ""));
    if (!currentDay && !hasWeek && !hasCategoryHeader) {
      continue;
    }
    if (hasWeek || hasCategoryHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
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
        const cleanDay = line.replace(/^[^\w\s]*\s*/, "").replace(/^(?:SEGUNDA|TER[CÇ]A|QUARTA|QUINTA|SEXTA|S[AÁ]BADO|DOMINGO|TREINO\s+[A-Z0-9]|FICHA\s+[A-Z0-9])\s*[-—–:]*\s*/i, "").trim();
        if (cleanDay.length > 2) title = cleanDay;
      } else if (hasCategoryHeader) {
        title = `${week.defaultTitle} \u2014 ${line.replace(/^[^\w\s]*\s*/, "").trim()}`;
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
        categoryBadge: `${dayName.toUpperCase()} \u2022 ${title.toUpperCase()}`,
        subtitle: "Exerc\xEDcios importados",
        exercises: [],
        divisionType: isAlphabetical ? "alphabetical" : "weekly"
      };
      parsedDays.push(currentDay);
      order = 1;
      continue;
    }
    if (/exerc[ií]cio/i.test(line) && /s[ée]ries/i.test(line)) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
        dayIdx++;
        const week = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
        currentDay = {
          id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
          dayCode: week.code,
          dayName: week.name,
          title: week.defaultTitle,
          shortLabel: week.defaultTitle.slice(0, 10),
          categoryBadge: `${week.name.toUpperCase()} \u2022 ${week.defaultTitle.toUpperCase()}`,
          subtitle: "Exerc\xEDcios importados",
          exercises: [],
          divisionType: "weekly"
        };
        parsedDays.push(currentDay);
        order = 1;
      }
      continue;
    }
    if (/^(exerc[ií]cio|s[ée]ries|repeti|descanso|tempo|carga|ordem|observa|final|cardio|intensidade)/i.test(line)) continue;
    const parsedEx = parseExerciseDetailsFromLine(line);
    if (!parsedEx) continue;
    if (parsedEx.exerciseNumber === 1 && currentDay && currentDay.exercises.length >= 2) {
      currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
      dayIdx++;
      const week = DEFAULT_WEEK_DAYS[dayIdx % DEFAULT_WEEK_DAYS.length];
      currentDay = {
        id: `day-${week.code.toLowerCase()}-${Date.now()}-${dayIdx}`,
        dayCode: week.code,
        dayName: week.name,
        title: week.defaultTitle,
        shortLabel: week.defaultTitle.slice(0, 10),
        categoryBadge: `${week.name.toUpperCase()} \u2022 ${week.defaultTitle.toUpperCase()}`,
        subtitle: "Exerc\xEDcios importados",
        exercises: [],
        divisionType: "weekly"
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
        categoryBadge: `${week.name.toUpperCase()} \u2022 ${week.defaultTitle.toUpperCase()}`,
        subtitle: "Exerc\xEDcios importados",
        exercises: [],
        divisionType: "weekly"
      };
      parsedDays.push(currentDay);
      order = 1;
    }
    const category = detectCategory(parsedEx.name);
    const { metricType, metricUnit } = detectMetricUnit(parsedEx.name, parsedEx.repsDescription, category);
    currentDay.exercises.push({
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${order}`,
      order: order++,
      name: parsedEx.name,
      category,
      seriesCount: parsedEx.seriesCount,
      repsDescription: parsedEx.repsDescription,
      restDescription: parsedEx.restDescription,
      suggestedRestOptions: [45, 60, 90, 120],
      orientation: parsedEx.orientation || "Movimento e respira\xE7\xE3o controlados.",
      sets: buildSets(parsedEx.seriesCount, parsedEx.repsDescription),
      metricType,
      metricUnit,
      isExpanded: true
    });
  }
  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exerc\xEDcios planejados`;
  }
  return parsedDays;
}
function parseExerciseDetailsFromLine(line) {
  if (/^(plano de trein|exerc[ií]cio|s[ée]ries|repeti|descanso|tempo|carga|ordem|observa|final|cardio|intensidade|preencha as colunas)/i.test(line)) {
    return null;
  }
  let clean = line.replace(/^[^\w\s]*\s*/, "").trim();
  const numMatch = clean.match(/^(\d+)[\.\-\)\s]+\s*/);
  const exerciseNumber = numMatch ? parseInt(numMatch[1], 10) : null;
  if (numMatch) {
    clean = clean.replace(numMatch[0], "").trim();
  }
  if (clean.length < 2) return null;
  if (clean.includes("	") || clean.includes("|") || clean.includes(";")) {
    const parts = clean.split(/[\t|;]/).map((p) => p.trim()).filter(Boolean);
    const name2 = parts[0]?.replace(/^[\-–—\|;]+/, "").trim() || "";
    if (name2.length < 2) return null;
    let seriesCount2 = 3;
    let repsDescription2 = "10-12 reps";
    let restDescription2 = "60s";
    let orientation2 = "";
    if (parts.length > 1) {
      seriesCount2 = parseInt(parts[1], 10) || 3;
    }
    if (parts.length > 2) {
      repsDescription2 = parts[2];
      if (!/reps|min|s|km|cada/i.test(repsDescription2)) {
        repsDescription2 = `${repsDescription2} reps`;
      }
    }
    if (parts.length > 3) {
      restDescription2 = parts[3];
    }
    if (parts.length > 4) {
      orientation2 = parts[4];
    }
    return { exerciseNumber, name: name2, seriesCount: seriesCount2, repsDescription: repsDescription2, restDescription: restDescription2, orientation: orientation2 };
  }
  let restDescription = "60-90 s";
  let seriesCount = 2;
  let repsDescription = "10-12 reps";
  let orientation = "";
  const tabularMatch = clean.match(/^(.+?)\s+(\d{1,2}|r2|12)\s+([\d\s\-–a-zA-Z\u00C0-\u00FF\+xX]+?)\s+((?:\d{2,4}(?:\s*[-–]\s*\d{2,4})?\s*[sS58]?|[-–—]|Conforme\s+exerc[ií]cio))\s*(.*)$/i);
  if (tabularMatch) {
    let rawName = tabularMatch[1].trim();
    let rawSeries = tabularMatch[2].trim().replace(/^r/i, "");
    if (rawSeries === "12" && rawName.toLowerCase().includes("estabilidade")) {
      rawSeries = "2";
    }
    let rawReps = tabularMatch[3].trim().replace(/\bmn\b|\bmia\b/i, "min");
    let rawRest = tabularMatch[4].trim().replace(/[58]$/, "s");
    if (/^\d{2,4}(?:\s*[-–]\s*\d{2,4})?$/.test(rawRest)) {
      rawRest = `${rawRest} s`;
    }
    orientation = tabularMatch[5]?.trim() || "";
    seriesCount = parseInt(rawSeries, 10) || 2;
    repsDescription = rawReps;
    if (!/reps|min|s|km|cada|lado|perna|conforme/i.test(repsDescription)) {
      repsDescription = `${repsDescription} reps`;
    }
    restDescription = rawRest;
    clean = rawName;
    const name2 = clean.replace(/[\-–—\|;]+$/, "").replace(/^[\-–—\|;]+/, "").trim();
    if (name2.length < 2) return null;
    return {
      exerciseNumber,
      name: name2,
      seriesCount,
      repsDescription,
      restDescription,
      orientation: orientation || "Executar com postura controlada."
    };
  }
  const restMatch = clean.match(/(?:descanso|intervalo)?\s*(\d{2,3}\s*(?:s|seg|segundos)|1\s*min(?:uto)?)/i);
  if (restMatch) {
    restDescription = restMatch[1].trim();
    clean = clean.replace(restMatch[0], " ").trim();
  }
  const endNumbersMatch = clean.match(/\b(\d+)\s+(\d{1,2}(?:\s*[-–a]\s*\d{1,2})?(?:\s*(?:reps|min|s|km|cada lado|cada perna))?)\s*$/i);
  const xPatternMatch = clean.match(/(\d+)\s*[xX]\s*([\d\s\-–a-zA-ZáéíóúÁÉÍÓÚ]+)/);
  const seriesWordMatch = clean.match(/(\d+)\s*s[ée]ries?\s*(?:de\s*)?([\d\s\-–a-zA-Z]+)?/i);
  if (endNumbersMatch) {
    seriesCount = parseInt(endNumbersMatch[1], 10) || 3;
    repsDescription = endNumbersMatch[2].trim();
    if (!/reps|min|s|km|cada/i.test(repsDescription)) {
      repsDescription = `${repsDescription} reps`;
    }
    clean = clean.replace(endNumbersMatch[0], " ").trim();
  } else if (xPatternMatch) {
    seriesCount = parseInt(xPatternMatch[1], 10) || 3;
    const rawReps = xPatternMatch[2].trim();
    repsDescription = rawReps.toLowerCase().includes("rep") ? rawReps : `${rawReps} reps`;
    clean = clean.replace(xPatternMatch[0], " ").trim();
  } else if (seriesWordMatch) {
    seriesCount = parseInt(seriesWordMatch[1], 10) || 3;
    if (seriesWordMatch[2]) {
      const rawReps = seriesWordMatch[2].trim();
      repsDescription = rawReps.toLowerCase().includes("rep") ? rawReps : `${rawReps} reps`;
    }
    clean = clean.replace(seriesWordMatch[0], " ").trim();
  }
  const name = clean.replace(/[\-–—\|;]+$/, "").replace(/^[\-–—\|;]+/, "").trim();
  if (name.length < 2) return null;
  return {
    exerciseNumber,
    name,
    seriesCount,
    repsDescription,
    restDescription,
    orientation: ""
  };
}
function exportToExcel(days, userName = "Luan Azevedo") {
  const rows = [];
  rows.push([`PLANO DE TREINAMENTO \u2014 ${userName.toUpperCase()}`]);
  rows.push(["Gerado pelo AppFit - PWA"]);
  rows.push([]);
  days.forEach((day) => {
    rows.push([`${day.dayName.toUpperCase()} \u2014 ${day.title.toUpperCase()}`]);
    rows.push(["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es / dura\xE7\xE3o", "Descanso", "Orienta\xE7\xF5es", "\xDAltima Carga / Tempo"]);
    day.exercises.forEach((ex) => {
      const lastWeight = ex.sets.find((s) => s.weight > 0)?.weight || 0;
      const unit = ex.metricUnit || (ex.metricType === "time" ? "min" : "kg");
      rows.push([
        ex.name,
        ex.seriesCount,
        ex.repsDescription,
        ex.restDescription,
        ex.orientation,
        lastWeight > 0 ? `${lastWeight} ${unit}` : "-"
      ]);
    });
    rows.push([]);
  });
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plano semanal");
  XLSX.writeFile(workbook, `AppFit_Plano_Treino_${userName.replace(/\s+/g, "_")}.xlsx`);
}
function downloadTemplateSpreadsheet() {
  const rows = [
    ["PLANO DE TREINO \u2014 MODELO APPFIT"],
    ["Instru\xE7\xF5es: Mantenha a linha do dia (SEGUNDA, TER\xC7A, etc.) e as colunas abaixo"],
    [],
    ["SEGUNDA \u2014 SUPERIORES A (PEITO, OMBRO E TR\xCDCEPS)"],
    ["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es", "Descanso", "Orienta\xE7\xF5es"],
    ["Supino Reto com Halteres", 3, "10-12 reps", "60-90 s", "Esc\xE1pulas retra\xEDdas e controladas"],
    ["Crucifixo Inclinado", 3, "12-15 reps", "60 s", "Foco no alongamento do peitoral"],
    ["Desenvolvimento com Halteres", 3, "10-12 reps", "60 s", "Subir at\xE9 quase estender os cotovelos"],
    ["Eleva\xE7\xE3o Lateral com Halteres", 3, "12-15 reps", "45 s", "Cotovelos levemente flexionados"],
    ["Tr\xEDceps Corda na Polia", 3, "12-15 reps", "45 s", "Abrir a corda no final do movimento"],
    ["Tr\xEDceps Testa com Barra", 3, "10-12 reps", "60 s", "Manter os bra\xE7os alinhados"],
    [],
    ["TER\xC7A \u2014 INFERIORES A (QUADR\xCDCEPS E GL\xDATEOS)"],
    ["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es", "Descanso", "Orienta\xE7\xF5es"],
    ["Agachamento Livre ou no Smith", 3, "8-10 reps", "90-120 s", "Descer at\xE9 90 graus com tronco firme"],
    ["Leg Press 45\xB0", 3, "10-12 reps", "90 s", "P\xE9s alinhados na largura dos ombros"],
    ["Cadeira Extensora", 3, "12-15 reps", "60 s", "Segurar 1 segundo no pico de contra\xE7\xE3o"],
    ["Afundo com Halteres", 3, "10 reps cada perna", "60 s", "Passo firme e tronco ereto"],
    ["Eleva\xE7\xE3o P\xE9lvica com Barra", 3, "10-12 reps", "60 s", "Contra\xE7\xE3o volunt\xE1ria m\xE1xima no topo"],
    ["Panturrilha em P\xE9", 4, "15-20 reps", "45 s", "Alongar bem na descida"],
    [],
    ["QUARTA \u2014 SUPERIORES B (COSTAS E B\xCDCEPS)"],
    ["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es", "Descanso", "Orienta\xE7\xF5es"],
    ["Puxada Alta Frontal na Polia", 3, "10-12 reps", "60-90 s", "Puxar at\xE9 o topo do peitoral"],
    ["Remada Baixa no Tri\xE2ngulo", 3, "10-12 reps", "60 s", "Apertar as esc\xE1pulas no final"],
    ["Remada Curvada com Barra", 3, "8-10 reps", "90 s", "Coluna alinhada em 45 graus"],
    ["Crucifixo Invertido na M\xE1quina", 3, "12-15 reps", "45 s", "Foco na parte posterior do ombro"],
    ["Rosca Direta com Barra W", 3, "10-12 reps", "60 s", "Sem balan\xE7o do corpo"],
    ["Rosca Martelo com Halteres", 3, "10-12 reps", "45 s", "Pegada neutra constante"],
    [],
    ["QUINTA \u2014 INFERIORES B (POSTERIOR DE COXA E GL\xDATEOS)"],
    ["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es", "Descanso", "Orienta\xE7\xF5es"],
    ["Stiff com Barra ou Halteres", 3, "10-12 reps", "90 s", "Coluna ereta e joelhos semiflexionados"],
    ["Mesa Flexora", 3, "10-12 reps", "60 s", "Controle na fase exc\xEAntrica"],
    ["Cadeira Flexora", 3, "12-15 reps", "60 s", "Movimento cont\xEDnuo e cadenciado"],
    ["Cadeira Abdutora", 3, "15-20 reps", "45 s", "Abertura m\xE1xima com tronco inclinado"],
    ["Panturrilha Sentado", 4, "15-20 reps", "45 s", "Pausa de 1 segundo embaixo e em cima"],
    [],
    ["SEXTA \u2014 SUPERIORES C (OMBROS, CORE E BRA\xC7OS)"],
    ["Exerc\xEDcio", "S\xE9ries", "Repeti\xE7\xF5es", "Descanso", "Orienta\xE7\xF5es"],
    ["Desenvolvimento Militar", 3, "8-10 reps", "90 s", "Tronco firme e sem arquear a lombar"],
    ["Eleva\xE7\xE3o Lateral na Polia", 3, "12-15 reps", "45 s", "Tens\xE3o cont\xEDnua do cabo"],
    ["Face Pull na Polia Alta", 3, "12-15 reps", "45 s", "Foco em trap\xE9zio e deltoide posterior"],
    ["Rosca Scott na M\xE1quina", 3, "10-12 reps", "60 s", "Sem tirar o bra\xE7o do apoio"],
    ["Tr\xEDceps Franc\xEAs com Halter", 3, "10-12 reps", "60 s", "Cotovelos fechados"],
    ["Prancha Abdominal", 3, "45-60 s", "45 s", "Ativa\xE7\xE3o m\xE1xima do core"]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 38 },
    // Exercício / Dia
    { wch: 10 },
    // Séries
    { wch: 22 },
    // Repetições
    { wch: 14 },
    // Descanso
    { wch: 45 }
    // Orientações
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo AppFit");
  XLSX.writeFile(workbook, "AppFit_Modelo_Planilha_Treino.xlsx");
}
export {
  convertToAlphabeticalDivision,
  convertToWeeklyDivision,
  detectMetricUnit,
  downloadTemplateSpreadsheet,
  exportToExcel,
  parseDayCode,
  parsePlainTextPlan,
  parseSeriesCount,
  parseSpreadsheet,
  sanitizeExcelDateToWorkoutRange
};
