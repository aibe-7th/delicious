# 지도 검색 설정 (Naver Maps)

- 게시글 작성 화면에서 도로명·지번 주소를 검색해 위도·경도를 자동 입력한다. (Geocoding은 주소 변환이라 일반 건물명·상호명으로는 검색되지 않는다.)
- 정적 호스팅(GitHub Pages)에서는 Client Secret이 필요한 네이버 지역검색 REST API를 브라우저에서 직접 호출하지 않는다.
- 현재 구현은 **네이버 지도 JS SDK의 Geocoding**을 사용한다.
  - SDK는 `ncpKeyId`와 NCP 콘솔에 등록한 Web 서비스 URL로 인증한다.
  - Client Secret과 `X-NCP-APIGW-API-KEY` 헤더는 사용하지 않는다.
- 검색 provider는 `docs/js/place-search.js`에 모아 두어, 추후 POI 검색이 필요할 때 해당 모듈만 교체한다.

## 1. NAVER Cloud Platform 접속

![NCP 콘솔 이동](./img/03/03-01.png)

- NAVER Cloud Platform에 접속해 로그인한다.
  - https://www.ncloud.com/
- 우측 상단 `콘솔`을 클릭한다.
- 콘솔 진입 후 상단 검색창에서 `Maps`를 검색한다.

## 2. Maps Application 열기

![Maps Application 화면](./img/03/03-02.png)

- `Services` > `Application Services` > `Maps`로 이동한다.
- 좌측 메뉴에서 `Application`이 선택되어 있는지 확인한다.
- `Application 등록` 버튼을 클릭한다.

## 3. Application 등록

![Application 등록 화면](./img/03/03-03.png)

- `Application 이름`에 프로젝트를 구분할 이름을 입력한다.
  - 예시: `delicious`
- `API 선택`에서 현재 구현에 필요한 항목을 선택한다.
  - `Dynamic Map`: 작성 화면 미리보기 지도와 목록 카드 지도 표시
  - `Geocoding`: 도로명·지번 주소를 위도·경도로 변환
  - `Reverse Geocoding`: 목록 지도 정보창에 좌표 → 주소를 표시 (선택, 미선택 시 이름만 표시)
- `Static Map`, `Directions` 등은 현재 구현에서 사용하지 않는다.
- `Web 서비스 URL`에 실제 접속 주소를 추가한다.
  - GitHub Pages 예시: `https://{GitHub 아이디}.github.io/delicious`
  - 로컬 예시: `http://127.0.0.1:5500/docs`
  - `localhost`로 테스트한다면 `http://localhost:5500/docs`도 함께 추가한다.
- 등록하지 않은 주소에서는 SDK 인증이 실패하므로 배포 주소와 로컬 테스트 주소를 모두 넣는다.
- `등록` 버튼을 클릭한다.

## 4. API 사용 상태 확인

![API 관리 화면](./img/03/03-04.png)

- 등록이 끝나면 Application 목록에서 방금 만든 항목을 선택한다.
- `API 관리`의 `인증 정보` 탭에서 `Dynamic Map`과 `Geocoding`이 보이는지 확인한다.
- 사용량이 0으로 표시되어도 설정 자체는 정상이다. 실제 작성 화면에서 검색하면 사용량이 반영된다.

## 5. Client ID 복사

![인증 정보 상세 화면](./img/03/03-05.png)

- `인증 정보` 창을 열어 `Client ID (X-NCP-APIGW-API-KEY-ID)`를 복사한다.
- `Client Secret (X-NCP-APIGW-API-KEY)`는 복사하지 않는다.
  - 현재 브라우저 구현에서는 Secret을 사용하지 않는다.
  - Secret은 외부 서버에서 REST API를 호출할 때만 필요하다.

## 6. 프로젝트 설정 반영

- `docs/js/config.js`의 `NAVER_MAP_CLIENT_ID`에 복사한 Client ID를 입력한다.

```js
export const NAVER_MAP_CLIENT_ID = "여기에_Client_ID";
```

- 값이 비어 있으면 `docs/js/write.js`가 장소 검색 입력창과 검색 버튼을 비활성화한다.
- 위도·경도는 폼에 노출하지 않고 검색 결과 선택으로만 채워지므로, 키가 없으면 리뷰를 저장할 수 없다.

## 7. 작성 화면 동작 확인

- `docs/write.html`의 `장소 검색` 입력창에 도로명·지번 주소를 입력한다.
  - 예시: `서울특별시 중구 세종대로 110`
- `검색` 버튼을 클릭하거나 입력창에서 Enter를 누른다.
- 검색 결과를 선택하면 다음이 자동 반영된다.
  - 위도·경도: 폼의 hidden 필드에 저장 (화면에는 노출하지 않음)
  - `상호명`: 주소에 건물명 정보가 있고 상호명 입력칸이 비어 있을 때만 자동 입력 (대부분 직접 입력)
- 선택한 위치는 `Dynamic Map`으로 미리보기 지도에 표시된다.
- 지도 렌더링에 실패해도 저장 흐름은 막지 않고 미리보기만 숨긴다.
- 목록(`docs/index.html`)에서는 상호명·좌표를 본문에 노출하지 않고, 카드 지도의 정보창에 상호명과 (역지오코딩된) 주소를 표시한다.
  - 좌표가 한국 범위를 벗어나면 지도를 그리지 않고 경고 컴포넌트를 표시한다.

## 구현 기준

- `docs/js/place-search.js`
  - `maps.js?ncpKeyId=...&submodules=geocoder`를 동적으로 로드한다.
  - `naver.maps.Service.geocode`가 준비될 때까지 최대 5초 동안 확인한다.
  - 결과를 `{name, buildingName, roadAddress, jibunAddress, latitude, longitude}` 형식으로 정규화한다.
  - 미리보기 지도와 마커는 한 번 생성한 뒤 선택 위치에 맞춰 중심과 마커만 이동한다.
- `docs/js/write.js`
  - `hasMapConfig()`가 false이면 검색 UI를 비활성화하고 좌표 직접 입력으로 폴백한다.
  - 검색 결과 클릭 시 위도·경도를 폼에 채우고, 건물명이 있으면 상호명 후보로 사용한다.
- `docs/js/msg.js`
  - 지도 설정 누락, SDK 로딩 실패, 검색 실패, 결과 없음, 선택 완료 메시지를 한글 문구로 관리한다.

## 한계와 향후 확장

- Geocoding은 주소 변환 기능이므로 일반적인 상호·가게 이름 POI 검색이 아니다.
  - 도로명·지번 주소는 검색된다.
  - 주소 DB에 등록된 유명 건물명은 일부 검색될 수 있다.
  - 일반 상호명은 사용자가 직접 보정 입력하는 전제로 둔다.
- 상호 키워드 검색이 필요해지면 다음 중 하나로 교체한다.
  - 네이버 지역검색 API를 외부 Express 서버에서 프록시하고 Secret은 서버 환경변수로 보관한다.
  - 카카오 로컬 키워드 검색으로 provider를 교체한다.
- 두 방식 모두 `docs/js/place-search.js`의 `searchPlaces()` 반환 형식만 유지하면 작성 화면 로직은 그대로 사용할 수 있다.
- 정적 프런트와 지도 검색 프록시를 분리하면 GitHub Pages 배포 구조를 유지하면서 Secret 노출 없이 지역검색 API를 사용할 수 있다.
