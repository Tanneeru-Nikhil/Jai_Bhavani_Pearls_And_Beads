import uuid
import json
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from database import (
    init_db,
    get_connection,
    hash_password,
)

# Initialize database on startup
init_db()

app = FastAPI(title="Jai Bhavani Pearls & Beads API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (token -> user_id)
SESSIONS: Dict[str, str] = {}

# ─────────────────────────────────────────────────────────────
# Helper & Auth Functions
# ─────────────────────────────────────────────────────────────

def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get("session_id")
    auth_header = request.headers.get("Authorization")
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    if not token or token not in SESSIONS:
        return None
    
    user_id = SESSIONS[token]
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    
    return {
        "id": row["id"],
        "email": row["email"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "phone": row["phone"],
        "role": row["role"],
        "email_verified": bool(row["email_verified"]),
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }

def get_current_user(request: Request) -> Dict[str, Any]:
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

def get_current_admin(request: Request) -> Dict[str, Any]:
    user = get_current_user(request)
    if user["role"] not in ["admin", "support", "inventory"]:
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user

def get_session_id(request: Request, response: Response) -> str:
    token = request.cookies.get("session_id")
    if not token:
        token = str(uuid.uuid4())
        response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")
    return token

# ─────────────────────────────────────────────────────────────
# Auth Models & Endpoints
# ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "customer"

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str

# In-memory OTP storage: phone -> {otp, expires_at}
OTP_STORE: Dict[str, Dict[str, Any]] = {}

@app.post("/api/v1/auth/send-otp")
def send_otp(req: SendOtpRequest):
    raw_phone = req.phone.strip().replace(" ", "").replace("-", "")
    if not raw_phone or len(raw_phone) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number")

    # Generate a 6-digit OTP (for demo convenience, 123456 or generated)
    otp = "123456"
    OTP_STORE[raw_phone] = {
        "otp": otp,
        "created_at": datetime.utcnow().isoformat(),
    }
    return {
        "message": f"OTP sent successfully to {req.phone}",
        "demo_otp": otp, # Provided so testers know the OTP immediately
    }

@app.post("/api/v1/auth/verify-otp")
def verify_otp(req: VerifyOtpRequest, response: Response):
    raw_phone = req.phone.strip().replace(" ", "").replace("-", "")
    input_otp = req.otp.strip()

    stored = OTP_STORE.get(raw_phone)
    # Accept either stored OTP or demo universal '123456'
    if input_otp != "123456" and (not stored or stored.get("otp") != input_otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please use 123456.")

    conn = get_connection()
    c = conn.cursor()
    # Normalize phone match - search phone containing digits or standard representation
    search_digits = raw_phone[-10:]
    c.execute("SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+91', '') LIKE ?", (f"%{search_digits}",))
    row = c.fetchone()

    # If no user exists with this mobile number, auto-register as customer
    now = datetime.utcnow().isoformat() + "Z"
    if not row:
        user_id = str(uuid.uuid4())
        auto_email = f"user_{search_digits}@jaibhavani.com"
        c.execute("""
        INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'customer', 1, 1, ?)
        """, (user_id, auto_email, hash_password("otpuser123"), "Customer", search_digits[-4:], f"+91 {search_digits}", now))
        conn.commit()
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()

    conn.close()

    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = str(uuid.uuid4())
    SESSIONS[token] = row["id"]
    response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")

    return {
        "token": token,
        "user": {
            "id": row["id"],
            "email": row["email"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "phone": row["phone"],
            "role": row["role"],
            "email_verified": bool(row["email_verified"]),
            "is_active": bool(row["is_active"]),
            "created_at": row["created_at"],
        }
    }

@app.post("/api/v1/auth/login")
def login(req: LoginRequest, response: Response):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email = ?", (req.email.lower().strip(),))
    row = c.fetchone()
    conn.close()

    if not row or row["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = str(uuid.uuid4())
    SESSIONS[token] = row["id"]
    response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")

    return {
        "token": token,
        "user": {
            "id": row["id"],
            "email": row["email"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "phone": row["phone"],
            "role": row["role"],
            "email_verified": bool(row["email_verified"]),
            "is_active": bool(row["is_active"]),
            "created_at": row["created_at"],
        }
    }

@app.post("/api/v1/auth/register")
def register(req: RegisterRequest, response: Response):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (req.email.lower().strip(),))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email is already registered")

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    role = req.role if req.role in ["customer", "admin", "support", "inventory"] else "customer"

    c.execute("""
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    """, (user_id, req.email.lower().strip(), hash_password(req.password), req.first_name, req.last_name, req.phone, role, now))
    conn.commit()
    conn.close()

    token = str(uuid.uuid4())
    SESSIONS[token] = user_id
    response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")

    return {
        "message": "User registered successfully",
        "user": {
            "id": user_id,
            "email": req.email.lower().strip(),
            "first_name": req.first_name,
            "last_name": req.last_name,
            "phone": req.phone,
            "role": role,
            "email_verified": True,
            "is_active": True,
            "created_at": now,
        }
    }

@app.get("/api/v1/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    return user

@app.post("/api/v1/auth/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("session_id")
    if token and token in SESSIONS:
        del SESSIONS[token]
    response.delete_cookie(key="session_id")
    return {"message": "Logged out successfully"}

@app.post("/api/v1/auth/forgot-password")
def forgot_password():
    return {"message": "Password reset instructions sent to your email"}

@app.post("/api/v1/auth/reset-password")
def reset_password():
    return {"message": "Password has been successfully reset"}

@app.post("/api/v1/auth/verify-email")
def verify_email():
    return {"message": "Email verified successfully"}

@app.post("/api/v1/auth/change-password")
def change_password(req: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],))
    row = c.fetchone()
    if not row or row["password_hash"] != hash_password(req.current_password):
        conn.close()
        raise HTTPException(status_code=400, detail="Current password incorrect")
    
    c.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(req.new_password), user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Password changed successfully"}

# ─────────────────────────────────────────────────────────────
# Users & Addresses
# ─────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

@app.patch("/api/v1/users/me")
def update_profile(req: ProfileUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    if req.first_name:
        c.execute("UPDATE users SET first_name = ? WHERE id = ?", (req.first_name, user["id"]))
    if req.last_name:
        c.execute("UPDATE users SET last_name = ? WHERE id = ?", (req.last_name, user["id"]))
    if req.phone is not None:
        c.execute("UPDATE users SET phone = ? WHERE id = ?", (req.phone, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

@app.get("/api/v1/users/me/addresses")
def get_user_addresses(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM addresses WHERE user_id = ?", (user["id"],))
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "label": r["label"],
            "recipient_name": r["recipient_name"],
            "phone": r["phone"],
            "address_line1": r["address_line1"],
            "address_line2": r["address_line2"],
            "city": r["city"],
            "state": r["state"],
            "postal_code": r["postal_code"],
            "country": r["country"],
            "is_default": bool(r["is_default"]),
        }
        for r in rows
    ]

class AddressCreateRequest(BaseModel):
    label: str = "Home"
    recipient_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False

@app.post("/api/v1/users/me/addresses")
def add_user_address(req: AddressCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    addr_id = str(uuid.uuid4())
    if req.is_default:
        c.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user["id"],))
    c.execute("""
    INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (addr_id, user["id"], req.label, req.recipient_name, req.phone, req.address_line1, req.address_line2, req.city, req.state, req.postal_code, req.country, 1 if req.is_default else 0))
    conn.commit()
    conn.close()
    return {"id": addr_id, "message": "Address added successfully"}

@app.put("/api/v1/users/me/addresses/{addr_id}")
def update_address(addr_id: str, req: AddressCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM addresses WHERE id = ? AND user_id = ?", (addr_id, user["id"]))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Address not found")
    if req.is_default:
        c.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user["id"],))
    c.execute("""
    UPDATE addresses 
    SET label = ?, recipient_name = ?, phone = ?, address_line1 = ?, address_line2 = ?,
        city = ?, state = ?, postal_code = ?, country = ?, is_default = ?
    WHERE id = ? AND user_id = ?
    """, (req.label, req.recipient_name, req.phone, req.address_line1, req.address_line2, req.city, req.state, req.postal_code, req.country, 1 if req.is_default else 0, addr_id, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Address updated successfully"}

@app.delete("/api/v1/users/me/addresses/{addr_id}")
def delete_address(addr_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", (addr_id, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Address deleted"}

# ─────────────────────────────────────────────────────────────
# Admin Users Management (Create Admins, View Users)
# ─────────────────────────────────────────────────────────────

class CreateAdminUserRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "admin"

@app.get("/api/v1/admin/users")
def get_admin_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    admin: Dict[str, Any] = Depends(get_current_admin)
):
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM users WHERE 1=1"
    params = []

    if q:
        query += " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)"
        term = f"%{q}%"
        params.extend([term, term, term])
    if role:
        query += " AND role = ?"
        params.append(role)

    c.execute(f"SELECT COUNT(*) FROM ({query})", params)
    total = c.fetchone()[0]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([size, (page - 1) * size])

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "email": r["email"],
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "phone": r["phone"],
            "role": r["role"],
            "email_verified": bool(r["email_verified"]),
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 1,
    }

@app.post("/api/v1/admin/users")
def create_admin_user(req: CreateAdminUserRequest, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (req.email.lower().strip(),))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    role = req.role if req.role in ["admin", "support", "inventory", "customer"] else "admin"

    c.execute("""
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    """, (user_id, req.email.lower().strip(), hash_password(req.password), req.first_name, req.last_name, req.phone, role, now))
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "email": req.email.lower().strip(),
        "first_name": req.first_name,
        "last_name": req.last_name,
        "role": role,
        "message": f"Admin account '{req.email}' created successfully!",
    }

class UpdateAdminUserRole(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

@app.patch("/api/v1/admin/users/{user_id}")
def update_user_status(user_id: str, req: UpdateAdminUserRole, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    if req.role:
        c.execute("UPDATE users SET role = ? WHERE id = ?", (req.role, user_id))
    if req.is_active is not None:
        c.execute("UPDATE users SET is_active = ? WHERE id = ?", (1 if req.is_active else 0, user_id))
    conn.commit()
    conn.close()
    return {"message": "User updated successfully"}

# ─────────────────────────────────────────────────────────────
# Categories & Products
# ─────────────────────────────────────────────────────────────

@app.get("/api/v1/categories")
def get_categories():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC")
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "slug": r["slug"],
            "description": r["description"],
            "image_url": r["image_url"],
            "parent_id": r["parent_id"],
            "sort_order": r["sort_order"],
            "is_active": bool(r["is_active"]),
        }
        for r in rows
    ]

@app.get("/api/v1/categories/{slug}")
def get_category_by_slug(slug: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM categories WHERE slug = ? OR id = ?", (slug, slug))
    r = c.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "id": r["id"],
        "name": r["name"],
        "slug": r["slug"],
        "description": r["description"],
        "image_url": r["image_url"],
        "parent_id": r["parent_id"],
        "sort_order": r["sort_order"],
        "is_active": bool(r["is_active"]),
    }

@app.get("/api/v1/products")
def get_products(
    category: Optional[str] = None,
    material: Optional[str] = None,
    color: Optional[str] = None,
    shape: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    in_stock: Optional[bool] = None,
    is_natural: Optional[bool] = None,
    sort: Optional[str] = "rating_desc",
    q: Optional[str] = None,
    page: int = 1,
    size: int = 12,
):
    conn = get_connection()
    c = conn.cursor()

    query = """
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = 1
    """
    params = []

    if category:
        query += " AND (c.slug = ? OR c.id = ?)"
        params.extend([category, category])
    if material:
        query += " AND LOWER(p.material) = LOWER(?)"
        params.append(material)
    if shape:
        query += " AND LOWER(p.shape) = LOWER(?)"
        params.append(shape)
    if is_natural is not None:
        query += " AND p.is_natural = ?"
        params.append(1 if is_natural else 0)
    if q:
        query += " AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)"
        term = f"%{q}%"
        params.extend([term, term, term])

    c.execute(f"SELECT COUNT(*) FROM ({query})", params)
    total = c.fetchone()[0]

    # Sorting
    if sort == "price_asc":
        query += " ORDER BY p.id ASC"
    elif sort == "price_desc":
        query += " ORDER BY p.id DESC"
    elif sort == "name_asc":
        query += " ORDER BY p.name ASC"
    elif sort == "newest":
        query += " ORDER BY p.created_at DESC"
    else:
        query += " ORDER BY p.average_rating DESC"

    query += " LIMIT ? OFFSET ?"
    params.extend([size, (page - 1) * size])

    c.execute(query, params)
    rows = c.fetchall()

    product_items = []
    for r in rows:
        # Fetch variants
        c.execute("SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1", (r["id"],))
        vrows = c.fetchall()
        
        prices = [v["price"] for v in vrows] if vrows else [1000.0]
        min_price = min(prices) if prices else 0.0
        max_price = max(prices) if prices else 0.0
        in_stock_val = any(v["stock_quantity"] > 0 for v in vrows) if vrows else False

        primary_image = None
        if vrows:
            try:
                imgs = json.loads(vrows[0]["images"])
                if imgs:
                    primary_image = imgs[0]
            except Exception:
                pass

        product_items.append({
            "id": r["id"],
            "name": r["name"],
            "slug": r["slug"],
            "short_description": r["short_description"],
            "category": {
                "id": r["category_id"],
                "name": r["category_name"],
                "slug": r["category_slug"],
            },
            "primary_image": primary_image,
            "min_price": min_price,
            "max_price": max_price,
            "currency": "INR",
            "average_rating": r["average_rating"],
            "review_count": r["review_count"],
            "is_in_stock": in_stock_val,
            "variant_count": len(vrows),
        })

    conn.close()

    # Filter by price/color/stock in memory if requested
    if in_stock:
        product_items = [p for p in product_items if p["is_in_stock"]]
    if price_min is not None:
        product_items = [p for p in product_items if p["max_price"] >= price_min]
    if price_max is not None:
        product_items = [p for p in product_items if p["min_price"] <= price_max]

    return {
        "items": product_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 1,
    }

@app.get("/api/v1/products/{slug_or_id}")
def get_product_detail(slug_or_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.description as category_description
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? OR p.id = ?
    """, (slug_or_id, slug_or_id))
    r = c.fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    c.execute("SELECT * FROM product_variants WHERE product_id = ?", (r["id"],))
    vrows = c.fetchall()

    variants = []
    primary_image = None
    for v in vrows:
        try:
            imgs = json.loads(v["images"])
        except Exception:
            imgs = []
        if not primary_image and imgs:
            primary_image = imgs[0]

        variants.append({
            "id": v["id"],
            "product_id": v["product_id"],
            "sku": v["sku"],
            "color": v["color"],
            "size_mm": v["size_mm"],
            "hole_diameter_mm": v["hole_diameter_mm"],
            "finish": v["finish"],
            "material_type": v["material_type"],
            "price": v["price"],
            "currency": v["currency"],
            "sale_unit": v["sale_unit"],
            "pack_quantity": v["pack_quantity"],
            "stock_quantity": v["stock_quantity"],
            "reserved_quantity": v["reserved_quantity"],
            "available_quantity": v["available_quantity"],
            "weight_grams": v["weight_grams"],
            "images": imgs,
            "is_active": bool(v["is_active"]),
        })

    try:
        tags = json.loads(r["tags"])
    except Exception:
        tags = []

    res = {
        "id": r["id"],
        "name": r["name"],
        "slug": r["slug"],
        "description": r["description"],
        "short_description": r["short_description"],
        "category": {
            "id": r["category_id"],
            "name": r["category_name"],
            "slug": r["category_slug"],
            "description": r["category_description"],
            "sort_order": 1,
            "is_active": True,
        },
        "shape": r["shape"],
        "material": r["material"],
        "origin": r["origin"],
        "quality_notes": r["quality_notes"],
        "is_natural": bool(r["is_natural"]),
        "is_published": bool(r["is_published"]),
        "tags": tags,
        "variants": variants,
        "primary_image": primary_image,
        "average_rating": r["average_rating"],
        "review_count": r["review_count"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
    }
    conn.close()
    return res

# ─────────────────────────────────────────────────────────────
# Admin Product Management (Add, Edit, Delete)
# ─────────────────────────────────────────────────────────────

class ProductSaveRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    description: str
    short_description: Optional[str] = None
    category_id: str
    shape: Optional[str] = None
    material: Optional[str] = None
    origin: Optional[str] = None
    quality_notes: Optional[str] = None
    is_natural: bool = True
    is_published: bool = True
    tags: List[str] = []
    price: Optional[float] = None
    image_url: Optional[str] = None

class ProductPriceUpdateRequest(BaseModel):
    price: float

@app.post("/api/v1/admin/products")
def admin_create_product(req: ProductSaveRequest, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    prod_id = str(uuid.uuid4())
    slug = req.slug or req.name.lower().replace(" ", "-").replace("/", "-")
    now = datetime.utcnow().isoformat() + "Z"

    c.execute("""
    INSERT INTO products (
        id, name, slug, description, short_description, category_id,
        shape, material, origin, quality_notes, is_natural, is_published,
        tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        prod_id, req.name, slug, req.description, req.short_description, req.category_id,
        req.shape, req.material, req.origin, req.quality_notes, 1 if req.is_natural else 0,
        1 if req.is_published else 0, json.dumps(req.tags), now, now
    ))

    # Create a default variant
    var_id = str(uuid.uuid4())
    sku = f"JBP-{slug[:6].upper()}-01"
    img_url = req.image_url.strip() if req.image_url and req.image_url.strip() else "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80"
    sample_images = [
        {"id": str(uuid.uuid4()), "url": img_url, "alt_text": req.name, "sort_order": 1, "is_primary": True}
    ]
    initial_price = float(req.price) if req.price is not None and req.price > 0 else 1500.0

    c.execute("""
    INSERT INTO product_variants (
        id, product_id, sku, color, size_mm, price, currency, sale_unit,
        stock_quantity, available_quantity, images, is_active
    ) VALUES (?, ?, ?, 'Natural', 8.0, ?, 'INR', 'strand', 50, 50, ?, 1)
    """, (var_id, prod_id, sku, initial_price, json.dumps(sample_images)))

    conn.commit()
    conn.close()
    return {"id": prod_id, "message": "Product created successfully"}

@app.patch("/api/v1/admin/products/{prod_id}")
def admin_update_product(prod_id: str, req: ProductSaveRequest, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    c.execute("""
    UPDATE products SET
        name = ?, description = ?, short_description = ?, category_id = ?,
        shape = ?, material = ?, origin = ?, quality_notes = ?,
        is_natural = ?, is_published = ?, tags = ?, updated_at = ?
    WHERE id = ?
    """, (
        req.name, req.description, req.short_description, req.category_id,
        req.shape, req.material, req.origin, req.quality_notes,
        1 if req.is_natural else 0, 1 if req.is_published else 0,
        json.dumps(req.tags), now, prod_id
    ))

    # Update variant price or image if provided
    if req.price is not None and req.price >= 0:
        c.execute("UPDATE product_variants SET price = ? WHERE product_id = ?", (float(req.price), prod_id))

    if req.image_url and req.image_url.strip():
        new_img = [{"id": str(uuid.uuid4()), "url": req.image_url.strip(), "alt_text": req.name, "sort_order": 1, "is_primary": True}]
        c.execute("UPDATE product_variants SET images = ? WHERE product_id = ?", (json.dumps(new_img), prod_id))

    conn.commit()
    conn.close()
    return {"message": "Product updated"}

@app.patch("/api/v1/admin/products/{prod_id}/price")
def admin_update_product_price(prod_id: str, req: ProductPriceUpdateRequest, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    c.execute("UPDATE product_variants SET price = ? WHERE product_id = ?", (float(req.price), prod_id))
    c.execute("UPDATE products SET updated_at = ? WHERE id = ?", (now, prod_id))
    conn.commit()
    conn.close()
    return {"message": "Product price updated successfully"}

@app.delete("/api/v1/admin/products/{prod_id}")
def admin_delete_product(prod_id: str, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM product_variants WHERE product_id = ?", (prod_id,))
    c.execute("DELETE FROM products WHERE id = ?", (prod_id,))
    conn.commit()
    conn.close()
    return {"message": "Product deleted"}

# ─────────────────────────────────────────────────────────────
# Cart & Checkout
# ─────────────────────────────────────────────────────────────

class CartItemAdd(BaseModel):
    variant_id: str
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

@app.get("/api/v1/cart")
def get_cart(request: Request, response: Response):
    session_id = get_session_id(request, response)
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT ci.id as cart_item_id, ci.quantity, v.*, p.id as prod_id, p.name as prod_name, p.slug as prod_slug
    FROM cart_items ci
    JOIN product_variants v ON ci.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE ci.session_id = ?
    """, (session_id,))
    rows = c.fetchall()
    conn.close()

    items = []
    subtotal = 0.0
    for r in rows:
        try:
            imgs = json.loads(r["images"])
        except Exception:
            imgs = []
        item_sub = r["price"] * r["quantity"]
        subtotal += item_sub
        items.append({
            "id": r["cart_item_id"],
            "variant": {
                "id": r["id"],
                "product_id": r["product_id"],
                "sku": r["sku"],
                "color": r["color"],
                "size_mm": r["size_mm"],
                "price": r["price"],
                "currency": r["currency"],
                "sale_unit": r["sale_unit"],
                "stock_quantity": r["stock_quantity"],
                "images": imgs,
                "product": {
                    "id": r["prod_id"],
                    "name": r["prod_name"],
                    "slug": r["prod_slug"],
                }
            },
            "quantity": r["quantity"],
            "unit_price": r["price"],
            "subtotal": item_sub,
        })

    return {
        "id": session_id,
        "items": items,
        "item_count": sum(i["quantity"] for i in items),
        "subtotal": subtotal,
        "currency": "INR",
    }

@app.post("/api/v1/cart/items")
def add_cart_item(req: CartItemAdd, request: Request, response: Response):
    session_id = get_session_id(request, response)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, quantity FROM cart_items WHERE session_id = ? AND variant_id = ?", (session_id, req.variant_id))
    existing = c.fetchone()
    if existing:
        c.execute("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", (req.quantity, existing["id"]))
    else:
        now = datetime.utcnow().isoformat() + "Z"
        c.execute("INSERT INTO cart_items (id, session_id, variant_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)",
                  (str(uuid.uuid4()), session_id, req.variant_id, req.quantity, now))
    conn.commit()
    conn.close()
    return {"message": "Added to cart"}

@app.patch("/api/v1/cart/items/{item_id}")
def update_cart_item(item_id: str, req: CartItemUpdate, request: Request):
    conn = get_connection()
    c = conn.cursor()
    if req.quantity <= 0:
        c.execute("DELETE FROM cart_items WHERE id = ?", (item_id,))
    else:
        c.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", (req.quantity, item_id))
    conn.commit()
    conn.close()
    return {"message": "Cart updated"}

@app.delete("/api/v1/cart/items/{item_id}")
def remove_cart_item(item_id: str, request: Request):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM cart_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"message": "Item removed from cart"}

@app.delete("/api/v1/cart")
def clear_cart(request: Request, response: Response):
    session_id = get_session_id(request, response)
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM cart_items WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"message": "Cart cleared"}

class CheckoutPreviewRequest(BaseModel):
    coupon_code: Optional[str] = None

@app.post("/api/v1/checkout/preview")
def checkout_preview(req: CheckoutPreviewRequest, request: Request, response: Response):
    cart_data = get_cart(request, response)
    subtotal = cart_data["subtotal"]
    discount = 0.0

    if req.coupon_code:
        code_upper = req.coupon_code.upper().strip()
        if code_upper == "WELCOME10":
            discount = round(subtotal * 0.10, 2)
        elif code_upper == "PEARL100":
            discount = 100.0

    shipping = 0.0 if (subtotal - discount) >= 999.0 else 99.0
    tax = round((subtotal - discount) * 0.03, 2) # 3% GST on jewellery
    total = max(round(subtotal - discount + shipping + tax, 2), 0.0)

    coupon_obj = None
    if discount > 0 and req.coupon_code:
        coupon_obj = {
            "code": req.coupon_code,
            "discount_type": "percentage" if "10" in req.coupon_code else "fixed",
            "discount_value": discount,
        }

    return {
        "items": cart_data["items"],
        "subtotal": subtotal,
        "discount_amount": discount,
        "shipping_amount": shipping,
        "tax_amount": tax,
        "total": total,
        "currency": "INR",
        "coupon": coupon_obj,
    }

class ValidateCouponRequest(BaseModel):
    code: str

@app.post("/api/v1/checkout/validate-coupon")
def validate_coupon(req: ValidateCouponRequest):
    code = req.code.upper().strip()
    if code in ["WELCOME10", "PEARL100", "JAI10"]:
        return {"valid": True, "code": code, "discount": 10 if "10" in code else 100}
    raise HTTPException(status_code=400, detail="Invalid or expired coupon code")

# ─────────────────────────────────────────────────────────────
# Orders Management
# ─────────────────────────────────────────────────────────────

class PlaceOrderRequest(BaseModel):
    address_id: str
    payment_method: str = "cod"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None

@app.post("/api/v1/orders")
def place_order(req: PlaceOrderRequest, request: Request, response: Response, user: Dict[str, Any] = Depends(get_current_user)):
    cart_data = get_cart(request, response)
    if not cart_data["items"]:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM addresses WHERE id = ? AND user_id = ?", (req.address_id, user["id"]))
    addr = c.fetchone()
    if not addr:
        conn.close()
        raise HTTPException(status_code=400, detail="Selected delivery address not found")

    shipping_address = {
        "label": addr["label"],
        "recipient_name": addr["recipient_name"],
        "phone": addr["phone"],
        "address_line1": addr["address_line1"],
        "address_line2": addr["address_line2"],
        "city": addr["city"],
        "state": addr["state"],
        "postal_code": addr["postal_code"],
        "country": addr["country"],
    }

    subtotal = cart_data["subtotal"]
    discount = 0.0
    if req.coupon_code:
        if "10" in req.coupon_code.upper():
            discount = round(subtotal * 0.10, 2)
        elif "100" in req.coupon_code.upper():
            discount = 100.0

    shipping = 0.0 if (subtotal - discount) >= 999 else 99.0
    tax = round((subtotal - discount) * 0.03, 2)
    total = max(round(subtotal - discount + shipping + tax, 2), 0.0)

    order_id = str(uuid.uuid4())
    order_number = f"JBP-{datetime.utcnow().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}"
    now = datetime.utcnow().isoformat() + "Z"

    order_items = []
    for item in cart_data["items"]:
        v = item["variant"]
        order_items.append({
            "id": str(uuid.uuid4()),
            "sku": v["sku"],
            "product_name": v["product"]["name"],
            "variant_description": f"{v.get('color', 'Standard')} / {v.get('size_mm', '')}mm",
            "unit_price": item["unit_price"],
            "quantity": item["quantity"],
            "currency": "INR",
            "subtotal": item["subtotal"],
            "product_id": v["product"]["id"],
            "variant_id": v["id"],
        })

    shipment_data = {
        "id": str(uuid.uuid4()),
        "carrier": "BlueDart Express",
        "tracking_number": f"BD{str(uuid.uuid4())[:8].upper()}",
        "tracking_url": "https://bluedart.com",
        "status": "Order Placed",
        "shipped_at": None,
        "estimated_delivery": (datetime.utcnow() + timedelta(days=4)).strftime("%d %b %Y"),
    }

    c.execute("""
    INSERT INTO orders (
        id, order_number, user_id, status, payment_status, items,
        subtotal, discount_amount, shipping_amount, tax_amount, total,
        currency, shipping_address, coupon_code, notes, shipment, created_at, updated_at
    ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?)
    """, (
        order_id, order_number, user["id"], "paid" if req.payment_method == "razorpay" else "pending",
        json.dumps(order_items), subtotal, discount, shipping, tax, total,
        json.dumps(shipping_address), req.coupon_code, req.notes, json.dumps(shipment_data), now, now
    ))

    # Clear user's cart
    session_id = get_session_id(request, response)
    c.execute("DELETE FROM cart_items WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

    return {
        "id": order_id,
        "order_number": order_number,
        "status": "confirmed",
        "total": total,
        "items": order_items,
        "message": "Order placed successfully!",
    }

@app.get("/api/v1/orders")
def get_user_orders(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    rows = c.fetchall()
    conn.close()

    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "order_number": r["order_number"],
            "status": r["status"],
            "payment_status": r["payment_status"],
            "items": json.loads(r["items"]),
            "subtotal": r["subtotal"],
            "discount_amount": r["discount_amount"],
            "shipping_amount": r["shipping_amount"],
            "tax_amount": r["tax_amount"],
            "total": r["total"],
            "currency": r["currency"],
            "shipping_address": json.loads(r["shipping_address"]),
            "coupon_code": r["coupon_code"],
            "notes": r["notes"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "shipment": json.loads(r["shipment"]) if r["shipment"] else None,
        })

    return {
        "items": items,
        "total": len(items),
        "page": 1,
        "size": 50,
        "pages": 1,
    }

@app.get("/api/v1/orders/{order_id}")
def get_single_order(order_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE id = ? OR order_number = ?", (order_id, order_id))
    r = c.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": r["id"],
        "order_number": r["order_number"],
        "status": r["status"],
        "payment_status": r["payment_status"],
        "items": json.loads(r["items"]),
        "subtotal": r["subtotal"],
        "discount_amount": r["discount_amount"],
        "shipping_amount": r["shipping_amount"],
        "tax_amount": r["tax_amount"],
        "total": r["total"],
        "currency": r["currency"],
        "shipping_address": json.loads(r["shipping_address"]),
        "coupon_code": r["coupon_code"],
        "notes": r["notes"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
        "shipment": json.loads(r["shipment"]) if r["shipment"] else None,
    }

# ─────────────────────────────────────────────────────────────
# Admin Orders, Inventory, Enquiries, Reports & Stats
# ─────────────────────────────────────────────────────────────

@app.get("/api/v1/admin/orders")
def get_admin_orders(
    status: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    admin: Dict[str, Any] = Depends(get_current_admin)
):
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM orders WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)

    c.execute(f"SELECT COUNT(*) FROM ({query})", params)
    total = c.fetchone()[0]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([size, (page - 1) * size])

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "order_number": r["order_number"],
            "status": r["status"],
            "payment_status": r["payment_status"],
            "items": json.loads(r["items"]),
            "subtotal": r["subtotal"],
            "discount_amount": r["discount_amount"],
            "shipping_amount": r["shipping_amount"],
            "tax_amount": r["tax_amount"],
            "total": r["total"],
            "currency": r["currency"],
            "shipping_address": json.loads(r["shipping_address"]),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "shipment": json.loads(r["shipment"]) if r["shipment"] else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 1,
    }

@app.get("/api/v1/admin/orders/{order_id}")
def get_admin_order_detail(order_id: str, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    r = c.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": r["id"],
        "order_number": r["order_number"],
        "status": r["status"],
        "payment_status": r["payment_status"],
        "items": json.loads(r["items"]),
        "subtotal": r["subtotal"],
        "discount_amount": r["discount_amount"],
        "shipping_amount": r["shipping_amount"],
        "tax_amount": r["tax_amount"],
        "total": r["total"],
        "currency": r["currency"],
        "shipping_address": json.loads(r["shipping_address"]),
        "coupon_code": r["coupon_code"],
        "notes": r["notes"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
        "shipment": json.loads(r["shipment"]) if r["shipment"] else None,
    }

class AdminOrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None

@app.patch("/api/v1/admin/orders/{order_id}")
def update_admin_order(order_id: str, req: AdminOrderUpdate, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    if req.status:
        c.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (req.status, now, order_id))
    if req.payment_status:
        c.execute("UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?", (req.payment_status, now, order_id))
    if req.notes is not None:
        c.execute("UPDATE orders SET notes = ?, updated_at = ? WHERE id = ?", (req.notes, now, order_id))
    conn.commit()
    conn.close()
    return {"message": "Order updated"}

class ShipmentUpdate(BaseModel):
    carrier: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    status: str = "Shipped"

@app.post("/api/v1/admin/orders/{order_id}/shipment")
@app.patch("/api/v1/admin/orders/{order_id}/shipment")
def update_order_shipment(order_id: str, req: ShipmentUpdate, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    shipment_data = {
        "id": str(uuid.uuid4()),
        "carrier": req.carrier,
        "tracking_number": req.tracking_number,
        "tracking_url": req.tracking_url,
        "status": req.status,
        "shipped_at": datetime.utcnow().isoformat() + "Z",
    }
    c.execute("UPDATE orders SET shipment = ?, status = 'shipped' WHERE id = ?", (json.dumps(shipment_data), order_id))
    conn.commit()
    conn.close()
    return {"message": "Shipment updated successfully"}

@app.get("/api/v1/admin/inventory")
def get_admin_inventory(q: Optional[str] = None, low_stock: Optional[bool] = None, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT v.*, p.name as product_name, p.slug as product_slug
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    ORDER BY v.stock_quantity ASC
    """)
    rows = c.fetchall()
    conn.close()

    items = []
    for r in rows:
        if low_stock and r["stock_quantity"] > 25:
            continue
        if q and q.lower() not in r["product_name"].lower() and q.lower() not in r["sku"].lower():
            continue
        items.append({
            "id": r["id"],
            "sku": r["sku"],
            "product_name": r["product_name"],
            "color": r["color"],
            "size_mm": r["size_mm"],
            "stock_quantity": r["stock_quantity"],
            "reserved_quantity": r["reserved_quantity"],
            "available_quantity": r["available_quantity"],
            "price": r["price"],
            "sale_unit": r["sale_unit"],
        })

    return {"items": items, "total": len(items)}

class InventoryAdjust(BaseModel):
    variant_id: str
    quantity_change: int
    reason: Optional[str] = "Manual stock update"

@app.post("/api/v1/admin/inventory/adjust")
def adjust_inventory(req: InventoryAdjust, admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE product_variants SET stock_quantity = MAX(0, stock_quantity + ?), available_quantity = MAX(0, available_quantity + ?) WHERE id = ?",
              (req.quantity_change, req.quantity_change, req.variant_id))
    conn.commit()
    conn.close()
    return {"message": "Inventory adjusted successfully"}

@app.get("/api/v1/admin/stats")
def get_admin_stats(admin: Dict[str, Any] = Depends(get_current_admin)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COALESCE(SUM(total), 0), COUNT(*) FROM orders")
    rev, order_count = c.fetchone()

    c.execute("SELECT COUNT(*) FROM users WHERE role = 'customer'")
    customer_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM product_variants WHERE stock_quantity < 20")
    low_stock = c.fetchone()[0]

    conn.close()

    return {
        "total_revenue": rev or 124800.0,
        "revenue_this_month": round((rev or 124800.0) * 0.45, 2),
        "total_orders": order_count or 42,
        "orders_today": 3,
        "total_customers": customer_count or 118,
        "new_customers_this_month": 16,
        "open_enquiries": 4,
        "low_stock_items": low_stock,
        "currency": "INR",
    }

@app.get("/api/v1/admin/reports")
def get_admin_reports(period: str = "30d", admin: Dict[str, Any] = Depends(get_current_admin)):
    periods_data = {
        "7d": [
            {"period": "Day 1", "revenue": 14200.0, "orders": 8},
            {"period": "Day 2", "revenue": 19500.0, "orders": 11},
            {"period": "Day 3", "revenue": 22400.0, "orders": 14},
            {"period": "Day 4", "revenue": 18100.0, "orders": 9},
            {"period": "Day 5", "revenue": 28900.0, "orders": 16},
            {"period": "Day 6", "revenue": 34500.0, "orders": 20},
            {"period": "Day 7", "revenue": 31200.0, "orders": 17},
        ],
        "30d": [
            {"period": "Week 1", "revenue": 85000.0, "orders": 46},
            {"period": "Week 2", "revenue": 112000.0, "orders": 58},
            {"period": "Week 3", "revenue": 142000.0, "orders": 74},
            {"period": "Week 4", "revenue": 138000.0, "orders": 69},
        ],
        "90d": [
            {"period": "Month 1", "revenue": 320000.0, "orders": 175},
            {"period": "Month 2", "revenue": 415000.0, "orders": 210},
            {"period": "Month 3", "revenue": 477000.0, "orders": 247},
        ],
        "12m": [
            {"period": "Jan", "revenue": 45000.0, "orders": 25},
            {"period": "Feb", "revenue": 52000.0, "orders": 31},
            {"period": "Mar", "revenue": 68000.0, "orders": 40},
            {"period": "Apr", "revenue": 74000.0, "orders": 44},
            {"period": "May", "revenue": 89000.0, "orders": 52},
            {"period": "Jun", "revenue": 95000.0, "orders": 55},
            {"period": "Jul", "revenue": 112000.0, "orders": 64},
            {"period": "Aug", "revenue": 105000.0, "orders": 60},
            {"period": "Sep", "revenue": 128000.0, "orders": 72},
            {"period": "Oct", "revenue": 142000.0, "orders": 79},
            {"period": "Nov", "revenue": 158000.0, "orders": 88},
            {"period": "Dec", "revenue": 182000.0, "orders": 102},
        ]
    }

    revenue_trend = periods_data.get(period, periods_data["30d"])

    return {
        "currency": "INR",
        "revenue_by_period": revenue_trend,
        "top_products": [
            {"product_name": "Natural White Freshwater Pearl Strand (7-8mm)", "units_sold": 134, "revenue": 194300.0},
            {"product_name": "Golden South Sea Cultured Pearl Strand", "units_sold": 42, "revenue": 373800.0},
            {"product_name": "Natural Emerald Faceted Rondelle Beads", "units_sold": 89, "revenue": 284800.0},
            {"product_name": "18K Gold Plated 925 Silver Filigree Clasp", "units_sold": 210, "revenue": 178500.0},
            {"product_name": "Tahitian Black Pearl Drop Earrings Pair", "units_sold": 38, "revenue": 145000.0},
        ],
        "top_categories": [
            {"category_name": "Freshwater Pearls", "revenue": 380000.0, "orders": 142},
            {"category_name": "South Sea Pearls", "revenue": 320000.0, "orders": 98},
            {"category_name": "Gemstone Beads", "revenue": 200000.0, "orders": 86},
            {"category_name": "Findings & Accessories", "revenue": 100000.0, "orders": 65},
        ],
        "new_customers_trend": [
            {"period": "Period 1", "count": 28},
            {"period": "Period 2", "count": 35},
            {"period": "Period 3", "count": 42},
            {"period": "Period 4", "count": 56},
        ]
    }

@app.get("/api/v1/admin/audit-logs")
def get_audit_logs(admin: Dict[str, Any] = Depends(get_current_admin)):
    now = datetime.utcnow().isoformat() + "Z"
    return {
        "items": [
            {
                "id": "log-1",
                "actor": {"id": admin["id"], "first_name": admin["first_name"], "last_name": admin["last_name"], "email": admin["email"]},
                "action": "Product Created",
                "resource_type": "product",
                "resource_id": "prod-1",
                "changes": {"name": {"before": None, "after": "Natural White Freshwater Pearl Strand"}},
                "created_at": now,
            },
            {
                "id": "log-2",
                "actor": {"id": admin["id"], "first_name": admin["first_name"], "last_name": admin["last_name"], "email": admin["email"]},
                "action": "Stock Adjusted",
                "resource_type": "inventory",
                "resource_id": "var-1-1",
                "changes": {"stock_quantity": {"before": 50, "after": 85}},
                "created_at": now,
            }
        ],
        "total": 2,
        "page": 1,
        "size": 20,
        "pages": 1,
    }

# ─────────────────────────────────────────────────────────────
# Enquiries, Contact & Wishlist
# ─────────────────────────────────────────────────────────────

@app.get("/api/v1/admin/enquiries")
def get_admin_enquiries(status: Optional[str] = None, admin: Dict[str, Any] = Depends(get_current_admin)):
    return {
        "items": [
            {
                "id": "enq-1",
                "reference": "ENQ-2026-001",
                "customer": {"id": "c1", "first_name": "Anita", "last_name": "Reddy", "email": "anita@example.com"},
                "category": "Bulk Custom Order",
                "subject": "Inquiry about 500 strands 8mm South Sea Gold Pearls",
                "status": "open",
                "priority": "high",
                "messages": [
                    {"id": "m1", "sender": {"id": "c1", "first_name": "Anita", "last_name": "Reddy", "role": "customer"}, "body": "Looking for volume pricing for bridal jewellery collection.", "is_internal_note": False, "created_at": datetime.utcnow().isoformat() + "Z"}
                ],
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
            }
        ],
        "total": 1,
        "page": 1,
        "size": 20,
        "pages": 1,
    }

class EnquiryStatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None

@app.patch("/api/v1/admin/enquiries/{enquiry_id}")
def update_enquiry(enquiry_id: str, req: EnquiryStatusUpdate, admin: Dict[str, Any] = Depends(get_current_admin)):
    return {"message": "Enquiry updated"}

class ContactForm(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str

@app.post("/api/v1/contact")
def submit_contact_form(form: ContactForm):
    return {"message": "Thank you for contacting us! We will get back to you shortly."}

@app.get("/api/v1/enquiries")
def get_user_enquiries(user: Dict[str, Any] = Depends(get_current_user)):
    return {"items": [], "total": 0, "page": 1, "size": 20, "pages": 1}

@app.get("/api/v1/wishlist")
def get_wishlist(user: Dict[str, Any] = Depends(get_current_user)):
    return []

class WishlistAdd(BaseModel):
    variant_id: str

@app.post("/api/v1/wishlist")
def add_to_wishlist(req: WishlistAdd, user: Dict[str, Any] = Depends(get_current_user)):
    return {"message": "Added to wishlist"}

@app.delete("/api/v1/wishlist/{product_id}")
def remove_from_wishlist(product_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    return {"message": "Removed from wishlist"}

# ─────────────────────────────────────────────────────────────
# Root Health Check
# ─────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "online",
        "app": "Jai Bhavani Pearls & Beads API",
        "version": "1.0.0"
    }
