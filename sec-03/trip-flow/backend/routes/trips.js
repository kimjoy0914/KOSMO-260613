// 여행 정보 라우터 파일
// server.js 또는 app.js에서 app.use("/api/trips", tripsRouter)로 연결된다.

import express from "express";

// Express Router 생성
// 라우터는 특정 URL 그룹을 분리해서 관리할 때 사용한다.
const router = express.Router();

/**
 * 메모리 기반 임시 저장소
 *
 * 실무에서는 이 배열 대신 DB를 사용한다.
 * 예:
 * - Oracle
 * - MySQL
 * - PostgreSQL
 * - MongoDB
 */
let trips = [
  { id: 1, title: "부산 여행", duration: "2박 3일" },
  { id: 2, title: "제주 여행", duration: "3박 4일" },
  { id: 3, title: "강릉 여행", duration: "1박 2일" },
];

/**
 * 다음 여행 ID 값
 *
 * 새 여행을 생성할 때 id로 사용된다.
 * 현재 1, 2, 3번이 있으므로 다음 번호는 4부터 시작한다.
 *
 * 실무에서는 DB 시퀀스, AUTO_INCREMENT, UUID 등을 사용한다.
 */
let nextId = 4;

/**
 * [GET] /api/trips
 *
 * 전체 여행 목록 조회 API
 *
 * 최종 URL:
 * GET http://localhost:3000/api/trips
 */
router.get("/", (req, res) => {
  res.json({
    ok: true,
    data: trips,
  });
});

/**
 * [GET] /api/trips/:id
 *
 * 여행 단건 조회 API
 *
 * 예:
 * GET /api/trips/1
 *
 * req.params.id는 문자열이므로 Number로 변환한다.
 */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  // trips 배열에서 id가 일치하는 여행 찾기
  const trip = trips.find((t) => t.id === id);

  // 해당 id의 여행이 없으면 404 반환
  if (!trip) {
    return res.status(404).json({
      ok: false,
      message: "여행 정보를 찾을 수 없습니다",
    });
  }

  // 조회 성공 응답
  res.json({
    ok: true,
    data: trip,
  });
});

/**
 * [POST] /api/trips
 *
 * 여행 생성 API
 *
 * 요청 body 예:
 * {
 *   "title": "서울 여행",
 *   "duration": "1박 2일"
 * }
 */
router.post("/", (req, res) => {
  const { title, duration } = req.body;

  /**
   * 입력값 검증
   *
   * title 또는 duration이 없으면 400 Bad Request 반환
   */
  if (!title || !duration) {
    return res.status(400).json({
      ok: false,
      message: "title과 duration은 필수입니다",
    });
  }

  // 새 여행 객체 생성
  const newTrip = {
    id: nextId++,
    title,
    duration,

    // 생성 시각 저장
    createdAt: new Date().toISOString(),
  };

  // 메모리 배열에 추가
  trips.push(newTrip);

  // 생성 성공 응답
  res.status(201).json({
    ok: true,
    data: newTrip,
  });
});

/**
 * [PUT] /api/trips/:id
 *
 * 여행 수정 API
 *
 * 요청 body 예:
 * {
 *   "title": "부산 맛집 여행",
 *   "duration": "3박 4일"
 * }
 */
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);

  // 수정할 여행의 배열 index 찾기
  const idx = trips.findIndex((t) => t.id === id);

  // 대상 데이터가 없으면 404 반환
  if (idx === -1) {
    return res.status(404).json({
      ok: false,
      message: "Not Found",
    });
  }

  /**
   * 기존 데이터와 요청 body를 병합
   *
   * 주의:
   * 현재 코드는 req.body의 모든 값을 그대로 덮어쓴다.
   * 실무에서는 수정 가능한 필드만 허용해야 한다.
   * trips[idx] = {
      ...trips[idx],
      title: req.body.title ?? trips[idx].title,
      duration: req.body.duration ?? trips[idx].duration,
      updatedAt: new Date().toISOString(),
    };
   */
  trips[idx] = {
    ...trips[idx],
    ...req.body,
  };

  res.json({
    ok: true,
    data: trips[idx],
  });
});

/**
 * [DELETE] /api/trips/:id
 *
 * 여행 삭제 API
 *
 * 예:
 * DELETE /api/trips/1
 */
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  // 삭제할 여행 index 찾기
  const idx = trips.findIndex((t) => t.id === id);

  // 삭제 대상이 없으면 404 반환
  if (idx === -1) {
    return res.status(404).json({
      ok: false,
      message: "Not Found",
    });
  }

  // 배열에서 해당 여행 제거
  trips.splice(idx, 1);

  /**
   * 204 No Content
   *
   * 삭제는 성공했지만 응답 body는 보내지 않는다.
   */
  res.status(204).send();
});

// server.js에서 import해서 사용할 수 있도록 export
export default router;


/***********************************************
 * 이 코드는 여행 정보 CRUD 라우터 입니다. 
GET    /api/trips       전체 여행 조회
GET    /api/trips/:id   특정 여행 조회
POST   /api/trips       여행 생성
PUT    /api/trips/:id   여행 수정
DELETE /api/trips/:id   여행 삭제

현재는 DB가 아니라 trips배열에 데이터를 임시 저장합니다.
그래서 서버를 재시작하면 데이터는 초기화 됩니다. 

테스트 방법:
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


**********************************************/