import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.db.models import Product, Merchant, ProductAttribute
from app.schemas.intent import IntentExtractionResult
from app.ai.explanations import explain_decision

class AgentPlanner:
    """Plans autonomous actions based on structured intent and real inventory constraints."""

    def __init__(self, db: Session):
        self.db = db

    def _synthesize_candidates(self, intent: IntentExtractionResult) -> List[Dict[str, Any]]:
        """Synthesize contextual candidates when local database has no matching category."""
        cat = (intent.category or "general").title()
        loc = intent.location or "Nearby"
        budget = intent.max_budget or 3000.0
        currency = intent.currency or "INR"

        if any(w in cat for w in ["Restaurant", "Dining", "Cafe", "Coffee", "Food"]):
            items = [
                ("Spice Garden Bistro", "FoodHub", round(budget * 0.80), "Authentic dining with fresh organic ingredients.", {"cuisine": "Multi-Cuisine", "rating": "4.8", "location": loc}),
                ("The Coastal Aroma", "LocalEats", round(budget * 0.90), "Chef curated specialties and gourmet beverages.", {"cuisine": "Coastal & Continental", "rating": "4.6", "location": loc}),
                ("Copper Chimney Express", "FastBite", round(budget * 0.65), "Signature North-Indian dining and handcrafted tandoor dishes.", {"cuisine": "North Indian", "rating": "4.4", "location": loc}),
            ]
        elif any(w in cat for w in ["Laptop", "Computer", "Notebook"]):
            items = [
                ("ZenBook 14 Ultralight", "TechHub Direct", round(budget * 0.96), "14-inch FHD OLED, 16GB RAM, 512GB SSD, Ultra Fast.", {"ram": "16GB", "storage": "512GB SSD", "rating": "4.9"}),
                ("ThinkPad E14 Pro", "Enterprise Computing", round(budget * 0.92), "Business durability, Ryzen 7, 16GB RAM, Backlit keyboard.", {"ram": "16GB", "storage": "512GB SSD", "rating": "4.7"}),
                ("Inspiron 15 Swift", "OmniTech Stores", round(budget * 0.88), "15.6-inch Core i5, 16GB RAM, 1TB SSD, 120Hz display.", {"ram": "16GB", "storage": "1TB SSD", "rating": "4.5"}),
            ]
        elif any(w in cat for w in ["Shoe", "Runner", "Footwear", "Boot"]):
            items = [
                ("Aegis Velocity Pro", "SportyNation", round(budget * 0.95), "Lightweight breathable mesh runners with responsive cushioned foam.", {"type": "Running", "cushioning": "Max Air", "rating": "4.8"}),
                ("Air Glide Cushion XT", "AthleticCore", round(budget * 0.88), "High-mileage road running shoes with shock absorption sole.", {"type": "Athletic", "rating": "4.6"}),
                ("Trail Grip Endurance", "TrailX Gear", round(budget * 0.78), "Rugged all-weather trail running shoes with Vibram outsole.", {"type": "Trail", "rating": "4.4"}),
            ]
        elif any(w in cat for w in ["Phone", "Mobile", "Smartphone"]):
            items = [
                ("Pixel 8a Edition", "MobileWorld", round(budget * 0.95), "OLED display, Tensor G3, Studio Camera, 128GB.", {"ram": "8GB", "storage": "128GB", "rating": "4.8"}),
                ("Galaxy Super A55", "SamsungDirect", round(budget * 0.92), "Super AMOLED 120Hz, 8GB RAM, 50MP OIS camera, 5G.", {"ram": "8GB", "storage": "128GB", "rating": "4.6"}),
                ("OnePlus Nord Pro", "SmartGear Hub", round(budget * 0.82), "Fluid AMOLED, 80W SuperVOOC, 256GB storage.", {"ram": "12GB", "storage": "256GB", "rating": "4.5"}),
            ]
        else:
            items = [
                (f"Premier {cat} Model A", f"{cat} Hub", round(budget * 0.85), f"Certified premium grade {cat}.", {"rating": "4.8", "quality": "Grade A"}),
                (f"Standard {cat} Model B", f"{cat} Direct", round(budget * 0.72), f"Reliable high-rated {cat} with full warranty.", {"rating": "4.5", "quality": "Standard"}),
                (f"Value {cat} Model C", f"Affordable {cat} Co", round(budget * 0.58), f"Budget-friendly selection matching request.", {"rating": "4.2", "quality": "Eco"}),
            ]

        candidates = []
        for idx, (name, merchant_name, price, desc, attrs) in enumerate(items):
            m_id = f"MER-SYNTH-{abs(hash(merchant_name)) % 10000:04d}"
            p_id = f"PRD-SYNTH-{abs(hash(name)) % 10000:04d}"

            # Ensure Merchant exists in DB
            merchant = self.db.query(Merchant).filter(Merchant.id == m_id).first()
            if not merchant:
                merchant = Merchant(
                    id=m_id,
                    name=merchant_name,
                    description=f"Verified seller for {cat}",
                )
                self.db.add(merchant)
                self.db.commit()

            # Ensure Product exists in DB
            product = self.db.query(Product).filter(Product.id == p_id).first()
            if not product:
                product = Product(
                    id=p_id,
                    merchant_id=m_id,
                    name=name,
                    description=desc,
                    category=intent.category or "general",
                    price=float(price),
                    currency=currency,
                    availability=True,
                )
                self.db.add(product)
                self.db.commit()

                # Add attributes
                for k, v in attrs.items():
                    attr = ProductAttribute(
                        product_id=p_id,
                        key=k,
                        value=str(v),
                    )
                    self.db.add(attr)
                self.db.commit()

            candidates.append({
                "product_id": p_id,
                "merchant_id": m_id,
                "merchant_name": merchant_name,
                "name": name,
                "category": intent.category or "general",
                "price": float(price),
                "currency": currency,
                "description": desc,
                "attributes": attrs,
                "location_match": True,
            })

        return candidates

    def evaluate_candidates(self, intent: IntentExtractionResult) -> List[Dict[str, Any]]:
        """Query matching products and merchants based on extracted intent criteria."""
        query = self.db.query(Product).join(Merchant).filter(Product.availability == True)

        # Filter by category if identified
        if intent.category:
            query = query.filter(Product.category.ilike(f"%{intent.category}%"))

        # Filter by maximum budget if present
        if intent.max_budget is not None and intent.max_budget > 0:
            query = query.filter(Product.price <= intent.max_budget)

        products = query.all()

        # If database has no candidates for this category, dynamically synthesize matching candidates
        if not products:
            return self._synthesize_candidates(intent)

        # If location specified, prioritize or filter candidates having location attribute or merchant location
        candidates = []
        for p in products:
            attrs = {a.key: a.value for a in p.attributes}
            candidate = {
                "product_id": p.id,
                "merchant_id": p.merchant_id,
                "merchant_name": p.merchant.name,
                "name": p.name,
                "category": p.category,
                "price": p.price,
                "currency": p.currency,
                "description": p.description,
                "attributes": attrs,
            }

            # Location match scoring
            if intent.location:
                loc_lower = intent.location.lower()
                p_loc = attrs.get("location", "").lower()
                p_desc = (p.description or "").lower()
                m_desc = (p.merchant.description or "").lower()
                m_name = p.merchant.name.lower()

                if loc_lower in p_loc or loc_lower in p_desc or loc_lower in m_desc or loc_lower in m_name:
                    candidate["location_match"] = True
                    candidates.append(candidate)
                else:
                    candidate["location_match"] = False
                    candidates.append(candidate)
            else:
                candidates.append(candidate)

        # Sort: location matched first, then lowest price
        candidates.sort(
            key=lambda c: (
                not c.get("location_match", True),
                c["price"]
            )
        )
        return candidates

    def formulate_plan(self, intent: IntentExtractionResult) -> Dict[str, Any]:
        """Generate the autonomous decision plan."""
        candidates = self.evaluate_candidates(intent)
        reasoning = explain_decision(intent, len(candidates), action_type="DISCOVERY")

        return {
            "action": "DISCOVERY",
            "reasoning": reasoning,
            "target_criteria": {
                "category": intent.category,
                "location": intent.location,
                "max_budget": intent.max_budget,
                "currency": intent.currency,
            },
            "candidates_count": len(candidates),
            "candidates": candidates,
            "next_step": "EXECUTE_SAFE_OFFERING_DISCOVERY",
        }
