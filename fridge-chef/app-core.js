const ingredientCatalog = {
  '인기': ['계란', '김치', '돼지고기', '두부', '양파', '대파', '감자', '닭고기', '참치캔', '버섯'],
  '육류': ['돼지고기', '소고기', '닭고기', '베이컨', '햄', '소시지', '다짐육', '오리고기'],
  '해산물': ['오징어', '새우', '고등어', '연어', '참치캔', '바지락', '어묵', '명란'],
  '채소': ['양파', '대파', '감자', '애호박', '당근', '배추', '양배추', '버섯', '가지', '브로콜리'],
  '탄수화물': ['밥', '우동면', '소면', '파스타면', '떡', '식빵', '라면', '또띠아'],
  '기타': ['계란', '두부', '치즈', '김치', '우유', '콩나물', '옥수수', '토마토', '카레가루', '만두']
};

const cuisineOptions = ['상관없음', '한식', '일식', '중식', '양식', '동남아', '분식', '퓨전'];
const purposeOptions = ['일상 한 끼', '냉장고 털이', '아이와 함께', '술안주', '다이어트'];
const spicyOptions = ['상관없음', '안 매운맛', '살짝 매콤', '화끈하게'];

function loadFavorites() {
  try {
    const saved = localStorage.getItem('fridgeChefFavorites');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem('fridgeChefFavorites', JSON.stringify(favorites));
  } catch {
    // file:// 보안 정책 등으로 저장이 막히면 현재 실행 중에만 유지합니다.
  }
}

const state = {
  selected: [],
  category: '인기',
  cuisine: '상관없음',
  purpose: '일상 한 끼',
  spicy: '상관없음',
  aiEnabled: false,
  recipes: [],
  favorites: loadFavorites()
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  selectedTray: $('#selectedTray'),
  selectedCount: $('#selectedCount'),
  categoryTabs: $('#categoryTabs'),
  ingredientCloud: $('#ingredientCloud'),
  customIngredient: $('#customIngredient'),
  addIngredientButton: $('#addIngredientButton'),
  cuisineOptions: $('#cuisineOptions'),
  purposeOptions: $('#purposeOptions'),
  spicyOptions: $('#spicyOptions'),
  difficulty: $('#difficulty'),
  servings: $('#servings'),
  maxTime: $('#maxTime'),
  timeOutput: $('#timeOutput'),
  generateButton: $('#generateButton'),
  generateModeText: $('#generateModeText'),
  resultsSection: $('#resultsSection'),
  resultSummary: $('#resultSummary'),
  recipeGrid: $('#recipeGrid'),
  regenerateButton: $('#regenerateButton'),
  statusBadge: $('#statusBadge'),
  recipeModal: $('#recipeModal'),
  modalContent: $('#modalContent'),
  modalClose: $('#modalClose'),
  favoritesButton: $('#favoritesButton'),
  favoriteCount: $('#favoriteCount'),
  favoritesModal: $('#favoritesModal'),
  favoritesClose: $('#favoritesClose'),
  favoritesList: $('#favoritesList'),
  toast: $('#toast')
};

const demoTemplates = {
  '한식': [
    { title: '{main} 듬뿍 간장덮밥', subtitle: '짭조름한 감칠맛으로 빠르게 완성하는 든든한 한 그릇', emoji: '🍚', extra: ['진간장', '다진 마늘', '참기름', '깨'], base: '볶음' },
    { title: '칼칼한 {main} 찌개', subtitle: '냉장고 재료를 한 냄비에 모은 따뜻한 집밥', emoji: '🍲', extra: ['고춧가루', '국간장', '다진 마늘', '육수'], base: '찌개' },
    { title: '{main} 바삭전', subtitle: '겉은 바삭하고 속은 촉촉한 실패 적은 반찬 겸 안주', emoji: '🥞', extra: ['부침가루', '소금', '식용유'], base: '전' }
  ],
  '일식': [
    { title: '{main} 데리야키동', subtitle: '달콤짭짤한 소스와 재료를 밥 위에 올린 일본식 덮밥', emoji: '🍱', extra: ['간장', '맛술', '설탕', '밥'], base: '볶음' },
    { title: '{main} 미소 수프', subtitle: '부드럽고 담백하게 끓여내는 따뜻한 한 그릇', emoji: '🥣', extra: ['된장', '다시마', '쪽파'], base: '국' },
    { title: '{main} 오코노미 스타일 구이', subtitle: '있는 재료를 잘게 썰어 노릇하게 굽는 캐주얼 메뉴', emoji: '🍳', extra: ['밀가루', '계란', '마요네즈'], base: '전' }
  ],
  '중식': [
    { title: '{main} 굴소스 볶음', subtitle: '센 불에 빠르게 볶아 불향과 식감을 살린 중화식 한 접시', emoji: '🥡', extra: ['굴소스', '간장', '다진 마늘', '식용유'], base: '볶음' },
    { title: '매콤한 {main} 덮밥', subtitle: '두반장 풍미를 살려 밥과 잘 어울리게 만든 메뉴', emoji: '🍛', extra: ['고추장', '간장', '전분', '밥'], base: '볶음' },
    { title: '{main} 계란탕', subtitle: '몽글한 달걀과 재료의 식감을 살린 가벼운 국물요리', emoji: '🥣', extra: ['계란', '치킨스톡', '전분', '참기름'], base: '국' }
  ],
  '양식': [
    { title: '크리미 {main} 파스타', subtitle: '부드러운 소스에 냉장고 재료를 넉넉히 넣은 홈파스타', emoji: '🍝', extra: ['파스타면', '우유', '치즈', '후추'], base: '파스타' },
    { title: '{main} 치즈 오븐구이', subtitle: '치즈를 올려 노릇하게 구워내는 간단한 메인요리', emoji: '🧀', extra: ['치즈', '버터', '소금', '후추'], base: '구이' },
    { title: '{main} 토마토 스튜', subtitle: '토마토의 산뜻함과 재료의 깊은 맛을 살린 따뜻한 스튜', emoji: '🥘', extra: ['토마토소스', '마늘', '올리브유'], base: '찌개' }
  ],
  '동남아': [
    { title: '{main} 피시소스 볶음밥', subtitle: '짭짤하고 향긋한 동남아풍 한 그릇', emoji: '🍛', extra: ['밥', '피시소스', '라임 또는 식초', '계란'], base: '볶음' },
    { title: '코코넛 {main} 커리', subtitle: '부드러운 코코넛 풍미에 재료를 푹 익힌 커리', emoji: '🥘', extra: ['카레가루', '우유', '고춧가루'], base: '찌개' },
    { title: '{main} 라이스페이퍼 롤', subtitle: '아삭한 재료를 가볍게 싸 먹는 산뜻한 메뉴', emoji: '🌯', extra: ['라이스페이퍼', '간장', '식초'], base: '롤' }
  ],
  '분식': [
    { title: '{main} 즉석 떡볶이', subtitle: '냉장고 재료를 몽땅 넣고 보글보글 끓이는 국민 간식', emoji: '🌶️', extra: ['떡', '고추장', '설탕', '어묵'], base: '찌개' },
    { title: '{main} 치즈 라볶이', subtitle: '매콤한 소스와 치즈가 만난 든든한 야식', emoji: '🍜', extra: ['라면', '고추장', '치즈'], base: '찌개' },
    { title: '{main} 김밥 볶음밥', subtitle: '김밥 속 재료처럼 잘게 썰어 볶는 간단한 한 끼', emoji: '🍙', extra: ['밥', '김', '참기름'], base: '볶음' }
  ],
  '퓨전': [
    { title: '매콤 {main} 타코', subtitle: '한국식 양념과 또띠아를 결합한 손쉬운 퓨전 한 끼', emoji: '🌮', extra: ['또띠아', '고추장', '양파'], base: '볶음' },
    { title: '{main} 김치 리소토', subtitle: '김치의 감칠맛과 크리미한 식감을 함께 살린 메뉴', emoji: '🥘', extra: ['밥', '김치', '우유', '치즈'], base: '볶음' },
    { title: '{main} 치즈전', subtitle: '전과 피자의 중간쯤에서 맛있게 타협한 바삭한 요리', emoji: '🍕', extra: ['부침가루', '치즈', '식용유'], base: '전' }
  ]
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2300);
}

function renderCategoryTabs() {
  elements.categoryTabs.innerHTML = Object.keys(ingredientCatalog).map((category) => `
    <button type="button" class="category-tab ${state.category === category ? 'active' : ''}" data-category="${category}">${category}</button>
  `).join('');
}

function renderIngredientCloud() {
  elements.ingredientCloud.innerHTML = ingredientCatalog[state.category].map((ingredient) => {
    const selected = state.selected.includes(ingredient);
    const blocked = state.selected.length >= 5 && !selected;
    return `<button type="button" class="ingredient-button ${selected ? 'selected' : ''}" data-ingredient="${ingredient}" ${blocked ? 'disabled' : ''}>${ingredient}</button>`;
  }).join('');
}

function renderSelected() {
  elements.selectedCount.textContent = state.selected.length;
  elements.selectedTray.innerHTML = state.selected.length
    ? state.selected.map((ingredient) => `<button type="button" class="selected-chip" data-remove="${escapeHtml(ingredient)}">${escapeHtml(ingredient)} <i>×</i></button>`).join('')
    : '<span class="empty-selection">아직 선택한 재료가 없어요</span>';
  renderIngredientCloud();
}

function toggleIngredient(ingredient) {
  if (state.selected.includes(ingredient)) {
    state.selected = state.selected.filter((item) => item !== ingredient);
  } else if (state.selected.length < 5) {
    state.selected.push(ingredient);
  } else {
    showToast('재료는 최대 5개까지 선택할 수 있어요. 냉장고도 정원이 있습니다.');
  }
  renderSelected();
}

function addCustomIngredient() {
  const ingredient = elements.customIngredient.value.trim().replace(/\s+/g, ' ');
  if (!ingredient) return;
  if (state.selected.includes(ingredient)) {
    showToast('이미 선택한 재료입니다. 재료도 중복 출근은 사양합니다.');
  } else if (state.selected.length >= 5) {
    showToast('재료는 최대 5개까지 선택할 수 있어요.');
  } else {
    state.selected.push(ingredient.slice(0, 12));
    elements.customIngredient.value = '';
    renderSelected();
  }
}

function renderOptionButtons(container, options, stateKey, className) {
  container.innerHTML = options.map((option) => `
    <button type="button" class="${className} ${state[stateKey] === option ? 'active' : ''}" data-value="${option}" data-state-key="${stateKey}">${option}</button>
  `).join('');
}

function updateFavoriteCount() {
  elements.favoriteCount.textContent = state.favorites.length;
}

async function checkApiStatus() {
  if (location.protocol === 'file:') {
    setDemoStatus();
    return;
  }
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('status failed');
    const data = await response.json();
    state.aiEnabled = Boolean(data.aiEnabled);
    if (state.aiEnabled) {
      elements.statusBadge.classList.add('ai');
      elements.statusBadge.innerHTML = '<i></i> Gemini AI 연결됨';
      elements.generateModeText.textContent = 'Gemini가 실시간으로 조합해요';
    } else {
      setDemoStatus();
    }
  } catch {
    setDemoStatus();
  }
}

function setDemoStatus() {
  state.aiEnabled = false;
  elements.statusBadge.classList.remove('ai');
  elements.statusBadge.innerHTML = '<i></i> 데모 모드';
  elements.generateModeText.textContent = 'API 키 없이도 바로 체험해요';
}
