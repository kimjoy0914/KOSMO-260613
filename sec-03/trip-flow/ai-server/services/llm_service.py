import os
from openai import AsyncOpenAI
#from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

# 클라이언트 초기화
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
#anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROVIDER = os.getenv("LLM_PROVIDER", "openai")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
#ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def build_prompt(destination: str, days: int, style: str) -> str:
    """프롬프트 조립 (프롬프트 엔지니어링 핵심)"""
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
    """OpenAI API 호출 (비동기)"""
    response = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "당신은 친절한 한국 여행 가이드입니다."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,  # 창의성 조절 (0=결정적, 1=다양함)
        max_tokens=1500,
    )
    content = response.choices[0].message.content
    tokens = response.usage.total_tokens
    return content, tokens


async def call_anthropic(prompt: str) -> tuple[str, int]:
    """Anthropic Claude API 호출"""
    response = await anthropic_client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1500,
        system="당신은 친절한 한국 여행 가이드입니다.",
        messages=[{"role": "user", "content": prompt}],
    )
    content = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens
    return content, tokens


async def generate_trip_plan(destination: str, days: int, style: str) -> dict:
    """공통 진입점 - provider에 따라 분기"""
    prompt = build_prompt(destination, days, style)

    if PROVIDER == "anthropic":
        content, tokens = await call_anthropic(prompt)
    else:
        content, tokens = await call_openai(prompt)

    return {
        "title": f"{destination} {days}일 {style} 여행",
        "duration": f"{days-1}박 {days}일",
        "plan": content,
        "tokens_used": tokens,
    }

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