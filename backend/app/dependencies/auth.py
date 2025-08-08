from fastapi import Depends, HTTPException, status
from app.dependencies.users import get_current_user
from app.models.user import User

def require_role(*roles):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав"
            )
        return user
    return role_checker
