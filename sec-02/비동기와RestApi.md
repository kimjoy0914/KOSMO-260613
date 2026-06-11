# 비동기 처리 및 REST API연동

### 학습 목표
1. 비동기 처리 방식을 이해한다.
2. REST API를 이용하여 데이터를 주고받는 방법을 이해한다.
3. 비동기 처리 방식을 실제 서비스에 적용할 수 있다.


## 3. 비동기 처리: Promise & async/await

> 👉 비동기 = "결과를 나중에 받는 작업" (네트워크 요청, 파일 읽기 등) <br>
> 👉 JS는 싱글스레드라서 비동기를 잘 다뤄야 한다 <br>

### 3-1. 콜백 → Promise → async/await

```javascript
// 1) 콜백 지옥 (옛날 방식 - 쓰지 말 것)
getUser(1, (user) => {
  getOrders(user.id, (orders) => {
    getDetails(orders[0].id, (details) => {
      console.log(details); // 깊어질수록 지옥
    });
  });
});

// 2) Promise (.then 체이닝)
getUser(1)
  .then((user) => getOrders(user.id))
  .then((orders) => getDetails(orders[0].id))
  .then((details) => console.log(details));

// 3) async/await (실무 표준)
const showDetails = async () => {
  try {
    const user = await getUser(1);
    const orders = await getOrders(user.id);
    const details = await getDetails(orders[0].id);
    console.log(details);
  } catch (err) {
    console.error("에러:", err);
  }
};
```

> 💡 **실무는 100% `async/await` 를 쓴다.**
> `.then` 은 짧은 단발성에서만 사용. <br>

---

### 3-2. Promise 이해

```javascript
// Promise 생성
const myPromise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = true;
    if (success) resolve("성공!");
    else reject("실패");
  }, 1000);
});

// 사용
myPromise
  .then((result) => console.log(result))  // "성공!"
  .catch((err) => console.error(err));
```

#### ✔️ 여러 비동기를 동시에 (Promise.all)

```javascript
// 3개의 API를 동시에 호출 → 가장 늦은 것까지 대기
const [users, orders, products] = await Promise.all([
  fetch("/api/users").then((r) => r.json()),
  fetch("/api/orders").then((r) => r.json()),
  fetch("/api/products").then((r) => r.json()),
]);
```

> 💡 **순차 처리 vs 병렬 처리**
> - `await` 를 줄지어 쓰면 → 순차 (느림) <br>
> - `Promise.all` 쓰면 → 병렬 (빠름) <br>

---

### 3-3. try-catch 에러 처리

```javascript
const fetchUser = async (id) => {
  try {
    const res = await fetch(`/api/users/${id}`);

    if (!res.ok) {
      // 4xx, 5xx 응답은 fetch가 throw 하지 않음 → 직접 체크
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("사용자 조회 실패:", err.message);
    throw err; // 상위로 다시 던질지 결정
  }
};
```

> 💡 **fetch 함정**
> - 네트워크 오류만 reject → catch에 들어감 <br>
> - 404, 500 같은 HTTP 에러는 **resolve 됨** → `res.ok` 직접 체크 필수 <br>

---

## 4. Fetch API로 백엔드 호출

> 👉 Fetch API = 브라우저 내장 HTTP 클라이언트 <br>
> 👉 별도 설치 없이 사용 가능 <br>

### 4-1. GET 요청

```javascript
const getTrips = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/trips", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.error("여행 목록 조회 실패:", err);
  }
};
```

#### ✔️ 응답 구조 예시

```json
{
  "ok": true,
  "data": [
    { "id": 1, "title": "부산 여행", "duration": "2박 3일" },
    { "id": 2, "title": "제주 여행", "duration": "3박 4일" }
  ]
}
```

---

### 4-2. POST 요청 (JSON 전송)

```javascript
const createTrip = async (newTrip) => {
  try {
    const res = await fetch("http://localhost:3000/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTrip), // 객체를 JSON 문자열로 변환
    });

    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.message || "요청 실패");
    }

    return await res.json();
  } catch (err) {
    console.error("여행 등록 실패:", err);
    throw err;
  }
};

// 호출
createTrip({ title: "여수 여행", duration: "2박 3일" });
```

#### ✔️ 요청 / 응답 구조

```http
POST /api/trips HTTP/1.1
Content-Type: application/json

{
  "title": "여수 여행",
  "duration": "2박 3일"
}
```

```json
{
  "ok": true,
  "data": {
    "id": 4,
    "title": "여수 여행",
    "duration": "2박 3일",
    "createdAt": "2026-05-06T10:00:00Z"
  }
}
```

---

### 4-3. PUT / DELETE 요청

```javascript
// PUT - 수정
const updateTrip = async (id, payload) => {
  const res = await fetch(`http://localhost:3000/api/trips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

// DELETE - 삭제
const deleteTrip = async (id) => {
  const res = await fetch(`http://localhost:3000/api/trips/${id}`, {
    method: "DELETE",
  });
  if (res.status === 204) return true; // No Content
  return res.json();
};
```

---

### 4-4. 인증 토큰 포함 (실무 표준)

```javascript
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("accessToken");

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // JWT 토큰
    },
  });
};
```

---

## 5. Express.js 백엔드 만들기

> 👉 Express = Node.js 가장 가벼운 웹 프레임워크 <br>
> 👉 빠른 프로토타입에 최적 <br>

### 5-1. 프로젝트 세팅

```bash
# 1) 폴더 생성
mkdir trip-flow
cd trip-flow

# 2) package.json 생성
npm init -y

# 3) Express 및 필수 패키지 설치
npm install express cors dotenv

# 4) 개발용 (자동 재시작)
npm install -D nodemon
```

#### ✔️ package.json 수정

```json
{
  "name": "trip-api",
  "version": "1.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

> 💡 `"type": "module"` 추가 → ES Module(`import/export`) 사용 가능

---

### 5-2. 서버 기본 코드

#### 📁 파일 구조

```
trip-flow/
 ├── server.js
 ├── routes/
 │   └── trips.js
 ├── .env
 └── package.json
```

#### 📄 .env

```
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5500
```

#### 📄 server.js

```javascript
// Express 서버 진입점
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import tripsRouter from "./routes/trips.js";

dotenv.config(); // .env 파일 로드

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 (프론트엔드와 통신 허용)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // 운영 시 정확한 도메인만
    credentials: true,
  })
);

// JSON 파싱 미들웨어
app.use(express.json());

// 요청 로깅 (개발용)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 라우터 연결
app.use("/api/trips", tripsRouter);

// 헬스 체크
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is running" });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Not Found" });
});

// 글로벌 에러 핸들러 (실무 필수)
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

#### 📄 routes/trips.js
아래 코드는 여행 정보 CRUD 라우터 입니다. <br>
- GET    /api/trips       전체 여행 조회
- GET    /api/trips/:id   특정 여행 조회
- POST   /api/trips       여행 생성
- PUT    /api/trips/:id   여행 수정
- DELETE /api/trips/:id   여행 삭제

현재는 DB가 아니라 trips배열에 데이터를 임시 저장합니다. <br>
그래서 서버를 재시작하면 데이터는 초기화 됩니다. <br>

테스트 방법 :
```txt
전체 조회 :
curl http://localhost:3000/api/trips

단건 조회 :
curl http://localhost:3000/api/trips/1

생성 :
curl -X POST http://localhost:3000/api/trips -H "Content-Type: application/json" -d '{"title": "서울 여행", "duration": "1박 2일"}'

수정 :
curl -X PUT http://localhost:3000/api/trips/1 -H "Content-Type: application/json" -d '{"title": "서울 여행", "duration": "1박 2일"}'

삭제 :
curl -X DELETE http://localhost:3000/api/trips/1
```


```javascript
// 여행 정보 라우터
import express from "express";

const router = express.Router();

// 메모리 임시 저장소 (실무에선 DB)
let trips = [
  { id: 1, title: "부산 여행", duration: "2박 3일" },
  { id: 2, title: "제주 여행", duration: "3박 4일" },
  { id: 3, title: "강릉 여행", duration: "1박 2일" },
];
let nextId = 4;

// [GET] /api/trips - 전체 조회
router.get("/", (req, res) => {
  res.json({ ok: true, data: trips });
});

// [GET] /api/trips/:id - 단건 조회
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const trip = trips.find((t) => t.id === id);

  if (!trip) {
    return res.status(404).json({ ok: false, message: "여행 정보를 찾을 수 없습니다" });
  }
  res.json({ ok: true, data: trip });
});

// [POST] /api/trips - 생성
router.post("/", (req, res) => {
  const { title, duration } = req.body;

  // 입력값 검증 (실무 필수)
  if (!title || !duration) {
    return res.status(400).json({
      ok: false,
      message: "title과 duration은 필수입니다",
    });
  }

  const newTrip = {
    id: nextId++,
    title,
    duration,
    createdAt: new Date().toISOString(),
  };
  trips.push(newTrip);

  res.status(201).json({ ok: true, data: newTrip });
});

// [PUT] /api/trips/:id - 수정
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = trips.findIndex((t) => t.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, message: "Not Found" });
  }

  trips[idx] = { ...trips[idx], ...req.body };
  res.json({ ok: true, data: trips[idx] });
});

// [DELETE] /api/trips/:id - 삭제
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = trips.findIndex((t) => t.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, message: "Not Found" });
  }

  trips.splice(idx, 1);
  res.status(204).send(); // 204 No Content
});

export default router;
```

#### ▶️ 실행 방법

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 정상 동작 확인
curl http://localhost:3000/health
curl http://localhost:3000/api/trips
```

---

## 6. CORS 개념과 해결

> 👉 CORS = **Cross-Origin Resource Sharing** (다른 출처 자원 공유) <br>
> 👉 브라우저가 **다른 도메인 API 호출** 을 막는 보안 정책 <br>

### 6-1. CORS 에러는 왜 생기나?

| 프론트 | 백엔드 | CORS? |
|--------|--------|-------|
| `http://localhost:5500` | `http://localhost:3000` | ❌ **에러** (포트 다름) |
| `http://localhost:3000` | `http://localhost:3000` | ✅ OK |
| `https://my.com` | `https://api.my.com` | ❌ **에러** (서브도메인 다름) |

#### ✔️ 에러 메시지 예시 (콘솔)

```
Access to fetch at 'http://localhost:3000/api/trips'
from origin 'http://127.0.0.1:5500' has been blocked
by CORS policy: No 'Access-Control-Allow-Origin' header...
```

> 💡 **CORS는 브라우저가 막는 것**
> Postman, curl 같은 도구는 CORS 적용 안 됨 → 프론트에서만 발생 <br>

---

### 6-2. 해결 방법 (Express)

#### ✔️ 1) cors 미들웨어 (실무 표준)

```javascript
import cors from "cors";

// 모든 도메인 허용 (개발용)
app.use(cors());

// 특정 도메인만 허용 (운영 시)
app.use(
  cors({
    origin: ["http://localhost:5500", "https://my-frontend.com"],
    credentials: true, // 쿠키 포함 시 필수
  })
);
```
