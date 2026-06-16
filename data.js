/* =========================================================
   data.js — 게임 데이터 (의뢰, 룬, 도형, 단어, 위협↔상극)
   ========================================================= */

/* 위협 키워드 → 상극 개념(counter).
   의뢰 텍스트에서 이 키워드들을 찾아 분석한다. */
const THREATS = {
  '독':   { counter: 'purify',  label: '독' },
  '중독': { counter: 'purify',  label: '독' },
  '뱀':   { counter: 'tame',    label: '뱀/짐승' },
  '짐승': { counter: 'tame',    label: '짐승' },
  '늑대': { counter: 'tame',    label: '짐승' },
  '산':   { counter: 'earth',   label: '산/자연' },
  '숲':   { counter: 'earth',   label: '숲/자연' },
  '불':   { counter: 'water',   label: '불' },
  '화상': { counter: 'water',   label: '불/화상' },
  '저주': { counter: 'bless',   label: '저주' },
  '상처': { counter: 'heal',    label: '상처' },
  '부상': { counter: 'heal',    label: '부상' },
  '추위': { counter: 'warmth',  label: '추위' },
  '동상': { counter: 'warmth',  label: '추위/동상' },
  '어둠': { counter: 'light',   label: '어둠' },
  '악몽': { counter: 'light',   label: '어둠/악몽' },
};

/* 룬: 각 룬은 하나의 counter 개념을 담는다. */
const RUNES = [
  { id: 'purify', glyph: '☼', name: '정화의 룬', counter: 'purify' },
  { id: 'tame',   glyph: '◉', name: '진정의 룬', counter: 'tame'   },
  { id: 'earth',  glyph: '⛰', name: '대지의 룬', counter: 'earth'  },
  { id: 'water',  glyph: '≈', name: '물의 룬',   counter: 'water'  },
  { id: 'bless',  glyph: '✦', name: '축복의 룬', counter: 'bless'  },
  { id: 'heal',   glyph: '✚', name: '치유의 룬', counter: 'heal'   },
  { id: 'warmth', glyph: '☀', name: '온기의 룬', counter: 'warmth' },
  { id: 'light',  glyph: '✸', name: '빛의 룬',   counter: 'light'  },
];

/* 구조 도형: 마법진의 기하학. 각자 효과(formula)를 가진다. */
const SHAPES = [
  { id: 'circle',   glyph: '◯', name: '원 (기반)',   effect: 'containment',
    desc: '마법진의 기반. 반드시 필요하다.' },
  { id: 'triangle', glyph: '△', name: '삼각형 (증폭)', effect: 'amplify',
    desc: '새겨진 룬의 힘을 키운다.' },
  { id: 'square',   glyph: '□', name: '사각형 (안정)', effect: 'stabilize',
    desc: '역류를 막아 안정성을 더한다.' },
];

/* 주문 단어 은행: 범주별. relevant = 어떤 counter/주제에 적합한지. */
const WORD_BANK = {
  '대상': [
    { w: '그대를',   tags: [] },
    { w: '환자를',   tags: [] },
    { w: '이 몸을',  tags: [] },
    { w: '병자를',   tags: [] },
  ],
  '행위': [
    { w: '정화하라', tags: ['purify'] },
    { w: '치유하라', tags: ['heal'] },
    { w: '달래라',   tags: ['earth', 'tame'] },
    { w: '잠재워라', tags: ['tame'] },
    { w: '몰아내라', tags: ['light', 'bless'] },
    { w: '식혀라',   tags: ['water'] },
    { w: '데워라',   tags: ['warmth'] },
    { w: '봉인하라', tags: ['bless', 'tame'] },
  ],
  '표적': [
    { w: '독을',     tags: ['purify'] },
    { w: '뱀을',     tags: ['tame'] },
    { w: '산의 노여움을', tags: ['earth'] },
    { w: '불길을',   tags: ['water'] },
    { w: '저주를',   tags: ['bless'] },
    { w: '상처를',   tags: ['heal'] },
    { w: '한기를',   tags: ['warmth'] },
    { w: '어둠을',   tags: ['light'] },
  ],
  '어조': [
    { w: '부드럽게', tags: ['gentle'] },
    { w: '단호히',   tags: ['strong'] },
    { w: '영원히',   tags: [] },
    { w: '즉시',     tags: [] },
    { w: '자비롭게', tags: ['gentle'] },
  ],
};

/* 의뢰 목록. type: scroll(간단) / book(복합).
   reward 보수, difficulty 난이도(요구 위협 수 = threats 자동). */
const COMMISSIONS = [
  {
    id: 'c1', type: 'scroll', from: '— 시골 약초상',
    reward: 40,
    text: '남편이 독에 중독됐어요. 낫게 할 마법서를 만들어 주세요. ' +
          '최근에 산에 올라갔다가 뱀에 물린 것 같아요. ㅜㅜ',
  },
  {
    id: 'c2', type: 'scroll', from: '— 떠돌이 모험가',
    reward: 30,
    text: '동굴에서 불 함정에 당해 화상을 입었소. 시원하게 식혀줄 스크롤이면 충분하오.',
  },
  {
    id: 'c3', type: 'book', from: '— 몰락한 귀족',
    reward: 90,
    text: '가문에 대대로 내려오는 저주가 있소. 밤마다 악몽에 시달리고, ' +
          '겨울이면 온몸이 동상에 걸린 듯 시리오. 이 모든 어둠을 걷어낼 ' +
          '제대로 된 마법서가 필요하오. 값은 후하게 치르겠소.',
  },
  {
    id: 'c4', type: 'book', from: '— 변경의 사냥꾼',
    reward: 80,
    text: '숲의 짐승들이 사나워졌네. 늑대에게 물려 깊은 상처를 입었고, ' +
          '숲 자체가 우리를 거부하는 듯하이. 짐승을 달래고 상처를 아물게 할 ' +
          '마법서를 부탁하네.',
  },
];
