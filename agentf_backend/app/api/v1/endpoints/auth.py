from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()
security = HTTPBearer(auto_error=False)

def verify_tenant_access(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = request.query_params.get("token")
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
        
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        tenant_id = payload.get("sub")
        if not tenant_id:
            raise HTTPException(status_code=401, detail="Invalid tenant context")
        return tenant_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
