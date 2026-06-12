from pydantic import BaseModel, Field
from typing import Optional

# RecommendRequest는 입력 검증용 입니다. 
class RecommendRequest(BaseModel):
    """
    여행 추천 요청 모델

    FastAPI에서 클라이언트 요청 body를 검증할 때 사용한다.

    요청 예:
    {
        "destination": "제주도",
        "days": 3,
        "style": "맛집"
    }
    """

    # 여행지
    # 필수값(...)
    # 최소 1글자, 최대 50글자
    destination: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="여행지"
    )

    # 여행 일수
    # 필수값(...)
    # 1일 이상, 30일 이하만 허용
    days: int = Field(
        ...,
        ge=1,
        le=30,
        description="여행 일수"
    )

    # 여행 스타일
    # 선택값
    # 값이 없으면 기본값으로 "자유" 사용
    style: Optional[str] = Field(
        "자유",
        description="여행 스타일 (힐링/액티비티/맛집 등)"
    )


class RecommendResponse(BaseModel):
    """
    여행 추천 응답 모델

    FastAPI가 Express 백엔드로 반환하는 JSON 구조를 정의한다.

    응답 예:
    {
        "title": "제주도 3일 여행 추천",
        "duration": "3일",
        "plan": "1일차: ...",
        "tokens_used": 320
    }
    """

    # 추천 결과 제목
    title: str

    # 여행 기간 표시값
    # 예: "3일", "2박 3일"
    duration: str

    # AI가 생성한 여행 계획 본문
    plan: str

    # AI 모델 사용량 추적용 토큰 수
    # 비용 계산이나 사용량 통계에 활용 가능
    tokens_used: int