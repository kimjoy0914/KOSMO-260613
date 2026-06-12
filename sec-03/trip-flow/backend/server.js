// Express 서버 진입점 파일
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 여행 관련 API 라우터
import tripsRouter from "./routes/trips.js";

// AI 서버 연동 관련 API 라우터
import aiRouter from "./routes/ai.js";

// .env 파일에 정의된 환경변수 로드
dotenv.config();

// Express 애플리케이션 생성
const app = express();

// 서버 포트 설정
// .env에 PORT가 있으면 사용하고, 없으면 3000번 사용
const PORT = process.env.PORT || 3000;

/**
 * CORS 설정
 * React 프론트엔드에서 Express 백엔드 API 호출을 허용하기 위한 설정
 *
 * 개발 환경:
 * CORS_ORIGIN=http://localhost:5173
 *
 * 운영 환경:
 * CORS_ORIGIN=https://your-domain.com
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",

    // 쿠키, 인증 헤더 등을 포함한 요청 허용
    // 단, origin: "*" 와 credentials: true 조합은 운영에서 부적절할 수 있음
    credentials: true,
  })
);

/**
 * JSON 요청 본문 파싱 미들웨어
 *
 * 클라이언트가 다음과 같이 JSON을 보내면:
 * {
 *   "title": "제주도 여행",
 *   "days": 3
 * }
 *
 * req.body에서 바로 접근 가능하게 해준다.
 */
app.use(express.json());

/**
 * 요청 로깅 미들웨어
 * 모든 요청마다 요청 시간, HTTP 메서드, URL을 출력한다.
 *
 * 예:
 * [2026-05-07T01:20:00.000Z] GET /api/trips
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 다음 미들웨어 또는 라우터로 요청 전달
  next();
});

/**
 * 여행 API 라우터 연결
 *
 * 실제 요청 예:
 * GET    /api/trips
 * POST   /api/trips
 * GET    /api/trips/:id
 */
app.use("/api/trips", tripsRouter);

/**
 * AI API 라우터 연결
 *
 * 실제 요청 예:
 * POST /api/ai/analyze
 * POST /api/ai/recommend
 *
 * 내부적으로 FastAPI AI 서버와 통신하는 구조로 설계 가능
 */
app.use("/api/ai", aiRouter);

/**
 * 헬스 체크 API
 * 서버가 정상 실행 중인지 확인하는 용도
 *
 * 요청:
 * GET /health
 *
 * 응답:
 * {
 *   "ok": true,
 *   "message": "Server is running"
 * }
 */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Server is running",
  });
});

/**
 * 404 Not Found 핸들러
 * 위에서 등록한 라우터에 매칭되지 않는 요청 처리
 *
 * 예:
 * GET /wrong-url
 */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Not Found",
  });
});

/**
 * 글로벌 에러 핸들러
 *
 * 라우터나 서비스에서 next(error)를 호출하면 여기서 최종 처리된다.
 *
 * 주의:
 * Express 에러 핸들러는 반드시 매개변수 4개를 가져야 한다.
 * (err, req, res, next)
 */
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error",
  });
});

/**
 * 서버 실행
 * 지정된 PORT에서 HTTP 서버를 시작한다.
 */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});


/********************************************** 
이 코드는 Express 백엔드 서버의 진입점 입니다. 
전체 흐름은 다음과 같습니다. 

.env 로드
↓
Express 앱 생성
↓
CORS 설정
↓
JSON 요청 body 파싱
↓
요청 로그 출력
↓
API 라우터 연결
↓
/health 헬스체크
↓
404 처리
↓
글로벌 에러 처리
↓
서버 실행
**********************************************/