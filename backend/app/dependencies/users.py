from fastapi import Depends
from app.models.user import User
from app.core.security import get_current_user as core_get_current_user, require_role as core_require_role

def get_current_user(current: User = Depends(core_get_current_user)) -> User:
    return current

def require_role(*roles: str):
    return core_require_role(*roles)
