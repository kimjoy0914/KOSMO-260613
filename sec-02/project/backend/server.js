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