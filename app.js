/* =========================================================
   app.js — 상태, 렌더링, 상호작용
   ========================================================= */

const RING = 8;            // 마법진 외곽 노드 수
const CENTER = { x: 150, y: 150 };
const RADIUS = 95;

/* ---------------- 상태 ---------------- */
const state = {
  commission: null,
  threats: [],
  analyzed: false,
  selectedRune: null,
  linkMode: false,
  linkFirst: null,
  commissionIndex: 0,
  craft: null,
};

function freshCraft() {
  return {
    circle: {
      hasBase: false,
      nodes: new Array(RING + 1).fill(null), // [0]=중심, 1..RING=고리
      shapes: { triangle: false, square: false },
      links: [], // [i, j] 노드 인덱스 쌍
    },
    spell: [],   // {w, tags, emph}
    decorate: {
      border: 'none', circleWidth: 2, circleColor: '#caa64a',
      circleFill: '#2a1f4a', glow: false, emphStyle: 'bold',
    },
    layout: { template: 'circleTop', focus: 'circle' },
  };
}

/* 노드 인덱스 → 좌표 */
function nodePos(i) {
  if (i === 0) return { ...CENTER };
  const a = (Math.PI * 2 * (i - 1)) / RING - Math.PI / 2;
  return { x: CENTER.x + RADIUS * Math.cos(a), y: CENTER.y + RADIUS * Math.sin(a) };
}

/* ---------------- 초기화 ---------------- */
function init() {
  loadCommission(0);
  buildShapePalette();
  buildRunePalette();
  buildWordBank();
  wireTabs();
  wireControls();
  render();
}

function loadCommission(idx) {
  state.commissionIndex = idx % COMMISSIONS.length;
  state.commission = COMMISSIONS[state.commissionIndex];
  state.threats = [];
  state.analyzed = false;
  state.craft = freshCraft();
  state.selectedRune = null;
  state.linkMode = false;
  state.linkFirst = null;

  // 의뢰 카드 표시
  el('commissionType').textContent = state.commission.type === 'book' ? '마법서' : '스크롤';
  el('commissionType').className = 'badge ' + state.commission.type;
  el('commissionFrom').textContent = state.commission.from + ' · 보수 ' + state.commission.reward + '💰';
  el('commissionText').textContent = state.commission.text;
  el('analysisResult').classList.add('hidden');
  el('analysisResult').innerHTML = '';
  el('scoreReport').classList.add('hidden');
  // 컨트롤 초기화
  el('borderStyle').value = 'none';
  el('circleWidth').value = 2;
  el('circleColor').value = '#caa64a';
  el('circleFill').value = '#2a1f4a';
  el('circleGlow').checked = false;
  el('layoutTemplate').value = 'circleTop';
  document.querySelector('input[name="focus"][value="circle"]').checked = true;
  document.querySelector('input[name="emph"][value="bold"]').checked = true;
}

/* ---------------- 팔레트 ---------------- */
function buildShapePalette() {
  const box = el('shapePalette');
  box.innerHTML = '';
  SHAPES.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip shape';
    chip.title = s.desc;
    chip.innerHTML = `<span class="g">${s.glyph}</span>${s.name}`;
    chip.onclick = () => toggleShape(s.id);
    chip.dataset.shape = s.id;
    box.appendChild(chip);
  });
}

function toggleShape(id) {
  const c = state.craft.circle;
  if (id === 'circle') c.hasBase = !c.hasBase;
  else c.shapes[id] = !c.shapes[id];
  render();
}

function buildRunePalette() {
  const box = el('runePalette');
  box.innerHTML = '';
  RUNES.forEach(r => {
    const chip = document.createElement('button');
    chip.className = 'chip rune';
    chip.dataset.rune = r.id;
    chip.innerHTML = `<span class="g">${r.glyph}</span>${r.name}`;
    chip.onclick = () => {
      state.selectedRune = state.selectedRune === r.id ? null : r.id;
      render();
    };
    box.appendChild(chip);
  });
}

/* ---------------- 단어 은행 / 주문 ---------------- */
function buildWordBank() {
  const box = el('wordBank');
  box.innerHTML = '';
  Object.entries(WORD_BANK).forEach(([cat, words]) => {
    const group = document.createElement('div');
    group.className = 'word-group';
    group.innerHTML = `<h4>${cat}</h4>`;
    const chips = document.createElement('div');
    chips.className = 'chips';
    words.forEach(word => {
      const chip = document.createElement('button');
      chip.className = 'chip word';
      chip.textContent = word.w;
      chip.onclick = () => addWord(word);
      chips.appendChild(chip);
    });
    group.appendChild(chips);
    box.appendChild(group);
  });
}

function addWord(word) {
  state.craft.spell.push({ w: word.w, tags: [...word.tags], emph: false });
  render();
}

/* ---------------- 탭 ---------------- */
function wireTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.panel[data-panel="${tab.dataset.stage}"]`).classList.add('active');
    };
  });
}

/* ---------------- 컨트롤 와이어링 ---------------- */
function wireControls() {
  el('newCommissionBtn').onclick = () => loadAndRender(state.commissionIndex + 1);
  el('analyzeBtn').onclick = analyze;
  el('clearCircleBtn').onclick = () => { state.craft.circle = freshCraft().circle; render(); };
  el('linkModeBtn').onclick = () => {
    state.linkMode = !state.linkMode; state.linkFirst = null; render();
  };
  el('clearSpellBtn').onclick = () => { state.craft.spell = []; render(); };

  el('borderStyle').onchange = e => { state.craft.decorate.border = e.target.value; render(); };
  el('circleWidth').oninput = e => { state.craft.decorate.circleWidth = +e.target.value; render(); };
  el('circleColor').oninput = e => { state.craft.decorate.circleColor = e.target.value; render(); };
  el('circleFill').oninput = e => { state.craft.decorate.circleFill = e.target.value; render(); };
  el('circleGlow').onchange = e => { state.craft.decorate.glow = e.target.checked; render(); };
  document.querySelectorAll('input[name="emph"]').forEach(r => {
    r.onchange = e => { state.craft.decorate.emphStyle = e.target.value; render(); };
  });
  el('layoutTemplate').onchange = e => { state.craft.layout.template = e.target.value; render(); };
  document.querySelectorAll('input[name="focus"]').forEach(r => {
    r.onchange = e => { state.craft.layout.focus = e.target.value; render(); };
  });
  el('deliverBtn').onclick = deliver;
}

function loadAndRender(idx) { loadCommission(idx); render(); }

function analyze() {
  state.threats = analyzeCommission(state.commission);
  state.analyzed = true;
  const box = el('analysisResult');
  box.classList.remove('hidden');
  const rec = recommendedFocus(state.commission, state.threats);
  const chips = state.threats.map(t => {
    const rune = RUNES.find(r => r.counter === t.counter);
    return `<span class="threat-chip">⚠ ${t.label} → 상극: <b>${rune.glyph} ${rune.name}</b></span>`;
  }).join('');
  box.innerHTML = `
    <p><b>발견된 위협 ${state.threats.length}건.</b> 각 위협의 상극 룬으로 마법진을 구성하세요.</p>
    <div class="threat-list">${chips}</div>
    <p class="tiny">추천 강조: <b>${focusLabel(rec)}</b> · 주문에서도 표적을 함께 다루면 효과가 배가됩니다.</p>`;
}

/* ---------------- 마법진 SVG ---------------- */
function circleSvgMarkup(scale) {
  const c = state.craft.circle;
  const d = state.craft.decorate;
  const glow = d.glow ? `filter="url(#glow)"` : '';
  let inner = `
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

  if (c.hasBase) {
    inner += `<circle cx="150" cy="150" r="120" fill="${d.circleFill}"
      stroke="${d.circleColor}" stroke-width="${d.circleWidth}" ${glow}/>`;
    inner += `<circle cx="150" cy="150" r="${RADIUS + 18}" fill="none"
      stroke="${d.circleColor}" stroke-width="${Math.max(1, d.circleWidth - 1)}" opacity="0.6"/>`;
  } else {
    inner += `<circle cx="150" cy="150" r="120" fill="#181226" stroke="#3a2f55"
      stroke-width="1" stroke-dasharray="4 5"/>`;
  }

  // 삼각형(증폭)
  if (c.shapes.triangle) {
    const pts = [0, 1, 2].map(k => {
      const a = (Math.PI * 2 * k) / 3 - Math.PI / 2;
      return `${150 + 110 * Math.cos(a)},${150 + 110 * Math.sin(a)}`;
    }).join(' ');
    inner += `<polygon points="${pts}" fill="none" stroke="${d.circleColor}"
      stroke-width="${d.circleWidth}" opacity="0.8" ${glow}/>`;
  }
  // 사각형(안정)
  if (c.shapes.square) {
    const r = 84;
    inner += `<rect x="${150 - r}" y="${150 - r}" width="${r * 2}" height="${r * 2}"
      fill="none" stroke="${d.circleColor}" stroke-width="${d.circleWidth}"
      opacity="0.7" transform="rotate(45 150 150)" ${glow}/>`;
  }

  // 연결선
  c.links.forEach(([i, j]) => {
    const a = nodePos(i), b = nodePos(j);
    inner += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
      stroke="#e8c75a" stroke-width="1.5" opacity="0.85"/>`;
  });

  // 노드
  for (let i = 0; i <= RING; i++) {
    const p = nodePos(i);
    const rune = c.nodes[i];
    const isLinkFirst = state.linkFirst === i;
    if (rune) {
      const rdef = RUNES.find(r => r.id === rune);
      inner += `<g class="node filled" data-node="${i}">
        <circle cx="${p.x}" cy="${p.y}" r="15"
          fill="#120d20" stroke="${isLinkFirst ? '#fff' : '#e8c75a'}" stroke-width="2"/>
        <text x="${p.x}" y="${p.y + 6}" text-anchor="middle"
          font-size="17" fill="#f0d878">${rdef.glyph}</text></g>`;
    } else {
      inner += `<g class="node empty" data-node="${i}">
        <circle cx="${p.x}" cy="${p.y}" r="13" fill="rgba(255,255,255,0.03)"
          stroke="#4a3f6a" stroke-width="1" stroke-dasharray="3 3"/></g>`;
    }
  }
  return `<svg viewBox="0 0 300 300" ${scale ? `width="${scale}" height="${scale}"` : ''}>${inner}</svg>`;
}

function renderCircle() {
  const host = el('circleSvg').parentElement;
  // 빌더 SVG 교체
  const wrap = document.createElement('div');
  wrap.innerHTML = circleSvgMarkup(null);
  const svg = wrap.firstElementChild;
  svg.id = 'circleSvg';
  el('circleSvg').replaceWith(svg);
  // 노드 클릭 핸들러
  svg.querySelectorAll('.node').forEach(g => {
    g.style.cursor = 'pointer';
    g.onclick = () => onNodeClick(+g.dataset.node);
  });
  // 팔레트 선택 표시
  document.querySelectorAll('.chip.rune').forEach(ch => {
    ch.classList.toggle('selected', ch.dataset.rune === state.selectedRune);
  });
  document.querySelectorAll('.chip.shape').forEach(ch => {
    const id = ch.dataset.shape;
    const on = id === 'circle' ? state.craft.circle.hasBase : state.craft.circle.shapes[id];
    ch.classList.toggle('selected', on);
  });
  el('linkModeBtn').classList.toggle('active', state.linkMode);
}

function onNodeClick(i) {
  const c = state.craft.circle;
  if (state.linkMode) {
    if (!c.nodes[i]) return; // 빈 노드는 연결 불가
    if (state.linkFirst === null) { state.linkFirst = i; }
    else if (state.linkFirst === i) { state.linkFirst = null; }
    else {
      const pair = [state.linkFirst, i].sort((a, b) => a - b);
      const exists = c.links.some(l => l[0] === pair[0] && l[1] === pair[1]);
      if (!exists) c.links.push(pair);
      state.linkFirst = null;
    }
    render();
    return;
  }
  // 일반 모드: 룬 배치 / 제거
  if (c.nodes[i]) {
    c.nodes[i] = null;
    c.links = c.links.filter(l => l[0] !== i && l[1] !== i);
  } else if (state.selectedRune) {
    c.nodes[i] = state.selectedRune;
  }
  render();
}

/* ---------------- 주문 렌더 ---------------- */
function renderSpell() {
  const line = el('spellLine');
  const emph = el('emphasisLine');
  line.innerHTML = '';
  emph.innerHTML = '';
  if (state.craft.spell.length === 0) {
    line.innerHTML = '<span class="placeholder">아래 단어를 골라 주문을 지으세요…</span>';
    emph.innerHTML = '<span class="placeholder">주문을 먼저 작성하세요.</span>';
  }
  state.craft.spell.forEach((word, i) => {
    // 작성 패널: 클릭 시 제거
    const t = document.createElement('span');
    t.className = 'word-token';
    t.textContent = word.w;
    t.title = '클릭하여 제거';
    t.onclick = () => { state.craft.spell.splice(i, 1); render(); };
    line.appendChild(t);

    // 강조 패널: 클릭 시 강조 토글
    const e = document.createElement('span');
    e.className = 'word-token' + (word.emph ? ' emph-' + state.craft.decorate.emphStyle : '');
    e.textContent = word.w;
    e.title = '클릭하여 강조 토글';
    e.onclick = () => { word.emph = !word.emph; render(); };
    emph.appendChild(e);
  });
}

/* ---------------- 미리보기 페이지 ---------------- */
function renderPreview() {
  const page = el('bookPage');
  const d = state.craft.decorate;
  const lay = state.craft.layout;
  page.className = 'book-page border-' + d.border +
    ' tmpl-' + lay.template + ' focus-' + lay.focus;

  el('pageCircle').innerHTML = circleSvgMarkup(null);

  const sp = el('pageSpell');
  sp.innerHTML = '';
  if (state.craft.spell.length === 0) {
    sp.innerHTML = '<span class="placeholder">주문 없음</span>';
  } else {
    state.craft.spell.forEach(word => {
      const s = document.createElement('span');
      s.className = 'pw' + (word.emph ? ' emph-' + d.emphStyle : '');
      s.textContent = word.w + ' ';
      sp.appendChild(s);
    });
  }
}

/* ---------------- 납품 / 채점 ---------------- */
function buildSnapshot() {
  const c = state.craft.circle;
  const runes = c.nodes.filter(Boolean); // counter id == rune id
  const links = c.links.map(([i, j]) => [c.nodes[i], c.nodes[j]]);
  const emphasized = new Set(
    state.craft.spell.map((w, i) => (w.emph ? i : -1)).filter(i => i >= 0)
  );
  return {
    circle: { hasBase: c.hasBase, runes, shapes: c.shapes, links },
    spell: state.craft.spell,
    decorate: { ...state.craft.decorate, emphasized },
    layout: state.craft.layout,
  };
}

function deliver() {
  if (!state.analyzed) {
    state.threats = analyzeCommission(state.commission);
    state.analyzed = true;
    analyze();
  }
  const snap = buildSnapshot();
  const r = scoreCraft(state.commission, state.threats, snap);
  const box = el('scoreReport');
  box.classList.remove('hidden');

  const starStr = r.requirementsMet
    ? '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)
    : '실패';
  const head = r.requirementsMet
    ? `<div class="verdict ok">납품 성공! ${starStr}</div>`
    : `<div class="verdict fail">최소 요구 미달 — 반려되었습니다</div>`;

  const rows = r.breakdown.map(b =>
    `<div class="brow"><span>${b.label}</span><span>${b.pts > 0 ? '+' : ''}${b.pts}</span></div>`
  ).join('');
  const tipsHtml = r.tips.length
    ? `<div class="tips"><b>개선 힌트</b><ul>${r.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>`
    : '';

  box.innerHTML = `
    ${head}
    <div class="score-num">점수 ${r.score} / ${r.maxScore}</div>
    <div class="breakdown">${rows}</div>
    ${r.requirementsMet ? `<div class="reward">보수 +${r.gold}💰</div>` : ''}
    ${tipsHtml}
    ${r.requirementsMet ? `<button class="btn primary" onclick="loadAndRender(state.commissionIndex+1)">다음 의뢰 →</button>` : ''}
  `;

  if (r.requirementsMet) {
    const g = el('gold');
    g.textContent = (+g.textContent) + r.gold;
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------------- 전체 렌더 ---------------- */
function render() {
  renderCircle();
  renderSpell();
  renderPreview();
}

function el(id) { return document.getElementById(id); }
window.addEventListener('DOMContentLoaded', init);
