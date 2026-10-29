import sqlite3
import json
import uuid
import hashlib
from datetime import datetime
from pathlib import Path

DB_FILE = Path(__file__).parent / "app.db"

def get_connection():
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_db():
    conn = get_connection()
    c = conn.cursor()

    # Users table
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        email_verified INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Addresses table
    c.execute("""
    CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'India',
        is_default INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Categories table
    c.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        parent_id TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    )
    """)

    # Products table
    c.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        short_description TEXT,
        category_id TEXT NOT NULL,
        shape TEXT,
        material TEXT,
        origin TEXT,
        quality_notes TEXT,
        is_natural INTEGER DEFAULT 1,
        is_published INTEGER DEFAULT 1,
        tags TEXT, -- JSON array
        average_rating REAL DEFAULT 4.8,
        review_count INTEGER DEFAULT 12,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )
    """)

    # Variants table
    c.execute("""
    CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        color TEXT,
        size_mm REAL,
        hole_diameter_mm REAL,
        finish TEXT,
        material_type TEXT DEFAULT 'natural',
        price REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        sale_unit TEXT DEFAULT 'strand',
        pack_quantity INTEGER DEFAULT 1,
        stock_quantity INTEGER NOT NULL DEFAULT 50,
        reserved_quantity INTEGER DEFAULT 0,
        available_quantity INTEGER NOT NULL DEFAULT 50,
        weight_grams REAL,
        images TEXT, -- JSON array of {id, url, alt_text, sort_order, is_primary}
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    """)

    # Cart table
    c.execute("""
    CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    )
    """)

    # Orders table
    c.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        payment_status TEXT NOT NULL DEFAULT 'paid',
        items TEXT NOT NULL, -- JSON array
        subtotal REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        shipping_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        shipping_address TEXT NOT NULL, -- JSON
        coupon_code TEXT,
        notes TEXT,
        shipment TEXT, -- JSON
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Enquiries table
    c.execute("""
    CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        user_id TEXT,
        customer_name TEXT,
        customer_email TEXT,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'normal',
        assigned_to TEXT,
        messages TEXT NOT NULL, -- JSON array
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Wishlist table
    c.execute("""
    CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Audit logs table
    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        actor_name TEXT,
        actor_email TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        changes TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_data(conn)
    conn.close()

def seed_data(conn):
    c = conn.cursor()

    # Check if admin user already exists
    c.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@jaibhavani.com'")
    if c.fetchone()[0] == 0:
        admin_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        # Create Admin
        c.execute("""
        INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
        """, (admin_id, "admin@jaibhavani.com", hash_password("admin123"), "Bhavani", "Admin", "+91 9876543210", "admin", now))

        # Create Demo Customer
        cust_id = str(uuid.uuid4())
        c.execute("""
        INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
        """, (cust_id, "customer@jaibhavani.com", hash_password("customer123"), "Priya", "Sharma", "+91 9811122233", "customer", now))

        # Default address for customer
        addr_id = str(uuid.uuid4())
        c.execute("""
        INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
        VALUES (?, ?, 'Home', 'Priya Sharma', '+91 9811122233', 'Plot 42, Jubilee Hills Road 36', 'Near Metro Station', 'Hyderabad', 'Telangana', '500033', 'India', 1)
        """, (addr_id, cust_id))

    # Seed Categories
    c.execute("SELECT COUNT(*) FROM categories")
    if c.fetchone()[0] == 0:
        categories = [
            ("cat-1", "Freshwater Pearls", "freshwater-pearls", "High luster natural and cultured freshwater pearls in various shapes and natural pastel shades.", "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80", 1),
            ("cat-2", "South Sea Pearls", "south-sea-pearls", "Magnificent gold and silvery white South Sea pearls with thick nacre and satin glow.", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80", 2),
            ("cat-3", "Gemstone Beads", "gemstone-beads", "Genuine faceted and smooth natural ruby, emerald, sapphire, amethyst, and quartz beads.", "https://images.unsplash.com/photo-1611591475837-142f1cf59f81?auto=format&fit=crop&w=600&q=80", 3),
            ("cat-4", "Crystal & Glass Beads", "crystal-beads", "Precision cut sparkling crystals and artisanal handcrafted glass beads.", "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=600&q=80", 4),
            ("cat-5", "Findings & Accessories", "findings-accessories", "Premium 925 sterling silver, 18K gold plated clasps, wire, headpins, and caps.", "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=600&q=80", 5),
        ]
        c.executemany("""
        INSERT INTO categories (id, name, slug, description, image_url, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        """, categories)

    # Seed Products
    c.execute("SELECT COUNT(*) FROM products")
    if c.fetchone()[0] == 0:
        now = datetime.utcnow().isoformat() + "Z"
        products_data = [
            {
                "id": "prod-1",
                "name": "Natural White Freshwater Pearl Strand (7-8mm)",
                "slug": "natural-white-freshwater-pearl-strand-7-8mm",
                "short_description": "AAA grade near-round white freshwater pearls with radiant mirror-like luster.",
                "description": "Exquisite AAA grade natural freshwater cultured pearls hand-selected for outstanding glow, smooth surfaces, and uniform sizing. Perfect for classic necklace stringing and bridal couture.",
                "category_id": "cat-1",
                "shape": "Round",
                "material": "Pearl",
                "origin": "Hyderabad, India",
                "quality_notes": "AAA Grade, 90%+ blemish-free nacre surface",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["pearl", "freshwater", "white", "bridal", "necklace"],
                "variants": [
                    {
                        "id": "var-1-1",
                        "sku": "FWP-WHT-78MM",
                        "color": "White",
                        "size_mm": 7.5,
                        "hole_diameter_mm": 0.8,
                        "finish": "Natural Luster",
                        "material_type": "natural",
                        "price": 1450.0,
                        "sale_unit": "strand",
                        "stock_quantity": 85,
                        "images": [
                            {"id": "img-1", "url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80", "alt_text": "White Freshwater Pearl Strand", "sort_order": 1, "is_primary": True}
                        ]
                    },
                    {
                        "id": "var-1-2",
                        "sku": "FWP-CRM-78MM",
                        "color": "Cream",
                        "size_mm": 8.0,
                        "hole_diameter_mm": 0.8,
                        "finish": "Warm Glow",
                        "material_type": "natural",
                        "price": 1550.0,
                        "sale_unit": "strand",
                        "stock_quantity": 40,
                        "images": [
                            {"id": "img-2", "url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80", "alt_text": "Cream Pearl Strand", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-2",
                "name": "Golden South Sea Cultured Pearl Strand (10-12mm)",
                "slug": "golden-south-sea-cultured-pearl-strand",
                "short_description": "Rare natural golden tone South Sea pearls with velvet deep metallic champagne shimmer.",
                "description": "Sourced from warm tropical ocean waters, these majestic golden South Sea pearls feature deep natural 24K gold hues without artificial dye. Ideal for royal statement jewellery.",
                "category_id": "cat-2",
                "shape": "Baroque",
                "material": "Pearl",
                "origin": "South Pacific",
                "quality_notes": "Rare natural deep champagne gold, extra-thick nacre",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["south-sea", "gold", "pearl", "luxury", "baroque"],
                "variants": [
                    {
                        "id": "var-2-1",
                        "sku": "SSP-GLD-1012MM",
                        "color": "Gold",
                        "size_mm": 11.0,
                        "hole_diameter_mm": 0.9,
                        "finish": "High Metallic Luster",
                        "material_type": "cultured",
                        "price": 8900.0,
                        "sale_unit": "strand",
                        "stock_quantity": 25,
                        "images": [
                            {"id": "img-3", "url": "https://images.unsplash.com/photo-1611591475837-142f1cf59f81?auto=format&fit=crop&w=800&q=80", "alt_text": "Golden South Sea Pearl Strand", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-3",
                "name": "Natural Emerald Faceted Rondelle Beads (4-5mm)",
                "slug": "natural-emerald-faceted-rondelle-beads",
                "short_description": "Vibrant Zambian natural green emerald rondelle beads with micro-diamond faceting.",
                "description": "Rich deep green emerald rondelles with sparkling diamond-cut facets that catch the light from every angle. Excellent for multi-strand bridal necklaces and gemstone tassel earrings.",
                "category_id": "cat-3",
                "shape": "Rondelle",
                "material": "Gemstone",
                "origin": "Zambia / Jaipur",
                "quality_notes": "AA+ Transparent to translucent green",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["emerald", "gemstone", "green", "rondelle", "faceted"],
                "variants": [
                    {
                        "id": "var-3-1",
                        "sku": "EMR-RND-45MM",
                        "color": "Green",
                        "size_mm": 4.5,
                        "hole_diameter_mm": 0.5,
                        "finish": "Faceted Micro-cut",
                        "material_type": "semi_precious",
                        "price": 3200.0,
                        "sale_unit": "strand",
                        "stock_quantity": 60,
                        "images": [
                            {"id": "img-4", "url": "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80", "alt_text": "Emerald Rondelle Beads", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-4",
                "name": "Natural Ruby Smooth Button Beads (6mm)",
                "slug": "natural-ruby-smooth-button-beads",
                "short_description": "Pigeon blood red natural ruby smooth button beads on 16-inch high quality strand.",
                "description": "Vivid crimson natural rubies, polished to a silky smooth sheen. Each bead showcases natural crystalline variations giving your custom designs unique authenticity.",
                "category_id": "cat-3",
                "shape": "Button",
                "material": "Gemstone",
                "origin": "Madagascar",
                "quality_notes": "Natural unheated vibrant red rubies",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["ruby", "red", "gemstone", "beads", "smooth"],
                "variants": [
                    {
                        "id": "var-4-1",
                        "sku": "RBY-BTN-6MM",
                        "color": "Red",
                        "size_mm": 6.0,
                        "hole_diameter_mm": 0.6,
                        "finish": "Smooth Polished",
                        "material_type": "semi_precious",
                        "price": 4500.0,
                        "sale_unit": "strand",
                        "stock_quantity": 30,
                        "images": [
                            {"id": "img-5", "url": "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80", "alt_text": "Natural Ruby Beads", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-5",
                "name": "Natural Pink Rice Pearl Strand (5-6mm)",
                "slug": "natural-pink-rice-pearl-strand",
                "short_description": "Romantic natural blush pink elongated rice pearls with rainbow iridescent undertones.",
                "description": "Undyed natural pastel pink pearls in graceful rice oval form. Loved by contemporary jewellery designers for dainty choker necklaces and delicate pearl bracelets.",
                "category_id": "cat-1",
                "shape": "Oval",
                "material": "Pearl",
                "origin": "Hyderabad, India",
                "quality_notes": "Natural uncolored pastel blush pink",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["pearl", "pink", "freshwater", "rice-pearl", "bracelet"],
                "variants": [
                    {
                        "id": "var-5-1",
                        "sku": "FWP-PNK-56MM",
                        "color": "Pink",
                        "size_mm": 5.5,
                        "hole_diameter_mm": 0.7,
                        "finish": "High Gloss",
                        "material_type": "natural",
                        "price": 1250.0,
                        "sale_unit": "strand",
                        "stock_quantity": 110,
                        "images": [
                            {"id": "img-6", "url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80", "alt_text": "Pink Rice Pearl Strand", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-6",
                "name": "Natural Blue Sapphire Micro-Faceted Rondelles (3.5mm)",
                "slug": "natural-blue-sapphire-faceted-rondelles",
                "short_description": "Royal Ceylon blue sapphire gemstone rondelles with brilliant reflective luster.",
                "description": "Rich deep celestial blue sapphires micro-cut for supreme refraction. Creates breathtaking contrast when paired with lustrous white or golden pearls.",
                "category_id": "cat-3",
                "shape": "Rondelle",
                "material": "Gemstone",
                "origin": "Sri Lanka",
                "quality_notes": "Grade AAA Deep Royal Blue",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["sapphire", "blue", "gemstone", "faceted", "luxury"],
                "variants": [
                    {
                        "id": "var-6-1",
                        "sku": "SAP-BLU-35MM",
                        "color": "Blue",
                        "size_mm": 3.5,
                        "hole_diameter_mm": 0.5,
                        "finish": "Diamond Faceted",
                        "material_type": "semi_precious",
                        "price": 3800.0,
                        "sale_unit": "strand",
                        "stock_quantity": 45,
                        "images": [
                            {"id": "img-7", "url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80", "alt_text": "Blue Sapphire Beads", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-7",
                "name": "18K Gold Plated 925 Silver Filigree Pearl Clasp",
                "slug": "18k-gold-plated-925-silver-filigree-pearl-clasp",
                "short_description": "Handcrafted Indian traditional filigree fishhook lock clasp for single or double strand pearls.",
                "description": "Solid 925 sterling silver embellished with 18K antique gold micron plating. Safe, secure mechanism designed specifically for heirloom pearl stringing.",
                "category_id": "cat-5",
                "shape": "Oval",
                "material": "Metal",
                "origin": "Hyderabad, India",
                "quality_notes": "925 Hallmarked Sterling Silver, 1-micron gold plating",
                "is_natural": 0,
                "is_published": 1,
                "tags": ["clasp", "silver", "gold-plated", "findings", "accessories"],
                "variants": [
                    {
                        "id": "var-7-1",
                        "sku": "CLP-GLD-925",
                        "color": "Gold",
                        "size_mm": 14.0,
                        "hole_diameter_mm": 1.2,
                        "finish": "Antique Polish",
                        "material_type": "metal",
                        "price": 850.0,
                        "sale_unit": "piece",
                        "stock_quantity": 200,
                        "images": [
                            {"id": "img-8", "url": "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80", "alt_text": "Filigree Pearl Clasp", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            },
            {
                "id": "prod-8",
                "name": "Tahitian Peacock Black Pearl Strand (9-11mm)",
                "slug": "tahitian-peacock-black-pearl-strand",
                "short_description": "Mystical natural dark Tahitian pearls showing green, aubergine, and peacock overtone.",
                "description": "Cultivated in French Polynesia, these genuine dark Tahitian cultured pearls shimmer with elusive iridescent peacock green and violet undertones. Truly one-of-a-kind.",
                "category_id": "cat-2",
                "shape": "Round",
                "material": "Pearl",
                "origin": "Tahiti",
                "quality_notes": "Natural dark color without treatment, AA+ luster",
                "is_natural": 1,
                "is_published": 1,
                "tags": ["tahitian", "black-pearl", "peacock", "pearl", "exotic"],
                "variants": [
                    {
                        "id": "var-8-1",
                        "sku": "TAH-BLK-911MM",
                        "color": "Black",
                        "size_mm": 10.0,
                        "hole_diameter_mm": 0.8,
                        "finish": "Peacock Iridescence",
                        "material_type": "natural",
                        "price": 9500.0,
                        "sale_unit": "strand",
                        "stock_quantity": 18,
                        "images": [
                            {"id": "img-9", "url": "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80", "alt_text": "Tahitian Black Pearl Strand", "sort_order": 1, "is_primary": True}
                        ]
                    }
                ]
            }
        ]

        for p in products_data:
            c.execute("""
            INSERT INTO products (
                id, name, slug, description, short_description, category_id,
                shape, material, origin, quality_notes, is_natural, is_published,
                tags, average_rating, review_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.9, 16, ?, ?)
            """, (
                p["id"], p["name"], p["slug"], p["description"], p["short_description"],
                p["category_id"], p["shape"], p["material"], p["origin"], p["quality_notes"],
                p["is_natural"], p["is_published"], json.dumps(p["tags"]), now, now
            ))

            for v in p["variants"]:
                c.execute("""
                INSERT INTO product_variants (
                    id, product_id, sku, color, size_mm, hole_diameter_mm,
                    finish, material_type, price, currency, sale_unit,
                    stock_quantity, reserved_quantity, available_quantity,
                    images, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, 0, ?, ?, 1)
                """, (
                    v["id"], p["id"], v["sku"], v["color"], v["size_mm"],
                    v["hole_diameter_mm"], v["finish"], v["material_type"],
                    v["price"], v["sale_unit"], v["stock_quantity"],
                    v["stock_quantity"], json.dumps(v["images"])
                ))

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized & seeded successfully!")
