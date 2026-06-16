/* =========================================================
   score.js — 의뢰 분석 & 점수 계산 엔진
   ========================================================= */

/* 의뢰 텍스트에서 위협 키워드를 찾아 분석한다.
   같은 counter는 한 번만(대표 라벨) 묶는다. */
function analyzeCommission(commission) {
  const found = [];
  const seen = new Set();
  for (const key of Object.keys(THREATS)) {
    if (commission.text.includes(key)) {
      const t = THREATS[key];
      if (!seen.has(t.counter)) {
        seen.add(t.counter);
        found.push({ keyword: key, counter: t.counter, label: t.label });
      }
    }
  }
  return found;
}

/* 의뢰 성격에 맞는 추천 강조(focus)를 정한다. */
function recommendedFocus(commission, threats) {
  if (threats.length >= 3) return 'circle';   // 위협이 많으면 마법진 위주
  if (commission.type === 'scroll') return 'spell';
  return 'balanced';
}

/* 핵심 채점 함수. state 전체를 받아 보고서를 반환. */
function scoreCraft(commission, threats, craft) {
  const breakdown = [];
  const tips = [];
  let score = 0;

  const neededCounters = threats.map(t => t.counter);
  const runeSet = new Set(craft.circle.runes);

  /* ---- 최소 요구사항 ---- */
  const reqBase = craft.circle.hasBase;
  const primary = neededCounters[0];
  const reqPrimary = primary ? runeSet.has(primary) : runeSet.size > 0;
  const reqSpell = craft.spell.length >= 2;

  const requirementsMet = reqBase && reqPrimary && reqSpell;
  if (!reqBase) tips.push('마법진에 기반이 되는 원(◯)이 없습니다.');
  if (!reqPrimary) tips.push('핵심 위협을 막을 상극 룬이 빠졌습니다.');
  if (!reqSpell) tips.push('주문이 너무 짧습니다. 최소 대상+행위가 필요합니다.');

  /* ---- 위협 대응 (마법진 룬) ---- */
  let covered = 0;
  for (const t of threats) {
    const byRune = runeSet.has(t.counter);
    const bySpell = craft.spell.some(w => w.tags.includes(t.counter));
    if (byRune) {
      covered++;
      score += 14;
      if (bySpell) score += 4; // 룬+주문 이중 대응
    } else if (bySpell) {
      score += 6;
      tips.push(`'${t.label}'은(는) 주문으로만 다뤘습니다. 룬으로 새기면 더 강력합니다.`);
    } else {
      tips.push(`'${t.label}'에 대한 대응이 없습니다.`);
    }
  }
  breakdown.push({
    label: `위협 대응 (${covered}/${threats.length} 룬으로 봉합)`,
    pts: covered * 14,
  });

  /* ---- 마법진 형식(formula) ---- */
  let formulaPts = 0;
  if (craft.circle.shapes.triangle && runeSet.size > 0) {
    formulaPts += 8; // 증폭
  }
  if (craft.circle.shapes.square && runeSet.size > 0) {
    formulaPts += 6; // 안정
  }
  // 콤보: 연결된 두 룬이 모두 필요한 counter일 때
  let combo = 0;
  for (const [a, b] of craft.circle.links) {
    if (neededCounters.includes(a) && neededCounters.includes(b)) combo++;
  }
  formulaPts += combo * 7;
  score += formulaPts;
  breakdown.push({ label: `마법진 형식 (증폭/안정/콤보 x${combo})`, pts: formulaPts });
  if (!craft.circle.shapes.triangle && runeSet.size > 0)
    tips.push('삼각형(△)으로 룬을 증폭하면 효과가 커집니다.');

  /* ---- 주문 적합도 & 길이 ---- */
  const relevantWords = craft.spell.filter(
    w => w.tags.some(tag => neededCounters.includes(tag))
  ).length;
  let spellPts = relevantWords * 5;
  const needLen = commission.type === 'book' ? 4 : 2;
  if (craft.spell.length >= needLen) spellPts += 6;
  else tips.push(`${commission.type === 'book' ? '마법서' : '스크롤'}에는 ${needLen}단어 이상의 주문이 어울립니다.`);
  // 어조 적합: 자연/짐승엔 부드럽게, 그 외 단호히
  const wantsGentle = neededCounters.some(c => c === 'earth' || c === 'tame');
  const toneOk = craft.spell.some(w =>
    (wantsGentle && w.tags.includes('gentle')) ||
    (!wantsGentle && w.tags.includes('strong'))
  );
  if (toneOk) spellPts += 5;
  score += spellPts;
  breakdown.push({ label: `주문 적합도 (핵심어 ${relevantWords}개)`, pts: spellPts });

  /* ---- 강조 (꾸미기) ---- */
  let emphPts = 0;
  const emphasizedRelevant = [...craft.decorate.emphasized].filter(i => {
    const w = craft.spell[i];
    return w && w.tags.some(tag => neededCounters.includes(tag));
  }).length;
  emphPts += emphasizedRelevant * 4;
  if (craft.decorate.border !== 'none') emphPts += 3;
  if (craft.decorate.glow) emphPts += 3;
  score += emphPts;
  breakdown.push({ label: `강조 & 꾸미기`, pts: emphPts });
  if (emphasizedRelevant === 0 && craft.spell.length > 0)
    tips.push('주문의 핵심 단어를 강조하면 의뢰인이 알아보기 쉽습니다.');

  /* ---- 배치 & 강조 판단 ---- */
  let layoutPts = 0;
  const rec = recommendedFocus(commission, threats);
  if (craft.layout.focus === rec) layoutPts += 8;
  else if (craft.layout.focus === 'balanced') layoutPts += 4;
  else tips.push(`이 의뢰는 '${focusLabel(rec)}' 강조가 더 어울립니다.`);
  score += layoutPts;
  breakdown.push({ label: `배치 판단`, pts: layoutPts });

  /* ---- 정산 ---- */
  score = Math.max(0, Math.round(score));
  const maxScore = estimateMax(commission, threats);
  const ratio = Math.min(1, score / maxScore);
  const stars = requirementsMet ? Math.max(1, Math.round(ratio * 5)) : 0;
  const gold = requirementsMet ? Math.round(commission.reward * (0.5 + 0.5 * ratio)) : 0;

  return { requirementsMet, score, maxScore, ratio, stars, gold, breakdown, tips };
}

function focusLabel(f) {
  return f === 'circle' ? '마법진 위주' : f === 'spell' ? '주문 위주' : '균형';
}

/* 의뢰별 만점 추정(난이도 반영) — 점수 비율 산정용. */
function estimateMax(commission, threats) {
  let m = 0;
  m += threats.length * 18;          // 위협 대응 + 이중
  m += commission.type === 'book' ? 35 : 20; // 형식+주문+강조 여력
  m += 16;                            // 배치/강조 여력
  return m;
}
