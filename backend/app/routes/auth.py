from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user.
    Checks for email uniqueness and hashes the password before persistence.
    """
    # Normalize email to lowercase
    email_normalized = user_in.email.lower()
    
    existing_user = db.query(User).filter(User.email == email_normalized).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Generate password hash
    hashed_password = get_password_hash(user_in.password)
    
    new_user = User(
        name=user_in.name,
        email=email_normalized,
        password_hash=hashed_password,
        role=user_in.role or "user"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Logs in an existing user.
    Validates password hash and returns JWT access token along with user details.
    """
    # Normalize email
    email_normalized = credentials.email.lower()
    
    user = db.query(User).filter(User.email == email_normalized).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Create Access Token containing user's UUID in the 'sub' claim
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
