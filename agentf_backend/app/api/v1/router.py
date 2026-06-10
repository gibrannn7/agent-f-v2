from fastapi import APIRouter
from app.api.v1.endpoints import auth, pipeline, workspace

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
