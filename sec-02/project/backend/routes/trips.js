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