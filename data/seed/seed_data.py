import json
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.db.models import Merchant, Product, ProductAttribute

SEED_MERCHANTS: List[Dict[str, Any]] = [
    {
        "id": "MER-GOASTAY",
        "name": "GoaStay",
        "description": "Premier coastal boutique stays and budget beachfront getaways in Goa.",
    },
    {
        "id": "MER-TRAVNST",
        "name": "TravelNest",
        "description": "Curated holiday properties and verified resort stays across India.",
    },
    {
        "id": "MER-COASTAL",
        "name": "Coastal Hotels",
        "description": "Affordable comfort and authentic hospitality along India's coastline.",
    },
    {
        "id": "MER-TECHHUB",
        "name": "TechHub Direct",
        "description": "Authorized enterprise & consumer computing hardware retailer.",
    },
    {
        "id": "MER-SPORTYX",
        "name": "SportyNation",
        "description": "High-performance athletic apparel, trail, and running footwear.",
    },
]

SEED_PRODUCTS: List[Dict[str, Any]] = [
    {
        "id": "PRD-GOA-01",
        "merchant_id": "MER-GOASTAY",
        "name": "Goa Beach Hotel",
        "description": "Standard AC room steps away from Calangute beach with complimentary breakfast.",
        "category": "hotel",
        "price": 2500.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "location": "Goa",
            "neighborhood": "Calangute",
            "room_type": "Deluxe King",
            "amenity": "Free WiFi, AC, Breakfast Included",
            "rating": "4.8",
        },
    },
    {
        "id": "PRD-GOA-02",
        "merchant_id": "MER-TRAVNST",
        "name": "Palm Grove Resort",
        "description": "Serene garden view cottage in Candolim featuring outdoor swimming pool.",
        "category": "hotel",
        "price": 2800.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "location": "Goa",
            "neighborhood": "Candolim",
            "room_type": "Garden Villa",
            "amenity": "Swimming Pool, Free WiFi, Restaurant",
            "rating": "4.5",
        },
    },
    {
        "id": "PRD-GOA-03",
        "merchant_id": "MER-COASTAL",
        "name": "Coastal Breeze Inn",
        "description": "Budget-friendly, ultra-clean guest lodge near Anjuna flea market.",
        "category": "hotel",
        "price": 2700.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "location": "Goa",
            "neighborhood": "Anjuna",
            "room_type": "Standard Queen",
            "amenity": "Free WiFi, Parking, 24/7 Front Desk",
            "rating": "4.0",
        },
    },
    {
        "id": "PRD-GOA-04",
        "merchant_id": "MER-GOASTAY",
        "name": "Sunset Residency",
        "description": "Luxury sea-facing suite with panoramic balcony views of Morjim beach.",
        "category": "hotel",
        "price": 4500.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "location": "Goa",
            "neighborhood": "Morjim",
            "room_type": "Ocean View Suite",
            "amenity": "Ocean View, Spa, Infinity Pool, Gourmet Breakfast",
            "rating": "4.8",
        },
    },
    {
        "id": "PRD-TECH-01",
        "merchant_id": "MER-TECHHUB",
        "name": "ZenBook 14 Ultralight Laptop",
        "description": "14-inch FHD OLED, Intel Core Ultra 5, 16GB RAM, 512GB SSD.",
        "category": "laptop",
        "price": 48999.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "brand": "Asus",
            "screen_size": "14 inch",
            "ram": "16GB",
            "storage": "512GB SSD",
        },
    },
    {
        "id": "PRD-SHOE-01",
        "merchant_id": "MER-SPORTYX",
        "name": "Aegis Velocity Running Shoes",
        "description": "Lightweight breathable mesh athletic runners with responsive cushioned foam.",
        "category": "shoes",
        "price": 2499.0,
        "currency": "INR",
        "availability": True,
        "attributes": {
            "brand": "Velocity",
            "type": "Running Shoes",
            "cushioning": "Max Air",
            "color": "Midnight Black",
        },
    },
]

def seed_database(db: Session) -> None:
    """Idempotently seed merchants and products into the database."""
    # Seed merchants
    for m_data in SEED_MERCHANTS:
        existing = db.query(Merchant).filter(Merchant.id == m_data["id"]).first()
        if not existing:
            merchant = Merchant(
                id=m_data["id"],
                name=m_data["name"],
                description=m_data["description"],
            )
            db.add(merchant)
    db.commit()

    # Seed products and attributes
    for p_data in SEED_PRODUCTS:
        existing_p = db.query(Product).filter(Product.id == p_data["id"]).first()
        if not existing_p:
            product = Product(
                id=p_data["id"],
                merchant_id=p_data["merchant_id"],
                name=p_data["name"],
                description=p_data["description"],
                category=p_data["category"],
                price=p_data["price"],
                currency=p_data["currency"],
                availability=p_data["availability"],
            )
            db.add(product)
            db.flush()

            # Add attributes
            for key, val in p_data.get("attributes", {}).items():
                attr = ProductAttribute(
                    product_id=product.id,
                    key=key,
                    value=str(val),
                )
                db.add(attr)
    db.commit()

if __name__ == "__main__":
    from app.db.database import get_db_context, init_db
    init_db()
    with get_db_context() as session:
        seed_database(session)
        print("Database seeded successfully.")
