from app.db.models import Merchant, Product

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["backend"] == "online"
    assert data["sqlite"] == "connected"
    assert data["phase"] == "5 / 5"
    assert "groq" in data
    assert "growth_ml" in data

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["phase"] == "5 / 5"

def test_database_persistence(db_session):
    # Verify seeded merchants exist
    merchants = db_session.query(Merchant).all()
    assert len(merchants) >= 3

    # Verify seeded products exist
    products = db_session.query(Product).all()
    assert len(products) >= 3

    # Add custom merchant
    new_merchant = Merchant(name="Test Merchant Corp", description="Testing merchant creation")
    db_session.add(new_merchant)
    db_session.commit()

    retrieved = db_session.query(Merchant).filter(Merchant.name == "Test Merchant Corp").first()
    assert retrieved is not None
    assert retrieved.description == "Testing merchant creation"
