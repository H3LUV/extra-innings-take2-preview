# 냉털셰프 Android

현재 운영 중인 `https://fridge-chef-ai-tan.vercel.app/`을 안드로이드 앱으로 제공하는 WebView 셸입니다.

## 포함 기능

- 현재 냉털셰프 UI와 레시피 기능 유지
- 안드로이드 뒤로가기 지원
- 외부 링크는 기본 브라우저에서 열기
- 네트워크 오류 화면과 재시도
- 레시피 공유 버튼을 안드로이드 기본 공유창으로 연결
- 제3자 쿠키 차단

## 빌드

GitHub Actions의 `Build Fridge Chef APK` 작업이 디버그 서명 APK를 생성합니다.
로컬에서는 Android SDK 36, JDK 17, Gradle 8.13 환경에서 다음 명령을 사용합니다.

```bash
gradle assembleDebug
```

결과 파일:

```text
app/build/outputs/apk/debug/app-debug.apk
```

이 APK는 직접 설치 테스트용입니다. Google Play 배포 전에는 별도의 출시용 서명키로 release APK 또는 AAB를 생성해야 합니다.
