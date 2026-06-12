# AI웹서비스 구현

### 학습 목표
1. AI 웹서비스 구현 방법을 이해한다.
2. AI 웹서비스 구현 방법을 실제 서비스에 적용할 수 있다.

## 1. 전체 아키텍처
> LLM API는 프론트에서 직접 호출하지 않고, 백엔드에서 호출하도록 한다.

### 1-1. 3-Tier 구조

```
┌─────────────────────┐
│  React (port:5173)  │   "여행 추천해줘" 버튼 클릭
└──────────┬──────────┘
           │ POST /api/ai/recommend
           ▼
┌─────────────────────┐
│ Express (port:3000) │   인증/로깅/캐싱/Rate Limit
└──────────┬──────────┘
           │ POST /predict
           ▼
┌─────────────────────┐
│ FastAPI (port:8000) │   프롬프트 가공/LLM 호출
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│  OpenAI / Claude    │
└─────────────────────┘
```

### 1-2. 각 계층 역할

| 계층 | 역할 | 절대 하면 안 되는 것 |
|------|------|---------------------|
| **React** | UI, 입력 받기, 응답 표시 | API 키 보유 |
| **Express** | 인증, Rate Limit, 캐싱, 로깅 | LLM 직접 호출(가능은 함) |
| **FastAPI** | 프롬프트 가공, 모델 호출, 결과 가공 | 인증/세션 관리 |
| **LLM API** | 텍스트 생성 | - |

> 💡 **왜 FastAPI를 굳이 쓰나?**
> - Python 생태계(LangChain, sentence-transformers, OCR 등) 활용
> - ML 모델 자체 서빙(추론) 가능
> - 프롬프트/토큰 처리에 유리

---

## 2. LLM API 키 발급 (OpenAI / Claude)

### 2-1. OpenAI API 키 발급

1. https://platform.openai.com 접속 → 가입/로그인
2. 우측 상단 프로필 → **API Keys**
3. **Create new secret key** → 키 이름 입력 → 생성
4. **`sk-...` 형태 키 복사** (1번만 표시됨)
5. 결제 수단 등록 (Billing)

### 2-2. Claude (Anthropic) API 키 발급

1. https://console.anthropic.com 접속 → 가입/로그인
2. **API Keys** 메뉴 → **Create Key**
3. **`sk-ant-...` 형태 키 복사**
4. Billing에서 크레딧 충전

### 2-3. 키 보관 원칙 (반드시!)

```bash
# ❌ 절대 금지
git에 .env 커밋하기
프론트엔드 코드에 하드코딩
Slack/Notion에 공유

# 올바른 방법
.env 파일에 보관 (.gitignore에 .env 추가)
운영 환경: AWS Secrets Manager / Docker Secret
팀 공유: 1Password / Bitwarden 등 비밀번호 관리자
```

#### .gitignore 필수

```gitignore
# 절대 git에 들어가면 안 되는 것
.env
.env.local
.env.production
*.pem
*.key
node_modules/
__pycache__/
```

> 💡 **API 키가 GitHub에 올라가면?**
> 자동 봇이 5분 내 발견 → 채굴 봇이 사용 → **수백만 원 청구**
> 즉시 키 폐기(Revoke) + 새로 발급

---

## 3. FastAPI AI 서버 만들기

### 3-1. 프로젝트 세팅

```bash
# 1) 폴더 생성
mkdir ai-server
cd ai-server

# 2) 가상환경
python -m venv ai-server

# 3) 활성화
# Windows:
ai-server\Scripts
.\activate

# Mac/Linux:
source ai-server/bin/activate

# 4) 패키지 설치
pip install fastapi uvicorn python-dotenv openai anthropic httpx pydantic

# 5) requirements.txt 생성
pip freeze > requirements.txt
```

---

### 3-2. 폴더 구조

```
ai-server/
 ├── .env
 ├── main.py
 ├── requirements.txt
 ├── routers/
 │   └── recommend.py
 ├── services/
 │   └── llm_service.py
 └── models/
     └── schemas.py
```

---

### 3-3. .env

```bash
# OpenAI 또는 Claude 중 하나만 있어도 됨
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx

# 사용할 모델
LLM_PROVIDER=openai            # openai 또는 anthropic
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_MODEL=claude-sonnet-4-5

# 서버 설정
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

---

### 3-4. models/schemas.py (요청/응답 정의)
이 코드는 FastAPI AI 서버에서 사용할 요청/응답 DTO 역할의 Pydantic 모델입니다. <br>
```txt
Express Backend
 ↓
FastAPI /ai/recommend
 ↓
RecommendRequest로 요청 검증
 ↓
AI 추천 처리
 ↓
RecommendResponse 형태로 JSON 응답
```

#### 요청 / 응답 예시
**요청** : <br>
```json
{
  "destination": "부산",
  "days": 2,
  "style": "맛집"
}
```

**응답** : <br>
```json
{
  "title": "부산 2일 맛집 여행 추천",
  "duration": "2일",
  "plan": "1일차: 해운대 → 광안리 → 민락수변공원...",
  "tokens_used": 284
}
```


```python
"""
Pydantic 모델 - API 요청/응답 검증
"""
from pydantic import BaseModel, Field
from typing import Optional


class RecommendRequest(BaseModel):
    """여행 추천 요청"""
    destination: str = Field(..., min_length=1, max_length=50, description="여행지")
    days: int = Field(..., ge=1, le=30, description="여행 일수")
    style: Optional[str] = Field("자유", description="여행 스타일 (힐링/액티비티/맛집 등)")


class RecommendResponse(BaseModel):
    """여행 추천 응답"""
    title: str
    duration: str
    plan: str
    tokens_used: int
```

---

### 3-5. services/llm_service.py (LLM 호출 로직)
이 코드는 FastAPI AI 서버의 LLM 호출 서비스 코드 입니다. <br>
흐름은 다음과 같습니다. <br>
```txt
Express Backend
 ↓
FastAPI /ai/recommend
 ↓
generate_trip_plan()
 ↓
build_prompt()
 ↓
OpenAI 또는 Anthropic API 호출
 ↓
여행 추천 결과 반환
```
스트리밍 흐름은 다음과 같습니다. <br>
```txt
Express /api/ai/recommend/stream
 ↓
FastAPI /ai/recommend/stream
 ↓
stream_trip_plan()
 ↓
LLM 토큰을 chunk 단위로 yield
 ↓
React 화면에 실시간 출력
```


```python
"""
LLM 호출 서비스 - OpenAI / Claude 모두 지원
"""
import os
from openai import AsyncOpenAI
# from anthropic import AsyncAnthropic
from dotenv import load_dotenv

# .env 파일에 정의된 환경변수를 로드한다.
# 예:
# OPENAI_API_KEY=sk-...
# LLM_PROVIDER=openai
# OPENAI_MODEL=gpt-4o-mini
load_dotenv()

"""
OpenAI 비동기 클라이언트 초기화

AsyncOpenAI를 사용하면 FastAPI에서 await 기반으로
LLM API를 비동기 호출할 수 있다.
"""
openai_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

"""
Anthropic Claude를 사용하려면 아래 주석을 해제해야 한다.

주의:
현재 anthropic_client는 주석 처리되어 있으므로
LLM_PROVIDER=anthropic 으로 설정하면 NameError가 발생한다.
"""
# anthropic_client = AsyncAnthropic(
#     api_key=os.getenv("ANTHROPIC_API_KEY")
# )

"""
사용할 LLM Provider 설정

.env에 LLM_PROVIDER가 없으면 기본값은 openai
"""
PROVIDER = os.getenv("LLM_PROVIDER", "openai")

"""
OpenAI 모델명 설정

.env 예:
OPENAI_MODEL=gpt-4o-mini
"""
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

"""
Anthropic 모델명 설정

현재는 주석 처리되어 있다.
"""
# ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def build_prompt(destination: str, days: int, style: str) -> str:
    """
    여행 추천용 프롬프트 생성 함수

    destination: 여행지
    days: 여행 일수
    style: 여행 스타일

    이 함수의 역할:
    - 사용자 입력값을 LLM이 이해하기 좋은 지시문으로 변환
    - 출력 형식을 고정
    - 추천 조건을 명확하게 전달
    """

    return f"""
당신은 한국 여행 가이드 전문가입니다.

[요청 사항]
- 여행지: {destination}
- 일수: {days}일
- 스타일: {style}

[작성 규칙]
1. 일자별로 시간 순서대로 작성
2. 하루 3~4개 활동 추천
3. 식당/카페 1~2곳 포함
4. 이동 동선 효율적으로
5. 한국어로 작성

응답 형식:
Day 1: ...
Day 2: ...
"""


async def call_openai(prompt: str) -> tuple[str, int]:
    """
    OpenAI API 비동기 호출 함수

    prompt:
    - build_prompt()에서 만든 여행 추천 프롬프트

    반환값:
    - content: AI가 생성한 여행 추천 본문
    - tokens: 사용된 총 토큰 수
    """

    response = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "당신은 친절한 한국 여행 가이드입니다.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],

        # temperature가 높을수록 답변이 다양해진다.
        # 여행 추천은 약간의 창의성이 필요하므로 0.7 정도가 적절하다.
        temperature=0.7,

        # 최대 생성 토큰 수
        # 너무 작으면 일정이 중간에 잘릴 수 있다.
        max_tokens=1500,
    )

    # AI 응답 본문 추출
    content = response.choices[0].message.content

    # 사용 토큰 수 추출
    tokens = response.usage.total_tokens

    return content, tokens


async def call_anthropic(prompt: str) -> tuple[str, int]:
    """
    Anthropic Claude API 호출 함수

    현재 코드에서는 anthropic_client와 ANTHROPIC_MODEL이 주석 처리되어 있으므로
    그대로 실행하면 NameError가 발생할 수 있다.

    Claude를 사용하려면:
    1. anthropic 패키지 설치
    2. import 주석 해제
    3. anthropic_client 초기화 주석 해제
    4. ANTHROPIC_MODEL 주석 해제
    5. .env에 ANTHROPIC_API_KEY 설정
    """

    response = await anthropic_client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1500,
        system="당신은 친절한 한국 여행 가이드입니다.",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    # Claude 응답 텍스트 추출
    content = response.content[0].text

    # 입력 토큰 + 출력 토큰 계산
    tokens = response.usage.input_tokens + response.usage.output_tokens

    return content, tokens


async def generate_trip_plan(destination: str, days: int, style: str) -> dict:
    """
    여행 계획 생성 공통 진입점

    FastAPI 라우터에서 이 함수를 호출하면 된다.

    역할:
    1. 프롬프트 생성
    2. PROVIDER 값에 따라 OpenAI 또는 Anthropic 호출
    3. 프론트/백엔드가 사용하기 좋은 JSON 형태로 반환
    """

    # 사용자 입력값으로 LLM 프롬프트 생성
    prompt = build_prompt(destination, days, style)

    # LLM_PROVIDER가 anthropic이면 Claude 호출
    if PROVIDER == "anthropic":
        content, tokens = await call_anthropic(prompt)

    # 그 외에는 기본적으로 OpenAI 호출
    else:
        content, tokens = await call_openai(prompt)

    # API 응답 데이터 구성
    return {
        "title": f"{destination} {days}일 {style} 여행",

        # 예: days=3이면 2박 3일
        "duration": f"{days - 1}박 {days}일",

        # AI가 생성한 일정 본문
        "plan": content,

        # 토큰 사용량
        "tokens_used": tokens,
    }


async def stream_trip_plan(destination: str, days: int, style: str):
    """
    LLM 스트리밍 응답 제너레이터

    FastAPI의 StreamingResponse와 함께 사용한다.

    역할:
    - LLM 응답을 한 번에 기다리지 않고
    - 생성되는 텍스트를 조각 단위로 yield한다.
    - React 화면에서 실시간 출력 효과를 만들 수 있다.
    """

    # 프롬프트 생성
    prompt = build_prompt(destination, days, style)

    if PROVIDER == "anthropic":
        """
        Claude 스트리밍 호출

        현재 anthropic_client가 주석 처리되어 있으므로
        실제 사용하려면 관련 설정을 먼저 활성화해야 한다.
        """
        async with anthropic_client.messages.stream(
            model=ANTHROPIC_MODEL,
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    else:
        """
        OpenAI 스트리밍 호출

        stream=True 옵션이 핵심이다.
        """
        stream = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            stream=True,
        )

        """
        OpenAI는 응답을 chunk 단위로 보내준다.

        chunk.choices[0].delta.content에
        새로 생성된 텍스트 조각이 들어있다.
        """
        async for chunk in stream:
            content = chunk.choices[0].delta.content

            # content가 있는 경우에만 클라이언트로 전달
            if content:
                yield content
```

#### Request / Response 연결 구조
Express에서 FastAPI로 보내는 요청: <br>
```json
{
  "destination": "제주도",
  "days": 3,
  "style": "맛집 중심"
}
```
FastAPI응답 : <br>
```json
{
  "title": "제주도 3일 맛집 중심 여행",
  "duration": "2박 3일",
  "plan": "Day 1: ...",
  "tokens_used": 823
}
```
Express 최종 응답: <br>
```json
{
  "ok": true,
  "data": {
    "title": "제주도 3일 맛집 중심 여행",
    "duration": "2박 3일",
    "plan": "Day 1: ...",
    "tokens_used": 823
  },
  "cached": false
}
```

#### 실행 환경변수
.env <br>
```bash
OPENAI_API_KEY=본인_OPENAI_API_KEY
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini
```



### 3-6. routers/recommend.py (라우터)

```python
"""
여행 추천 라우터
"""
from fastapi import APIRouter, HTTPException
from models.schemas import RecommendRequest, RecommendResponse
from services.llm_service import generate_trip_plan

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/recommend", response_model=RecommendResponse)
async def recommend_trip(request: RecommendRequest):
    """LLM 기반 여행 일정 생성"""
    try:
        result = await generate_trip_plan(
            destination=request.destination,
            days=request.days,
            style=request.style or "자유",
        )
        return result
    except Exception as e:
        # 실무: 로깅 라이브러리(loguru, logging) 사용
        print(f"[ERROR] LLM 호출 실패: {e}")
        raise HTTPException(status_code=500, detail=f"AI 추천 실패: {str(e)}")
```

---

### 3-7. main.py (진입점)

```python
"""
FastAPI 진입점
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import recommend

load_dotenv()

app = FastAPI(title="AI Server", version="1.0.0")

# CORS 설정 (Express에서만 호출 허용)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(recommend.router)


@app.get("/health")
async def health():
    """헬스 체크"""
    return {"ok": True, "service": "ai-server"}
```

---

### 3-8.실행 방법

```bash
# 가상환경 활성화 후
uvicorn main:app --reload --port 8000

# ✅ INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### ✔️ 자동 생성된 API 문서

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

> 💡 FastAPI는 OpenAPI 문서를 **자동 생성** → 실무 협업에 매우 유리

---

## 4. Express ↔ FastAPI 연결

> Express가 React의 요청을 받아 → FastAPI에 프록시 → 결과 반환

### 4-1. Express 패키지 추가

```bash
cd backend
npm install axios
```

### 4-2. backend/.env (추가)

```bash
PORT=3000
CORS_ORIGIN=http://localhost:5173
AI_SERVER_URL=http://localhost:8000
```

### 4-3. backend/routes/ai.js
이 코드는 Express 백엔드가 FastAPI AI 서버를 대신 호출하는 프록시 라우터입니다.<br>
```txt
React
 ↓
Express Backend /api/ai/recommend
 ↓
FastAPI AI Server /ai/recommend
 ↓
Express가 결과 반환
 ↓
React 화면 출력
```
주요 기능은 2개 입니다. <br>
- POST /api/ai/recommend         일반 AI 추천 요청
- POST /api/ai/recommend/stream  스트리밍 AI 추천 요청

#### Request / Response 예시
**일반 AI 추천 요청** : <br>
```http
POST /api/ai/recommend
Content-Type: application/json
```

```json
{
  "destination": "제주도",
  "days": 3,
  "style": "맛집 중심"
}
```

**응답** : <br>
```json
{
  "ok": true,
  "data": {
    "destination": "제주도",
    "days": 3,
    "recommendations": []
  },
  "cached": false
}
```
**스트리밍 AI 추천 요청** : <br>
```http
POST /api/ai/recommend/stream
Content-Type: application/json
```

```json
{
  "destination": "부산",
  "days": 2,
  "style": "가족 여행"
}
```

**SSE 응답 형태** : <br>
```
data: {"content":"부산 여행 추천을 시작합니다."}

data: {"content":"1일차는 해운대와 광안리를 추천합니다."}

data: {"done":true}
```

####  테스트 방법
**일반 추천 테스트** : <br>
```bash
curl -X POST http://localhost:3000/api/ai/recommend \
  -H "Content-Type: application/json" \
  -d "{\"destination\":\"제주도\",\"days\":3,\"style\":\"맛집 중심\"}"
```
**스트리밍 테스트** : <br>
```bash
curl -N -X POST http://localhost:3000/api/ai/recommend/stream \
  -H "Content-Type: application/json" \
  -d "{\"destination\":\"부산\",\"days\":2,\"style\":\"가족 여행\"}"
```


```javascript
// AI 추천 프록시 라우터
import express from "express";
import axios from "axios";

const router = express.Router();

// 간단한 메모리 캐시 (실무에선 Redis 권장)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

function getAiClient() {
  const aiServerUrl = process.env.AI_SERVER_URL;

  if (!aiServerUrl) {
    const error = new Error("AI_SERVER_URL 환경변수가 설정되지 않았습니다");
    error.status = 500;
    throw error;
  }

  return axios.create({
    baseURL: aiServerUrl,
    timeout: 60000, // LLM은 응답 오래 걸림 (60초)
  });
}

// [POST] /api/ai/recommend - AI 여행 추천
router.post("/recommend", async (req, res, next) => {
  try {
    const { destination, days, style } = req.body;

    // 입력값 검증
    if (!destination || !days) {
      return res.status(400).json({
        ok: false,
        message: "destination, days는 필수입니다",
      });
    }

    // 캐시 키
    const cacheKey = `${destination}-${days}-${style || "자유"}`;

    // 캐시 확인 (비용 절약)
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json({ ok: true, data: cached.data, cached: true });
    }

    // FastAPI 호출
    console.log(`[AI CALL] ${cacheKey}`);
    const aiClient = getAiClient();
    const { data } = await aiClient.post("/ai/recommend", {
      destination,
      days,
      style,
    });

    // 캐시 저장
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json({ ok: true, data, cached: false });
  } catch (err) {
    // FastAPI 에러를 그대로 노출하지 않음 (보안)
    console.error("[AI ERROR]", err.message);

    if (err.code === "ECONNABORTED") {
      return res.status(504).json({
        ok: false,
        message: "AI 서버 응답 지연 (Timeout)",
      });
    }
    if (err.response) {
      return res.status(err.response.status).json({
        ok: false,
        message: "AI 서버 오류",
      });
    }
    next(err);
  }
});

export default router;
```

### 4-4. backend/server.js (라우터 등록 추가)

```javascript
// ... 기존 import
import aiRouter from "./routes/ai.js";

// ... 기존 코드
app.use("/api/trips", tripsRouter);
app.use("/api/ai", aiRouter);  // ← 추가
```

---

### 4-5. 통신 흐름 테스트

```bash
# Express만 호출 → 내부에서 FastAPI까지 가야 함
curl -X POST http://localhost:3000/api/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{"destination":"부산","days":2,"style":"맛집"}'


curl -X POST http://localhost:3000/api/ai/recommend -H "Content-Type: application/json" -d '{"destination":"부산","days":2,"style":"맛집"}'
```

#### 응답 예시

```json
{
  "ok": true,
  "cached": false,
  "data": {
    "title": "부산 2일 맛집 여행",
    "duration": "1박 2일",
    "plan": "Day 1: 해운대 도착 → ...\nDay 2: 광안리 → ...",
    "tokens_used": 1234
  }
}
```

```sh
$ curl -X POST http://localhost:3000/api/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{"destination":"부산","days":2,"style":"맛집"}'
```
```json
{"ok":true,"data":{"title":"�λ� 2일 ���� 여행","duration":"1박 2일","plan":"물론입니다! 
대구에서의 2일 여행 코스를 추천해 드릴게요.\n\n### Day 1: 대구의 역사와 문화 탐방\n\n**오전**\n1. 
**대구 근대골목 탐방**  \n   - 대구의 근대 역사와 문화를 느낄 수 있는 곳으로, 옛 건물과 갤러리가 조화롭게 어우러져 있습니다.\n   
- 시작은 '동성로'에서 하시면 좋습니다.\n\n2. **대구 문화예술회관**  \n   
- 근대골목 에서 도보로 이동하여 대구 문화예술회관을 방문해 보세요. 다양한 전시와 공연이 열리고 있습니다.\n\n
**점심**  \n- **봉산할매국수**  \n  - 대구의 유명한 국수 맛집에서 한 끼 식사를 즐기세요. 
시원한 국물과 쫄깃한 면발이 일품입니다.\n\n**오후**\n3. **대구 동산병원 기념관**  \n   
- 대구의 역사와 의료 발전을 살펴볼 수 있는 곳입니다. 과거와 현재의 의료 역사에 대한 이해를 높일 수 있습니다.\n\n
4. **김광석 다시그리기 길**  \n   - 대구 출신의 유명한 가수 김광석을 기념하기 위해 조성된 거리로, 
다양한 벽화와 작품들이 전시되어 있어 사진 찍기 좋은 장소입니다.\n\n**저녁**  \n- **팔공산한정식**  \n  
- 전통 한정식을 즐길 수 있는 곳에서 대구의 맛을 느껴보세요. 다양한 반찬과 함께 푸짐한 한 끼를 제공받을 수 있습니다.\n\n---\n\n
### Day 2: 자연과 휴식의 시간\n\n**오전**\n1. **팔공산**  \n   - 아침 일찍 팔공산으로 이동하여 하이킹을 즐기세요. 
아름다운 경치와 함께 자연 속에서 힐링할 수 있는 기회를 제공합니다.\n\n2. **동화사**  \n   
- 팔공산의 유명한 사찰인 동화사를 방문하여 고요한 분위기 속에서 마음의 안정을 찾으세요.\n\n
**점심**  \n- **팔공산 두부전골**  \n  - 근처의 두부 전문 식당에서 신선한 두부로 만든 전골을 맛보세요. 
건강하고 맛있는 점심이 될 것입니다.\n\n**오후**\n3. **대구 수목원**  \n   - 다양한 식물과 아름다운 경관을 감상할 수 있는 곳입니다. 
사진을 찍고 산책하기 좋은 장소입니다.\n\n4. **대구타워**  \n   - 마지막으로 대구타워를 방문하여 도시 전경을 감상하세요. 
맑은 날에는 멋진 경치를 볼 수 있습니다.\n\n**저녁**  \n- **대구 막창**  \n  - 여행의 마무리로 대구의  유명한 막창을 맛보세요. 
고소하고 쫄깃한 막창이 일품입니다.\n\n이렇게 대구에서의 2일 여행 코스를 추천드립니다. 즐거운 여행 되세요!",
"tokens_used":814},"cached":false}
```


## 5. React에서 AI 요청 → 응답 표시

### 5-1. src/api/aiApi.js (신규)

```javascript
// AI API 함수
import api from "./axiosInstance";

// 여행 추천 요청
export const recommendTrip = async (payload) => {
  // payload = { destination, days, style }
  const { data } = await api.post("/ai/recommend", payload);
  return data.data; // { title, duration, plan, tokens_used }
};
```

---

### 5-2. src/components/AIRecommendModal.jsx

```jsx
import { useState } from "react";
import { recommendTrip } from "../api/aiApi";

// AI 추천 모달
const AIRecommendModal = ({ onClose, onAccept }) => {
  const [form, setForm] = useState({
    destination: "",
    days: 2,
    style: "맛집",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      setLoading(true);
      const data = await recommendTrip(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "AI 추천 실패");
    } finally {
      setLoading(false);
    }
  };

  // 추천 결과를 카드로 등록
  const handleAccept = () => {
    onAccept({
      title: result.title,
      duration: result.duration,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>🤖 AI 여행 추천</h2>

        <form onSubmit={handleSubmit} className="ai-form">
          <input
            placeholder="여행지 (예: 부산)"
            value={form.destination}
            onChange={(e) =>
              setForm({ ...form, destination: e.target.value })
            }
            required
          />
          <input
            type="number"
            min="1"
            max="14"
            value={form.days}
            onChange={(e) =>
              setForm({ ...form, days: Number(e.target.value) })
            }
          />
          <select
            value={form.style}
            onChange={(e) => setForm({ ...form, style: e.target.value })}
          >
            <option value="맛집">맛집</option>
            <option value="힐링">힐링</option>
            <option value="액티비티">액티비티</option>
            <option value="문화">문화</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "AI 생성 중..." : "추천 받기"}
          </button>
        </form>

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="ai-loading">
            <p>🪄 AI가 일정을 만들고 있어요... (최대 30초)</p>
          </div>
        )}

        {/* 에러 표시 */}
        {error && <p className="error">{error}</p>}

        {/* 결과 표시 */}
        {result && (
          <div className="ai-result">
            <h3>{result.title}</h3>
            <p className="duration">{result.duration}</p>
            <pre className="plan">{result.plan}</pre>
            <small>토큰: {result.tokens_used}</small>

            <div className="modal-actions">
              <button onClick={handleAccept}>이 일정으로 등록</button>
              <button onClick={onClose} className="btn-secondary">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendModal;
```

---

### 5-3. src/App.jsx (AI 버튼 추가)

```jsx
import { useEffect, useState } from "react";
import Header from "./components/Header";
import TripList from "./components/TripList";
import TripForm from "./components/TripForm";
import AIRecommendModal from "./components/AIRecommendModal";  // ← 신규
import { getTrips, createTrip, deleteTrip, getTripById } from "./api/tripApi";
import "./App.css";

function App() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);  // ← 신규

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    /* 기존 코드 동일 */
  };

  const handleCreate = async (payload) => {
    try {
      const newTrip = await createTrip(payload);
      setTrips((prev) => [...prev, newTrip]);
    } catch (err) {
      alert("등록 실패: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    /* 기존 코드 동일 */
  };
  const handleDetail = async (id) => {
    /* 기존 코드 동일 */
  };

  return (
    <>
      <Header />
      <main>
        <div className="actions-bar">
          <button className="btn-ai" onClick={() => setAiOpen(true)}>
            🤖 AI 추천 여행
          </button>
        </div>

        <TripForm onSubmit={handleCreate} />
        {loading && <p className="loading">로딩 중...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <TripList
            trips={trips}
            onDelete={handleDelete}
            onDetail={handleDetail}
          />
        )}
      </main>

      {/* AI 추천 모달 */}
      {aiOpen && (
        <AIRecommendModal
          onClose={() => setAiOpen(false)}
          onAccept={handleCreate}
        />
      )}

      <footer className="footer">
        <p>© 2026 Plan A</p>
      </footer>
    </>
  );
}

export default App;
```

---

### 5-4. App.css 보강분

```css
/* AI 액션 바 */
.actions-bar {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.btn-ai {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.btn-ai:hover {
  transform: translateY(-2px);
}

/* 모달 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 28px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
}

.ai-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.ai-form input,
.ai-form select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.ai-loading {
  text-align: center;
  padding: 30px;
  color: #6366f1;
}

.ai-result {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.ai-result .plan {
  white-space: pre-wrap;
  font-family: 'Pretendard', sans-serif;
  background: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-secondary {
  background-color: #6b7280 !important;
}
```

---

## 6. 스트리밍(SSE) 응답 처리

> 👉 일반 응답: 전체 완성 후 한 번에 → 사용자가 30초 기다림 (UX 나쁨) <br>
> 👉 스트리밍: 토큰 생성되는 즉시 전달 → 즉각적 응답감 (ChatGPT 방식) <br>

### 6-1. SSE(Server-Sent Events) 개념

```
일반: [빈 화면] ----30초---- [전체 결과 한꺼번에]
SSE:  [빈 화면] -1초- [부] -2초- [부산] -3초- [부산 1] ...
```

#### ✔️ SSE Response 헤더

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"chunk": "부산"}

data: {"chunk": " 여행"}

data: [DONE]
```

---

### 6-2. FastAPI 스트리밍 (services/llm_service.py 추가)

```python
async def stream_trip_plan(destination: str, days: int, style: str):
    """LLM 스트리밍 응답 (제너레이터)"""
    prompt = build_prompt(destination, days, style)

    if PROVIDER == "anthropic":
        async with anthropic_client.messages.stream(
            model=ANTHROPIC_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    else:
        stream = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=True,  # 핵심 옵션
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
```

### 6-3. FastAPI 라우터 추가 (routers/recommend.py)

```python
import json
from fastapi.responses import StreamingResponse
from services.llm_service import stream_trip_plan


@router.post("/recommend/stream")
async def recommend_stream(request: RecommendRequest):
    """SSE 스트리밍 추천"""

    async def event_generator():
        try:
            async for chunk in stream_trip_plan(
                request.destination, request.days, request.style or "자유"
            ):
                # SSE 형식: "data: {json}\n\n"
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx 버퍼링 방지
        },
    )
```

---

### 6-4. Express 프록시 (스트리밍 패스스루)

```javascript
// backend/routes/ai.js 추가

router.post("/recommend/stream", async (req, res) => {
  try {
    // SSE 헤더
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // FastAPI에 스트림 요청
    const response = await axios.post(
      `${process.env.AI_SERVER_URL}/ai/recommend/stream`,
      req.body,
      { responseType: "stream", timeout: 0 }  // timeout 0 = 무제한
    );

    // FastAPI 응답을 그대로 클라이언트로 패스
    response.data.pipe(res);

    // 클라이언트가 연결 끊으면 정리
    req.on("close", () => {
      response.data.destroy();
    });
  } catch (err) {
    console.error("[STREAM ERROR]", err.message);
    res.write(`data: ${JSON.stringify({ error: "스트림 실패" })}\n\n`);
    res.end();
  }
});
```

---

### 6-5. React에서 SSE 수신 (fetch + ReadableStream)

```jsx
// AIRecommendModal.jsx 의 streaming 버전 핵심 로직

const handleStream = async (e) => {
  e.preventDefault();
  setStreamingText("");

  try {
    const res = await fetch("/api/ai/recommend/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      // SSE 포맷: "data: {...}\n\n"
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);

        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.chunk) {
            // 점진적으로 화면에 추가
            setStreamingText((prev) => prev + parsed.chunk);
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (err) {
          console.warn("파싱 실패:", payload);
        }
      }
    }
  } catch (err) {
    setError(err.message);
  }
};
```

---


## 7. 에러 / 타임아웃 / 비용 관리

### 7-1. 타임아웃 설정 (계층별)

| 계층 | 타임아웃 | 이유 |
|------|---------|------|
| **React → Express** | 30초 | 사용자 대기 한계 |
| **Express → FastAPI** | 60초 | 일반 / 0초(무제한) 스트림 |
| **FastAPI → LLM** | 모델 SDK 기본값 | OpenAI: 600초 |

```javascript
// React (axios 인스턴스)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});
```

```python
# FastAPI (httpx 사용 시)
import httpx
async with httpx.AsyncClient(timeout=60.0) as client:
    ...
```

---

### 7-2. Rate Limit (Express 미들웨어)

```bash
npm install express-rate-limit
```

```javascript
// backend/server.js
import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 5,               // 사용자당 5회
  message: { ok: false, message: "잠시 후 다시 시도해주세요" },
});

app.use("/api/ai", aiLimiter, aiRouter);
```

> 💡 **Rate Limit이 왜 중요?**
> - LLM 호출은 비싸다 (토큰당 과금)
> - 악성 사용자가 1000번 호출하면 → 수십만 원

---

### 7-3. 비용 추적 (토큰 로깅)

```javascript
// backend/routes/ai.js
const { data } = await aiClient.post("/ai/recommend", payload);

// 토큰 사용량 로깅
console.log(`[BILLING] user=${req.user?.id} tokens=${data.tokens_used}`);

// 실무: DB에 저장 → 일/월 단위 집계
```

---

### 7-4. 에러 분류 가이드

| 에러 | 원인 | 해결 |
|------|------|------|
| `401 Unauthorized` | API 키 잘못/만료 | 키 재발급 |
| `429 Rate Limit` | LLM 호출 한도 초과 | 백오프 + 재시도 |
| `500 Internal Server Error` | LLM 서버 일시 장애 | 재시도 |
| `504 Gateway Timeout` | LLM 응답 지연 | 타임아웃 늘리기 또는 스트리밍 |
| `Context length exceeded` | 프롬프트 너무 김 | 요약 또는 분할 |
| `Insufficient credits` | 결제 잔액 부족 | 충전 |

---

### 7-5. 재시도 로직 (지수 백오프)

```javascript
// utils/retry.js
export const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      // 4xx는 재시도 안 함 (요청 자체가 잘못됨)
      if (err.response?.status < 500) throw err;

      if (i === maxRetries - 1) throw err;

      const delay = Math.pow(2, i) * 1000; // 1초, 2초, 4초
      console.log(`재시도 ${i + 1}/${maxRetries} (${delay}ms 대기)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};
```

---

## 8. 프롬프트 엔지니어링 기초

> 좋은 프롬프트 = 좋은 결과 <br>
> 모델은 바보가 아니지만, **명확한 지시**가 필요하다 <br>

### 8-1. 프롬프트 구조 (실무 표준)

```
[Role]      당신은 ___입니다
[Context]   상황/배경
[Task]      해야 할 일
[Format]    응답 형식
[Constraints] 제약 조건
[Examples]  예시 (선택)
```

### 8-2. 좋은 프롬프트 vs 나쁜 프롬프트

#### 나쁜 예
```
부산 여행 추천해줘
```

#### 좋은 예
```
당신은 한국 여행 가이드입니다.

[요청]
- 여행지: 부산
- 일수: 2일
- 스타일: 맛집

[응답 형식]
Day 1:
- 09:00 ___
- 12:00 ___ (식당)
- ...

[제약]
- 한국어로
- 식당은 실제 존재하는 곳만
- 이동 동선 효율적으로
```

---

### 8-3. JSON 구조화 응답 받기

```python
# 프롬프트에 명시
prompt = """
다음 JSON 형식으로 응답해주세요:
{
  "title": "여행 제목",
  "days": [
    { "day": 1, "schedule": ["09:00 ...", "12:00 ..."] }
  ]
}
"""

# OpenAI: response_format 옵션
response = await openai_client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    response_format={"type": "json_object"},  # ← JSON 강제
)
```

---

### 8-4. 시스템 프롬프트 vs 유저 프롬프트

```python
messages=[
    # System: 모델의 페르소나/역할 (전역 규칙)
    {"role": "system", "content": "당신은 친절한 여행 가이드입니다. 한국어만 사용하세요."},

    # User: 실제 요청 (변동값)
    {"role": "user", "content": "부산 2일 추천"},

    # Assistant: 이전 답변 (대화 이력)
    {"role": "assistant", "content": "Day 1: ..."},

    # User: 후속 질문
    {"role": "user", "content": "맛집 위주로 다시"},
]
```

---


