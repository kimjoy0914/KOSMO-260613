// AI 추천 프록시 라우터
// React가 FastAPI를 직접 호출하지 않고,
// Express 백엔드를 통해 AI 서버에 요청하도록 중간 프록시 역할을 한다.

import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * 간단한 메모리 캐시
 *
 * 동일한 destination, days, style 요청이 반복되면
 * FastAPI를 다시 호출하지 않고 캐시 데이터를 반환한다.
 *
 * 주의:
 * 서버 재시작 시 캐시가 모두 사라진다.
 * 서버가 여러 대이면 캐시가 공유되지 않는다.
 *
 * 실무에서는 Redis 캐시 권장.
 */
const cache = new Map();

/**
 * 캐시 유지 시간
 *
 * 5 * 60 * 1000
 * = 5분
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * FastAPI 호출용 Axios Client 생성 함수
 *
 * AI_SERVER_URL은 .env에 있어야 한다.
 *
 * 예:
 * AI_SERVER_URL=http://localhost:5000
 */
function getAiClient() {
  const aiServerUrl = process.env.AI_SERVER_URL;

  /**
   * AI 서버 주소가 없으면 서버 설정 오류
   *
   * 이 에러는 라우터 catch에서 next(err)로 넘어가고,
   * server.js의 글로벌 에러 핸들러에서 처리된다.
   */
  if (!aiServerUrl) {
    const error = new Error("AI_SERVER_URL 환경변수가 설정되지 않았습니다");
    error.status = 500;
    throw error;
  }

  /**
   * Axios 인스턴스 생성
   *
   * baseURL:
   * - FastAPI 서버 주소
   *
   * timeout:
   * - LLM 응답은 오래 걸릴 수 있으므로 60초 설정
   */
  return axios.create({
    baseURL: aiServerUrl,
    timeout: 60000,
  });
}

/**
 * [POST] /api/ai/recommend
 *
 * AI 여행 추천 API
 *
 * React 요청 URL:
 * POST http://localhost:3000/api/ai/recommend
 *
 * Express가 내부적으로 호출하는 FastAPI URL:
 * POST http://localhost:5000/ai/recommend
 *
 * Request Body:
 * {
 *   "destination": "제주도",
 *   "days": 3,
 *   "style": "맛집 중심"
 * }
 */
router.post("/recommend", async (req, res, next) => {
  try {
    const { destination, days, style } = req.body;

    /**
     * 입력값 검증
     *
     * destination: 여행지
     * days: 여행 일수
     *
     * style은 선택값으로 처리한다.
     */
    if (!destination || !days) {
      return res.status(400).json({
        ok: false,
        message: "destination, days는 필수입니다",
      });
    }

    /**
     * 캐시 키 생성
     *
     * 같은 여행지, 같은 일수, 같은 여행 스타일이면
     * 같은 추천 결과를 재사용한다.
     */
    const cacheKey = `${destination}-${days}-${style || "자유"}`;

    /**
     * 캐시 조회
     *
     * 캐시가 존재하고,
     * 저장된 시간이 CACHE_TTL보다 오래되지 않았으면 캐시 반환
     */
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] ${cacheKey}`);

      return res.json({
        ok: true,
        data: cached.data,
        cached: true,
      });
    }

    /**
     * 캐시가 없거나 만료된 경우 FastAPI 호출
     */
    console.log(`[AI CALL] ${cacheKey}`);

    const aiClient = getAiClient();

    const { data } = await aiClient.post("/ai/recommend", {
      destination,
      days,
      style,
    });

    /**
     * FastAPI 응답 결과를 캐시에 저장
     */
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    /**
     * React로 AI 추천 결과 반환
     */
    res.json({
      ok: true,
      data,
      cached: false,
    });
  } catch (err) {
    /**
     * AI 서버 에러 처리
     *
     * FastAPI 내부 에러 상세를 그대로 노출하면
     * 보안상 좋지 않기 때문에 일반 메시지로 변환한다.
     */
    console.error("[AI ERROR]", err.message);

    /**
     * Axios timeout 발생 시
     *
     * timeout: 60000을 초과하면 ECONNABORTED 발생
     */
    if (err.code === "ECONNABORTED") {
      return res.status(504).json({
        ok: false,
        message: "AI 서버 응답 지연 (Timeout)",
      });
    }

    /**
     * FastAPI가 응답은 했지만 4xx 또는 5xx를 반환한 경우
     */
    if (err.response) {
      return res.status(err.response.status).json({
        ok: false,
        message: "AI 서버 오류",
      });
    }

    /**
     * 그 외 예상하지 못한 에러는
     * Express 글로벌 에러 핸들러로 전달
     */
    next(err);
  }
});

/**
 * [POST] /api/ai/recommend/stream
 *
 * AI 여행 추천 스트리밍 API
 *
 * 일반 JSON 응답이 아니라,
 * Server-Sent Events 방식으로 토큰 또는 문장을 순차 전송한다.
 *
 * React 요청 URL:
 * POST http://localhost:3000/api/ai/recommend/stream
 *
 * Express가 내부적으로 호출하는 FastAPI URL:
 * POST http://localhost:5000/ai/recommend/stream
 */
router.post("/recommend/stream", async (req, res) => {
  try {
    /**
     * SSE 응답 헤더 설정
     *
     * Content-Type: text/event-stream
     * - 클라이언트에게 스트리밍 응답임을 알린다.
     *
     * Cache-Control: no-cache
     * - 중간 캐시를 막는다.
     *
     * Connection: keep-alive
     * - 연결을 유지하면서 데이터를 계속 보낸다.
     */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    /**
     * FastAPI 스트림 엔드포인트 호출
     *
     * responseType: "stream"
     * - Axios가 응답을 한 번에 받지 않고 스트림으로 처리한다.
     *
     * timeout: 0
     * - 스트리밍은 오래 유지될 수 있으므로 timeout 제한을 제거한다.
     */
    const response = await axios.post(
      `${process.env.AI_SERVER_URL}/ai/recommend/stream`,
      req.body,
      {
        responseType: "stream",
        timeout: 0,
      }
    );

    /**
     * FastAPI에서 받은 스트림을
     * Express 응답 스트림으로 그대로 연결한다.
     *
     * 즉,
     * FastAPI -> Express -> React
     * 형태로 데이터가 흘러간다.
     */
    response.data.pipe(res);

    /**
     * 클라이언트가 브라우저 새로고침, 페이지 이동 등으로 연결을 끊으면
     * FastAPI 스트림도 함께 종료한다.
     */
    req.on("close", () => {
      response.data.destroy();
    });
  } catch (err) {
    /**
     * 스트림 처리 중 오류 발생
     *
     * 이미 SSE 연결을 시작했을 가능성이 있으므로
     * JSON 응답 대신 SSE 형식으로 에러 메시지를 보낸다.
     */
    console.error("[STREAM ERROR]", err.message);

    res.write(
      `data: ${JSON.stringify({
        error: "스트림 실패",
      })}\n\n`
    );

    res.end();
  }
});

export default router;

/***********************************************
Express 백엔드가 FastAPI AI 서버를 대신 호출하는 프록시 라우터입니다.
React
 ↓
Express Backend /api/ai/recommend
 ↓
FastAPI AI Server /ai/recommend
 ↓
Express가 결과 반환
 ↓
React 화면 출력

주요 기능은 2개 입니다.
POST /api/ai/recommend         일반 AI 추천 요청
POST /api/ai/recommend/stream  스트리밍 AI 추천 요청



**********************************************/

