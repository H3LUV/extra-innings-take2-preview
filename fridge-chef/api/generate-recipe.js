export const maxDuration = 30;

const ALLOWED_CUISINES = new Set(['상관없음', '한식', '일식', '중식', '양식', '동남아', '분식', '퓨전']);
const ALLOWED_DIFFICULTIES = new Set(['상관없음', '쉬움', '보통', '어려움']);
const ALLOWED_PURPOSES = new Set(['일상 한 끼', '냉장고 털이', '아이와 함께', '술안주', '다이어트']);
const ALLOWED_SPICY = new Set(['상관없음', '안 매운맛', '살짝 매콤', '화끈하게']);

const recipeSchema = {
  type: 'object',
  required: ['recipes'],
  properties: {
    recipes: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        required: [
          'title', 'subtitle', 'cuisine', 'timeMinutes', 'difficulty', 'servings',
          'matchScore', 'emoji', 'usedIngredients', 'extraIngredients', 'ingredients',
          'steps', 'tip', 'storage', 'allergyNote'
        ],
        properties: {
          title: { type: 'string' },
          subtitle: { type: 'string' },
          cuisine: { type: 'string' },
          timeMinutes: { type: 'integer' },
          difficulty: { type: 'string', enum: ['쉬움', '보통', '어려움'] },
          servings: { type: 'integer' },
          matchScore: { type: 'integer' },
          emoji: { type: 'string' },
          usedIngredients: { type: 'array', items: { type: 'string' } },
          extraIngredients: { type: 'array', items: { type: 'string' } },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'amount', 'owned'],
              properties: {
                name: { type: 'string' },
                amount: { type: 'string' },
                owned: { type: 'boolean' }
              }
            }
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'description'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          tip: { type: 'string' },
          storage: { type: 'string' },
          allergyNote: { type: 'string' }
        }
      }
    }
  }
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

function cleanText(value, maxLength = 100) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function validateInput(body) {
  const ingredients = Array.isArray(body?.ingredients)
    ? [...new Set(body.ingredients.map((item) => cleanText(item, 20)).filter(Boolean))].slice(0, 5)
    : [];

  if (!ingredients.length) throw new Error('재료를 하나 이상 선택해 주세요.');

  return {
    ingredients,
    cuisine: ALLOWED_CUISINES.has(body?.cuisine) ? body.cuisine : '상관없음',
    difficulty: ALLOWED_DIFFICULTIES.has(body?.difficulty) ? body.difficulty : '상관없음',
    purpose: ALLOWED_PURPOSES.has(body?.purpose) ? body.purpose : '일상 한 끼',
    spicy: ALLOWED_SPICY.has(body?.spicy) ? body.spicy : '상관없음',
    servings: clampInteger(body?.servings, 1, 8, 2),
    maxTime: clampInteger(body?.maxTime, 10, 180, 40)
  };
}

function buildPrompt(input) {
  return `당신은 한국 가정에서 실제로 따라 만들 수 있는 레시피를 만드는 요리 전문가입니다.

사용자 조건:
${JSON.stringify(input, null, 2)}

반드시 지킬 조건:
1. 서로 다른 레시피를 정확히 3개 만드세요.
2. 선택 재료를 최대한 활용하되 맛이 성립하지 않는 억지 조합은 피하세요.
3. 추가 재료는 한국 일반 마트에서 쉽게 구할 수 있는 기본 재료로 최소화하세요.
4. 모든 분량은 ${input.servings}인분 기준으로 구체적으로 작성하세요.
5. 각 요리의 총 조리시간은 ${input.maxTime}분 이내여야 합니다.
6. 요리 스타일, 난이도, 목적, 매운맛 조건을 반영하세요.
7. 육류·해산물·달걀은 충분히 익히도록 안내하세요.
8. 조리 단계는 실제 순서대로 3~8단계로 작성하세요.
9. usedIngredients에는 사용자가 선택한 재료 중 실제 사용하는 것만 넣으세요.
10. ingredients의 owned는 선택 재료면 true, 추가 재료면 false입니다.
11. 결과는 JSON만 출력하고 마크다운이나 부가 설명을 넣지 마세요.`;
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim() || '';
}

function normalizeRecipe(recipe, input) {
  const selected = new Set(input.ingredients);
  const usedIngredients = Array.isArray(recipe?.usedIngredients)
    ? [...new Set(recipe.usedIngredients.map((item) => cleanText(item, 20)).filter((item) => selected.has(item)))]
    : [];

  const safeUsed = usedIngredients.length ? usedIngredients : [input.ingredients[0]];
  const extraIngredients = Array.isArray(recipe?.extraIngredients)
    ? [...new Set(recipe.extraIngredients.map((item) => cleanText(item, 24)).filter((item) => item && !selected.has(item)))].slice(0, 10)
    : [];

  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.slice(0, 18).map((item) => {
        const name = cleanText(item?.name, 24);
        return {
          name,
          amount: cleanText(item?.amount, 30) || '적당량',
          owned: selected.has(name)
        };
      }).filter((item) => item.name)
    : [];

  input.ingredients.forEach((name) => {
    if (!ingredients.some((item) => item.name === name)) {
      ingredients.unshift({ name, amount: '적당량', owned: true });
    }
  });

  const steps = Array.isArray(recipe?.steps)
    ? recipe.steps.slice(0, 8).map((step, index) => ({
        title: cleanText(step?.title, 30) || `${index + 1}단계`,
        description: cleanText(step?.description, 300)
      })).filter((step) => step.description)
    : [];

  if (steps.length < 3) throw new Error('Gemini가 충분한 조리 단계를 만들지 못했습니다.');

  return {
    title: cleanText(recipe?.title, 60) || '오늘의 냉장고 요리',
    subtitle: cleanText(recipe?.subtitle, 160) || '선택한 재료를 활용한 한 끼',
    cuisine: cleanText(recipe?.cuisine, 20) || (input.cuisine === '상관없음' ? '한식' : input.cuisine),
    timeMinutes: clampInteger(recipe?.timeMinutes, 5, input.maxTime, input.maxTime),
    difficulty: ['쉬움', '보통', '어려움'].includes(recipe?.difficulty) ? recipe.difficulty : '보통',
    servings: input.servings,
    matchScore: clampInteger(recipe?.matchScore, 0, 100, 80),
    emoji: cleanText(recipe?.emoji, 8) || '🍳',
    usedIngredients: safeUsed,
    extraIngredients,
    ingredients,
    steps,
    tip: cleanText(recipe?.tip, 260) || '간은 마지막에 조금씩 맞추세요.',
    storage: cleanText(recipe?.storage, 260) || '완전히 식힌 뒤 밀폐해 냉장 보관하고 가능한 한 빨리 드세요.',
    allergyNote: cleanText(recipe?.allergyNote, 260) || '사용한 제품의 원재료와 알레르기 표시를 확인하세요.'
  };
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return json({ error: 'Vercel에 GEMINI_API_KEY가 설정되지 않았습니다.' }, 503);
    }

    let input;
    try {
      input = validateInput(await request.json());
    } catch (error) {
      return json({ error: error?.message || '요청 데이터가 올바르지 않습니다.' }, 400);
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseJsonSchema: recipeSchema
          }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = cleanText(data?.error?.message, 500) || `HTTP ${response.status}`;
        return json({
          error: `Gemini API 오류: ${detail}`,
          errorCode: data?.error?.status || String(response.status)
        }, 502);
      }

      const text = extractText(data);
      if (!text) {
        const reason = cleanText(data?.candidates?.[0]?.finishReason, 80) || '응답 본문 없음';
        return json({ error: `Gemini가 빈 응답을 반환했습니다. (${reason})` }, 502);
      }

      let parsed;
      try {
        parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
      } catch {
        return json({ error: 'Gemini 응답을 JSON으로 해석하지 못했습니다.' }, 502);
      }

      if (!Array.isArray(parsed?.recipes) || parsed.recipes.length !== 3) {
        return json({ error: 'Gemini가 레시피 3개를 반환하지 않았습니다.' }, 502);
      }

      const recipes = parsed.recipes.map((recipe) => normalizeRecipe(recipe, input));
      return json({ recipes, model, source: 'gemini' });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return json({ error: 'Gemini 응답 시간이 초과되었습니다.' }, 504);
      }
      return json({ error: `AI 서버 오류: ${cleanText(error?.message, 300) || '알 수 없는 오류'}` }, 502);
    } finally {
      clearTimeout(timeout);
    }
  }
};
