# 냉털셰프 Vercel 배포

## 프로젝트 가져오기

1. Vercel에서 **Add New → Project**를 선택합니다.
2. GitHub 저장소 `H3LUV/extra-innings-take2-preview`를 Import 합니다.
3. Framework Preset은 **Other**로 둡니다.
4. Root Directory는 반드시 `fridge-chef`로 선택합니다.
5. Build Command와 Output Directory는 비워둡니다.

## 환경변수

Vercel Project Settings → Environment Variables에 아래 값을 추가합니다.

- `GEMINI_API_KEY`: Google AI Studio에서 발급한 실제 키
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`

Production, Preview, Development에 모두 적용한 뒤 새로 배포합니다.

## 확인

- 메인: `https://생성된주소.vercel.app`
- 상태: `https://생성된주소.vercel.app/api/status`

정상 연결 시 상태 API가 다음처럼 응답합니다.

```json
{
  "aiEnabled": true,
  "mode": "ai",
  "model": "gemini-3.5-flash-lite"
}
```

API 키가 없거나 Gemini 호출이 실패하면 프런트엔드는 자동으로 스마트 데모 레시피를 사용합니다.

> 실제 API 키는 GitHub 파일, 프런트엔드 자바스크립트, `NEXT_PUBLIC_` 또는 `VITE_` 환경변수에 넣지 마세요.
