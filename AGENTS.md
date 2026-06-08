# 개발 작업 기준

## 작업 범위

- GitHub Pages의 docs 경로를 사용
- 서버 작동 테스트는 사용자가 직접 진행
- 꼭 spa가 아니어도 괜찮으므로 너무 html, js 파일이 길어지지 않도록 주의
- 이미 push된 태그는 이동하지 않고, 변경 반영 시 minor 또는 patch 버전을 올려 새 태그로 push

## 커밋 규칙

- 커밋 메시지는 `타입 : 한글 설명` 형식을 사용 (예: feat, fix, docs, db)
- 기능 구현과 해당 기능의 설정 가이드 문서는 서로 다른 커밋으로 분리

## 설정 가이드 문서

- 외부 서비스 연동 절차는 루트에 `0N_주제.md` 형식으로 작성
- 화면 캡처는 `./img/0N/0N-XX.png`로 주제별 하위 폴더에 번호 순서대로 추가하고 본문에서 참조
- 기존 캡처 경로를 변경하면 관련 `0N_주제.md`의 이미지 참조도 함께 수정
- 각 단계는 `## N. 제목` 섹션으로 나누고, 캡처 이미지와 함께 클릭할 메뉴/버튼을 구체적으로 안내
- 설정 가이드 문서는 관련 캡처, 실제 구현 파일, 현재 로직을 대조해 검증한 뒤 작성

## 화면 구현

- 사용자 화면은 일반적인 서비스 사이트처럼 구성하고, 개발용 설정/상태 문구를 노출하지 않음
- 가입, 로그인, 작성 등 주요 흐름은 목적별 페이지로 분리
- 반응형 화면을 기준으로 구현하고 상단 버튼 영역은 flex로 정렬
- 이미지와 미디어는 화면을 넘치지 않도록 max-width와 grid minmax(0, ...)를 고려
- 레이아웃, 디자인 구현 시 boostrap5 최신 버전을 사용하고, 직접적인 CSS 사용은 폰트 적용 외엔 최소화

## 타이포그래피

- 제목 계열은 Paperlogy, 본문 계열은 Pretendard를 사용
- 한글 문장은 word-break: keep-all을 적용
- 외래어 표기는 `프런트엔드`, `프런트` 형태로 통일

## 파일 구조

- css, js 파일을 분할해서 생성하고 관리
- 파일 간 결합도는 낮게, 기능별 응집도는 높게 유지
- 주요 메시지, 용어, 오류 문구는 msg.js로 분리해 일괄 편집 가능하게 관리

## 프런트엔드 코드

- ES6+ 문법을 따르는 VanilarJS로 구현
- dom 조회 시 querySelector를 사용
- handler의 경우 호이스팅을 적극 활용하여 선언문 형태로 작성
- 모든 선언과 흐름제어 블록에는 50자 이내의 한글 주석으로 목적을 작성
- 적극적으로 구조 분해 할당을 사용

## Supabase 연동

- Supabase SDK 최신 버전을 사용
- Supabase URL과 publishable key는 코드 상수로 관리하고 사용자 입력 폼으로 받지 않음
- 적극적으로 localStorage와 sessionStorage를 사용한 캐싱을 진행하되 보안적으로 중요한 부분은 직접적으로 꼭 fetch를 진행
- 이메일 회원가입은 인증 메일 안내와 인증 완료 리다이렉트 흐름을 명확히 구현
- 리뷰 작성은 로그인 사용자만 가능하도록 진입과 저장 단계에서 모두 확인
- 작성자 전용 수정/삭제 컨트롤은 프런트 표시 조건과 RLS 정책을 함께 고려
- 댓글에는 작성자 정보를 표시할 수 있도록 profiles 관계 조회를 고려
- Supabase 오류는 사용자에게 한글 메시지로 표시
- 소셜 로그인(OAuth) 콜백은 쿼리 파라미터(code)로, 이메일 인증 콜백은 해시(access_token)로 전달되므로 두 형태를 모두 확인
- OAuth `redirectTo`는 현재 접속 주소 기준으로 동적 생성하고, Supabase 대시보드 `Authentication > URL Configuration`의 Site URL과 Redirect URLs(와일드카드 `/**`)에 배포·로컬 주소를 등록 → 미등록 시 전달한 `redirectTo`가 무시되고 기본 Site URL(`localhost:3000`)로 폴백됨
- 프로필 생성은 클라이언트 upsert가 아니라 `auth.users` insert 트리거(`handle_new_user`)로 가입 시점에 서버에서 처리 (매 세션 재계산·클라이언트 식별자 생성 방지)
- 식별자 해싱 등 단방향 가공은 프런트(`crypto.subtle`)가 아니라 가입 트리거에서 pgcrypto로 처리

## 소셜 로그인 (Kakao)

- Supabase 내장 Kakao provider는 `account_email`, `profile_image`, `profile_nickname` scope를 서버에 하드코딩하고, 클라이언트 `scopes` 옵션은 덮어쓰기가 아니라 append만 됨 → 이 scope들을 클라이언트에서 제거할 수 없음
- 카카오 개인정보를 받지 않으려면 내장 provider 대신 **Custom OIDC Provider**로 등록 (issuer `https://kauth.kakao.com`, scope `openid`만, 식별자는 `custom:` 접두사 필수, 카카오 콘솔에서 OpenID Connect 활성화 필요)
- 이메일 미제공 로그인은 `auth.users.raw_user_meta_data->>'sub'`(openid)를 해싱해 식별자/닉네임으로 사용

## 지도 검색 (Naver/Kakao Maps)

- 네이버 지역검색 API는 Client Secret 필요 + 브라우저 CORS 차단이라 정적 호스팅에서 직접 호출 불가 → 지도 JS SDK의 Geocoding(주소 → 좌표)으로 구현
- 네이버 Client Secret은 브라우저 코드·정적 문서 예시에 넣지 않고, REST API가 필요해질 때 외부 Express 서버의 환경변수로만 보관
- 카카오 지도는 JavaScript 키와 `services` 라이브러리로 구현하고, REST API 키·Admin 키는 브라우저에서 사용하지 않음
- SDK는 `place-search.js`에서 지연 로딩하고 결과를 `{name, buildingName, roadAddress, jibunAddress, latitude, longitude, provider}`로 정규화해, provider 교체 지점을 한 곳으로 모음
- SDK 키는 `config.js` 상수(`NAVER_MAP_CLIENT_ID`, `KAKAO_MAP_JS_KEY`)로 관리하고, 미설정 provider만 작성 화면 선택 UI에서 비활성화
- NCP 콘솔에 Web 서비스 URL(로컬·GitHub Pages)을 등록해야 SDK 인증이 통과됨 (소셜 로그인 Redirect URL 등록과 동일한 주의)
- Kakao Developers에도 JavaScript SDK 도메인과 Kakao Map API 활성화 상태를 설정해야 SDK 인증이 통과됨
- 카카오맵 무료 사용 설정은 대표 앱 1개만 활성화 가능하므로 문서와 작업 시 이 제한을 반드시 안내
- geocode 결과의 `addressElements`에서 `BUILDING_NAME`을 뽑아 상호명 후보로 자동 채움 (키워드 POI 검색이 아니므로 상호명은 보정 입력 전제)
- geocode는 주소(도로명/지번) 변환기라 **상호·가게 이름으로는 검색이 안 됨** (주소 DB에 등록된 유명 건물명만 간혹 매칭) → 현재는 이 한계까지로 마무리
- 카카오는 `keywordSearch`로 상호·장소명을 먼저 검색하고 결과가 없으면 `addressSearch`로 주소 검색을 시도
- 네이버 기반 상호 키워드(POI) 검색이 필요해지면 네이버 지역검색 API를 외부 Express 서버로 프록시하고, 현재 카카오 provider처럼 `place-search.js`의 `searchPlaces` 반환 형식만 유지
- 동적 주입한 maps.js는 onload 시점에 geocoder 서브모듈이 아직 준비 안 될 수 있음 → `naver.maps.Service.geocode` 존재 여부를 폴링한 뒤 사용
- 목록 카드는 상호명·좌표를 본문에 노출하지 않고 카드 지도 정보창(InfoWindow)에 상호명 + 역지오코딩 주소로 표시 (주소는 미저장이라 `reverseGeocode`로 조회, Reverse Geocoding 미사용/실패 시 이름만 표시하도록 graceful)
- 좌표가 한국 범위(`isWithinKorea`, 위도 33~38.7·경도 124.5~132)를 벗어나면 지도를 그리지 않고 경고 컴포넌트로 대체
- 목록 지도는 카드마다 새 인스턴스를 만들고 조작(드래그·휠줌)을 비활성화 (작성 화면 미리보기 지도는 단일 인스턴스 재사용)
- 목록 지도는 리뷰 카드별로 네이버/카카오 provider 선택과 확대 버튼을 제공하되, 한국 범위 밖 좌표 제한은 유지
- 목록 지도 provider·확대 상태와 작성 화면 provider 선택은 `sessionStorage`에 저장해 같은 탭을 나가기 전까지 유지
- 작성 폼의 위경도는 직접 입력 금지 → `hidden` 필드로만 두고 검색 결과 선택으로만 채움 (readonly 입력은 HTML required 검증에서 제외되므로 제출 시 JS로 좌표 유무를 직접 검증)
- 네이버 검색 0건이면 "'카카오 지도'로 검색할까요?" 안내의 `카카오 지도` 텍스트(링크) 클릭으로 같은 검색어를 카카오로 재검색 유도 (라디오를 코드로 바꾸면 change 미발생 → 재검색을 직접 호출)
- provider(네이버↔카카오) 전환 시 입력 좌표(없으면 현재 위치 기본 중심 `defaultCenter`)를 유지해 지도를 다시 렌더 (`getActivePlace`)
- 작성 화면 미리보기 지도도 조작(드래그·줌)을 비활성화 — 네이버는 생성 옵션, 카카오는 `setDraggable(false)`/`setZoomable(false)` 메서드로 처리
- 네이버 `zoom`과 카카오 `level`은 반대 스케일이라 확대 정도를 맞춰 둠 (`zoom 16` ≈ `level 5`)
- 작성 진입 시 현재 위치를 감지해 기본 지도를 표시(표시용, 좌표 미지정)하고, `현재 위치` 버튼은 좌표를 채워 선택으로 인정 (검색 강제의 허용 예외 경로)
- geolocation 권한: `denied`는 스크립트로 재요청 불가 → Permissions API로 상태를 확인해 차단 안내, `prompt`/닫기 상태는 버튼 클릭 시 재요청됨; 로드 시 실패도 상태 문구로 명시
- 기본 provider는 네이버 우선, 미설정 시 카카오로 결정 (`getDefaultProvider`/`getDefaultMapProvider`)
- 지도 렌더·정보창 역지오코딩은 선택 provider에 맞춰 분기 (`renderMap`/`reverseGeocode(lat, lng, provider)`)
- 목록 카드 지도 확대는 `review-map-expanded` 클래스를 토글한 뒤 해당 카드만 다시 렌더

## DB 함수·트리거

- `auth.users` 삭제(탈퇴 등)는 service_role 권한이라 프런트에서 직접 못 함 → `security definer` RPC(`auth.uid()`로 본인만)로 처리
- `security definer` 함수에서 pgcrypto(`digest` 등) 확장 함수를 쓰면 `set search_path = public, extensions`를 명시해야 함 (없으면 가입 시 "Database error saving new user")
- 트리거/RPC 변경은 `supabase/schemas`의 SQL 파일에 반영하고, 사용자가 SQL Editor에서 다시 실행해야 적용됨 (트리거는 기존 유저에 소급되지 않음)
