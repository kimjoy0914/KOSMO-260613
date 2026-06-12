from fastapi import APIRouter, HTTPException
from models.schemas import RecommendRequest, RecommendResponse
from services.llm_service import generate_trip_plan, stream_trip_plan
import json
from fastapi.responses import StreamingResponse

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