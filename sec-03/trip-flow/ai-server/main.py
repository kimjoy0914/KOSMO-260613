import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import recommend

load_dotenv()

app = FastAPI(title="AI Server", version="1.0.0")

# CORS 설정 (Express에서만 호출 허용)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# 라우터 등록
app.include_router(recommend.router)


@app.get("/health")
async def health():
  """헬스 체크"""
  return {"ok": True, "service": "ai-server"}