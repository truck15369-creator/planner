# 계획 데스크 (Plan Desk)

개인 계획 관리 웹앱. 달력 / 일별 / 월별(주차) / 년별(간트) 4개 탭, 라이트·다크 테마.

## 폰에서 앱처럼 쓰기 (배포 → 홈 화면 추가)

### 1단계: 배포하기 (둘 중 택1, 무료)

**Vercel (가장 쉬움)**
1. https://vercel.com 접속 → GitHub/Google 계정으로 가입
2. 이 폴더를 통째로 https://github.com 새 저장소에 올리거나, Vercel의 "Import" 화면에 폴더를 드래그
   - 더 쉬운 길: https://vercel.com/new 에서 이 폴더를 zip 해제 후 올리기
3. 프레임워크는 자동으로 "Vite"로 인식됨 → Deploy 클릭
4. 1~2분 뒤 `https://plan-desk-xxxx.vercel.app` 주소가 생성됨

**Netlify (드래그로 끝)**
1. https://app.netlify.com 가입
2. 이 폴더에서 `npm install && npm run build` 실행 → `dist` 폴더 생성
3. Netlify "Deploys" 화면에 **dist 폴더를 드래그&드롭**
4. 주소 생성 완료

### 2단계: 아이폰 홈 화면에 추가
1. 사파리(Safari)로 배포된 주소 접속 (⚠️ 크롬 말고 사파리)
2. 하단 공유 버튼(□↑) 탭
3. "홈 화면에 추가" 선택 → 이름 확인 후 추가
4. 홈 화면에 앱 아이콘 생김. 탭하면 전체화면 앱처럼 실행됨

## 로컬에서 실행 (개발용)
```
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성 → 배포용
```

## 참고
- 데이터는 그 기기 브라우저에 저장됩니다(localStorage). 기기·브라우저를 바꾸면 따라오지 않습니다.
- 여러 기기 동기화·공유가 필요하면 백엔드 연결이 필요합니다.
- 잠금화면/홈화면 "위젯"은 웹앱으로는 불가(애플 정책). 네이티브 앱이 필요합니다.
