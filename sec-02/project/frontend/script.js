// 백엔드 API URL (환경별 분리)
const API_BASE = "http://localhost:3000/api";

// DOM 요소 캐싱
const container = document.querySelector(".container");
const addForm = document.querySelector("#addTripForm");

// =====================
// 1) 여행 목록 불러오기
// =====================
const loadTrips = async () => {
  try {
    const res = await fetch(`${API_BASE}/trips`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { data } = await res.json();
    renderTrips(data);
  } catch (err) {
    console.error("[loadTrips]", err);
    container.innerHTML = `<p>데이터를 불러올 수 없습니다 😢</p>`;
  }
};

// =====================
// 2) 카드 렌더링
// =====================
const renderTrips = (trips) => {
  container.innerHTML = ""; // 초기화

  trips.forEach((trip) => {
    const card = document.createElement("article");
    card.classList.add("card");
    card.dataset.id = trip.id; // data-id="1"
    card.innerHTML = `
      <h2>${trip.title}</h2>
      <p>${trip.duration}</p>
      <button class="btn-detail" type="button">상세보기</button>
      <button class="btn-delete" type="button">삭제</button>
    `;
    container.appendChild(card);
  });
};

// =====================
// 3) 이벤트 위임 (상세보기 / 삭제)
// =====================
container.addEventListener("click", async (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.classList.contains("btn-detail")) {
    await showDetail(id);
  }
  if (e.target.classList.contains("btn-delete")) {
    await deleteTrip(id);
  }
});

// =====================
// 4) 상세 조회
// =====================
const showDetail = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/trips/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    alert(`[${data.title}]\n기간: ${data.duration}`);
  } catch (err) {
    alert("상세 조회 실패");
  }
};

// =====================
// 5) 삭제
// =====================
const deleteTrip = async (id) => {
  if (!confirm("삭제하시겠습니까?")) return;

  try {
    const res = await fetch(`${API_BASE}/trips/${id}`, { method: "DELETE" });
    if (res.status !== 204) throw new Error("삭제 실패");
    await loadTrips(); // 목록 새로고침
  } catch (err) {
    alert("삭제 실패: " + err.message);
  }
};

// =====================
// 6) 새 여행 등록 (폼 제출)
// =====================
addForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // 새로고침 방지

  const formData = new FormData(addForm);
  const payload = {
    title: formData.get("title"),
    duration: formData.get("duration"),
  };

  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }

    addForm.reset();    // 폼 초기화
    await loadTrips();  // 목록 새로고침
  } catch (err) {
    alert("등록 실패: " + err.message);
  }
});

// =====================
// 7) 페이지 로드 시 자동 실행
// =====================
document.addEventListener("DOMContentLoaded", loadTrips);