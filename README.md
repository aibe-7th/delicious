# 🍴 Delicious

![version](https://img.shields.io/badge/version-1.0.0-success)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ESM-f7df1e?logo=javascript&logoColor=000)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952b3?logo=bootstrap&logoColor=fff)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20Postgres-3ecf8e?logo=supabase&logoColor=fff)
![Naver Map](https://img.shields.io/badge/Naver-Map-03c75a?logo=naver&logoColor=fff)
![Kakao Map](https://img.shields.io/badge/Kakao-Map-ffcd00?logo=kakao&logoColor=000)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-222?logo=github)

맛집 리뷰를 작성하고 지도에서 위치를 확인하는 정적 웹 서비스.

🔗 **Live:** https://aibe-7th.github.io/delicious/

## 핵심 기능

- **인증** — 이메일 회원가입(메일 인증) + 소셜 로그인(Google, Kakao)
- **리뷰** — 맛집 리뷰 작성·수정·삭제와 댓글 (작성자 본인만 수정/삭제)
- **장소 검색** — 네이버(주소)·카카오(상호/주소) 검색으로 좌표 입력, "현재 위치" 지정
- **지도 표시** — 작성 미리보기 + 목록 카드 지도(정보창에 상호명·주소), 한국 범위 밖은 경고 처리
- **보안** — RLS 정책 + 가입 시 프로필 생성 트리거(서버 처리)

## 아키텍처

```mermaid
flowchart LR
    U[사용자] --> FE["GitHub Pages<br/>정적 docs (Vanilla JS + Bootstrap 5)"]

    FE -->|supabase-js| SB
    subgraph SB["Supabase"]
        AU[Auth · OAuth/이메일]
        DB[(Postgres + RLS)]
        TR[트리거 · RPC]
    end

    FE -->|JS SDK| MAP
    subgraph MAP["지도 Open API"]
        NV[Naver · Geocoding]
        KK[Kakao · 키워드/주소]
    end
```

## 데이터 모델

```mermaid
erDiagram
    users ||--|| profiles : "가입 트리거"
    profiles ||--o{ reviews : 작성
    profiles ||--o{ comments : 작성
    reviews ||--o{ comments : 포함

    profiles {
        uuid id PK
        text email
        text nickname
    }
    reviews {
        uuid id PK
        uuid user_id FK
        text title
        text restaurant_name
        numeric latitude
        numeric longitude
        text content
    }
    comments {
        uuid id PK
        uuid review_id FK
        uuid user_id FK
        text content
    }
```

## 장소 검색 흐름

```mermaid
flowchart TD
    A[검색어 입력] --> B{provider}
    B -->|네이버| C[주소 Geocoding]
    B -->|카카오| D[키워드 → 없으면 주소]
    C --> E{결과 있음?}
    D --> F[결과 목록]
    E -->|예| F
    E -->|아니오| G["'카카오 지도'로 검색 유도"]
    F --> H[선택 → 좌표 채움 + 미리보기 지도]
    I[현재 위치 버튼] --> H
```

## 기술 스택

| 구분 | 사용 |
|------|------|
| 프런트 | Vanilla JS(ESM), Bootstrap 5 |
| 백엔드 | Supabase (Auth, Postgres, RLS, 트리거/RPC) |
| 지도 | Naver Maps JS SDK, Kakao Maps JS SDK |
| 호스팅 | GitHub Pages (`docs/`) |

## 프로젝트 구조

```
docs/            정적 프런트엔드 (HTML · js/ · css/)
supabase/schemas 테이블·RLS·트리거 SQL
0N_*.md          외부 서비스 설정 가이드
img/0N/          가이드 캡처
```

## 설정 가이드

- [01_supabase.md](./01_supabase.md) — Supabase 프로젝트·키
- [02_social-login.md](./02_social-login.md) — Google·Kakao 소셜 로그인
- [03_open-api-map.md](./03_open-api-map.md) — Naver·Kakao 지도
