"""Auth routes"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, AuditLog
from app.security.auth import verify_password, create_access_token, get_current_user
from app.schemas import LoginRequest, LoginResponse, UserOut, UserCreate
from app.security.auth import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _log(db, event, user_id=None, description=None, org_id=None):
    db.add(AuditLog(event_type=event, user_id=user_id, description=description, org_id=org_id))


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    user.last_login = datetime.now(timezone.utc)
    _log(db, "LOGIN", user.id, f"User {user.email} logged in", user.org_id)
    db.commit()
    
    token = create_access_token({"sub": user.id, "org_id": user.org_id, "role": user.role})
    return LoginResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/users", response_model=UserOut)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        org_id=current_user.org_id,
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
        role=data.role,
        department=data.department,
    )
    db.add(user)
    _log(db, "USER_CREATED", current_user.id, f"Created user {data.email}", current_user.org_id)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.org_id == current_user.org_id).all()
    return [UserOut.model_validate(u) for u in users]
