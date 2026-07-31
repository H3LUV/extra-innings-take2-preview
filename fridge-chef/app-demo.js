function getFormData() {
  return {
    ingredients: [...state.selected],
    cuisine: state.cuisine,
    difficulty: elements.difficulty.value,
    servings: Number(elements.servings.value),
    maxTime: Number(elements.maxTime.value),
    purpose: state.purpose,
    spicy: state.spicy
  };
}

function hashString(value) {
  return [...value].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

function buildDemoRecipes(input) {
  const cuisine = input.cuisine === '상관없음' ? ['한식', '양식', '일식'][hashString(input.ingredients.join('')) % 3] : input.cuisine;
  const templates = demoTemplates[cuisine] || demoTemplates['한식'];
  const main = input.ingredients.slice(0, 2).join('·');
  const seed = hashString(input.ingredients.join('|') + cuisine + input.purpose);
  const reordered = templates.map((_, index) => templates[(index + seed) % templates.length]);

  return reordered.map((template, index) => {
    const owned = [...input.ingredients];
    const extras = template.extra.filter((item) => !owned.includes(item));
    const time = Math.min(input.maxTime, Math.max(12, 18 + index * 7 + (seed % 6)));
    const difficulty = input.difficulty === '상관없음' ? (index === 2 ? '보통' : '쉬움') : input.difficulty;
    const title = template.title.replace('{main}', main);
    const ingredients = [
      ...owned.map((name, ingredientIndex) => ({ name, amount: getAmount(name, input.servings, ingredientIndex), owned: true })),
      ...extras.map((name, ingredientIndex) => ({ name, amount: getExtraAmount(name, input.servings, ingredientIndex), owned: false }))
    ];
    return {
      id: `demo-${seed}-${index}`,
      title,
      subtitle: template.subtitle,
      cuisine,
      timeMinutes: time,
      difficulty,
      servings: input.servings,
      matchScore: Math.max(76, 96 - index * 7 - (seed % 4)),
      emoji: template.emoji,
      usedIngredients: owned,
      extraIngredients: extras,
      ingredients,
      steps: buildSteps(template.base, owned, extras, time),
      tip: buildTip(template.base, input.spicy),
      storage: index === 0 ? '완전히 식힌 뒤 밀폐해 냉장 보관하고, 가능하면 다음 날까지 드세요.' : '조리 직후 먹는 것이 가장 좋고 남으면 냉장 보관 후 충분히 재가열하세요.',
      allergyNote: '달걀, 우유, 밀, 대두, 견과류 등 사용한 제품의 알레르기 표시를 확인하세요.'
    };
  });
}

function getAmount(name, servings, index) {
  const maps = {
    '계란': `${Math.max(1, servings)}개`, '김치': `${100 + servings * 40}g`, '돼지고기': `${servings * 120}g`,
    '소고기': `${servings * 110}g`, '닭고기': `${servings * 130}g`, '두부': `${servings === 1 ? '1/2' : 1}모`,
    '양파': `${Math.max(0.5, servings * .5)}개`, '대파': `${Math.max(.5, servings * .35)}대`, '감자': `${Math.max(1, servings)}개`,
    '밥': `${servings}공기`, '파스타면': `${servings * 100}g`, '우동면': `${servings}봉`, '새우': `${servings * 8}마리`
  };
  return maps[name] || `${80 + servings * 30 + index * 10}g`;
}

function getExtraAmount(name, servings) {
  if (name.includes('간장') || name.includes('고추장') || name.includes('굴소스')) return `${Math.max(1, servings)}큰술`;
  if (name.includes('마늘')) return `${Math.max(0.5, servings * .5)}큰술`;
  if (name === '밥') return `${servings}공기`;
  if (name === '계란') return `${servings}개`;
  if (name === '치즈') return `${servings * 40}g`;
  if (name === '파스타면') return `${servings * 100}g`;
  return '적당량';
}

function buildSteps(base, owned, extras, time) {
  const prep = `재료(${owned.join(', ')})를 씻고 물기를 제거한 뒤 한입 크기로 썹니다. 고기나 해산물이 있다면 다른 재료와 칼·도마를 분리하세요.`;
  const common = [{ title: '재료 손질', description: prep }];
  const mainName = owned.slice(0, 2).join('과 ');
  if (base === '볶음' || base === '파스타') {
    return [...common,
      { title: '팬 예열', description: '중불로 팬을 1분 예열하고 식용유를 둘러 향이 강한 재료부터 1~2분 볶습니다.' },
      { title: '주재료 익히기', description: `${mainName}을 넣고 센 불에서 수분을 날리듯 볶습니다. 고기는 속까지 완전히 익힙니다.` },
      { title: '간 맞추기', description: `${extras.slice(0,3).join(', ')}을 넣고 골고루 섞은 뒤 불을 낮춰 ${Math.max(3, Math.round(time / 5))}분 더 익힙니다.` },
      { title: '마무리', description: '불을 끄고 간을 본 뒤 부족한 간만 소량 보충해 바로 담아냅니다.' }
    ];
  }
  if (base === '찌개' || base === '국') {
    return [...common,
      { title: '향 내기', description: '냄비에 기름을 조금 두르고 단단한 재료와 향채를 중불에서 2분 볶습니다.' },
      { title: '국물 만들기', description: `물 또는 육수를 붓고 ${extras.slice(0,3).join(', ')}으로 간한 뒤 센 불에서 끓입니다.` },
      { title: '충분히 끓이기', description: '끓기 시작하면 중약불로 낮추고 재료 중심부까지 익도록 10~15분 끓입니다.' },
      { title: '마무리 간', description: '거품을 걷고 간을 조절합니다. 대파나 후추가 있다면 마지막에 넣습니다.' }
    ];
  }
  return [...common,
    { title: '반죽 준비', description: `${extras.slice(0,2).join(', ')}과 찬물을 섞어 너무 되지 않은 반죽을 만듭니다.` },
    { title: '재료 섞기', description: '손질한 재료를 반죽에 넣고 재료 표면에 얇게 묻도록 가볍게 섞습니다.' },
    { title: '노릇하게 굽기', description: '중불 팬에 기름을 넉넉히 두르고 앞뒤로 3~4분씩 굽습니다.' },
    { title: '기름 빼기', description: '키친타월이나 식힘망에 잠시 올린 뒤 따뜻할 때 먹습니다.' }
  ];
}

function buildTip(base, spicy) {
  const spicyTip = spicy === '화끈하게' ? '매운 양념은 처음부터 전부 넣지 말고 절반씩 추가하세요.' : '간은 마지막에 맞추면 짜질 확률이 줄어듭니다.';
  if (base === '볶음') return `팬에 재료를 너무 많이 쌓으면 볶음이 아니라 찜이 됩니다. 넓게 펼쳐 볶고, ${spicyTip}`;
  if (base === '찌개' || base === '국') return `국물은 처음부터 짜게 잡지 마세요. 끓는 동안 졸아듭니다. ${spicyTip}`;
  return `반죽은 차갑게, 팬은 충분히 예열하면 더 바삭합니다. ${spicyTip}`;
}
