import os
import io
import math
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Trash2TreasureAPI")

# Benchmark date for date parsing calculations
TODAY_DATE = datetime(2026, 6, 19)

app = FastAPI(
    title="Trash to Treasure API",
    description="Smart Inventory Management and AI-driven Clearance Sales Agent backend",
    version="1.0.0"
)

# Enable CORS for local cross-origin fetches (e.g. if running index.html directly from disk)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for type safety
class ProductInput(BaseModel):
    name: str
    sku: str
    category: str
    quantity: int
    price: float
    sold30: int
    sold90: int
    expiryDate: Optional[str] = ""

class AgentRequest(BaseModel):
    products: List[Dict[str, Any]]
    discount_mode: str = "balanced"
    persona: str = "excited"

# ==========================================
# 1. Column Synonym Matcher
# ==========================================
def map_dataframe_headers(columns: List[str]) -> Dict[str, str]:
    mapping = {}
    header_synonyms = {
        "name": ["product name", "product", "name", "item name", "item", "title"],
        "sku": ["sku", "stock keeping unit", "sku code", "code", "id", "product id"],
        "category": ["category", "product category", "dept", "department", "type"],
        "quantity": ["quantity in stock", "quantity", "stock quantity", "stock", "qty", "in stock", "units in stock"],
        "price": ["current price", "price", "retail price", "unit price", "cost"],
        "sold30": ["units sold last 30 days", "sold last 30 days", "sold30", "units sold 30 days", "sales 30d", "sold 30d", "30 days sold", "sold_30"],
        "sold90": ["units sold last 90 days", "sold last 90 days", "sold90", "units sold 90 days", "sales 90d", "sold 90d", "90 days sold", "sold_90"],
        "expiryDate": ["expiry date", "expiry", "exp date", "expiration date", "expiration", "expires"]
    }

    for col in columns:
        normalized = str(col).lower().strip()
        matched = False
        
        for key, synonyms in header_synonyms.items():
            if normalized in synonyms or any(syn in normalized for syn in synonyms):
                mapping[key] = col
                matched = True
                break
        
        if not matched:
            # Try partial matching on key names
            for key in header_synonyms.keys():
                if key in normalized:
                    mapping[key] = col
                    break
                    
    return mapping

# ==========================================
# 2. Inventory Classification Logic
# ==========================================
def calculate_product_metrics(row: Dict[str, Any]) -> Dict[str, Any]:
    qty = max(0, int(row.get("quantity", 0)))
    price = max(0.0, float(row.get("price", 0.0)))
    sold30 = max(0, int(row.get("sold30", 0)))
    sold90 = max(0, int(row.get("sold90", 0)))
    
    velocity30 = round(sold30 / 30.0, 3)
    velocity90 = round(sold90 / 90.0, 3)
    daily_velocity = velocity30
    
    inventory_value = round(qty * price, 2)
    
    # Days Sales of Inventory (DSI)
    dsi = float('inf')
    if daily_velocity > 0:
        dsi = round(qty / daily_velocity, 1)
    elif qty > 0:
        if velocity90 > 0:
            dsi = round(qty / velocity90, 1)
            
    # Annualized Inventory Turnover Rate
    turnover_rate = 0.0
    if qty > 0:
        # Annualized sales based on 90d volume
        annualized_sales = sold90 * 4.055
        turnover_rate = round(annualized_sales / qty, 2)

    # Risk Score Formulation
    risk_score = 0
    reason = "Healthy stock turnover"
    
    if qty == 0:
        risk_score = 0
        reason = "Out of stock"
    else:
        # A. Sales performance checks
        if sold90 == 0:
            risk_score = 85
            reason = "No sales recorded in the last 90 days"
        elif sold30 == 0:
            risk_score = 60
            reason = "No sales recorded in the last 30 days"
        else:
            # DSI based risk scaling
            if dsi > 365:
                risk_score = min(80, 50 + int((dsi - 365) // 10))
                reason = f"High stock levels: approx. {int(dsi)} days of inventory on hand"
            elif dsi > 180:
                risk_score = min(50, 30 + int((dsi - 180) // 6))
                reason = f"Excess stock: approx. {int(dsi)} days of inventory on hand"
            elif dsi > 90:
                risk_score = min(30, 10 + int((dsi - 90) // 4.5))
                reason = f"Slow movement: approx. {int(dsi)} days of inventory on hand"
            else:
                risk_score = min(10, int(dsi // 9))
                reason = f"Healthy stock turnover: {int(dsi)} days of inventory on hand"

        # B. Expiry date risk modifiers
        exp_date_raw = row.get("expiryDate")
        if exp_date_raw and str(exp_date_raw).strip() and str(exp_date_raw).lower() != "nan":
            try:
                # Clean date formatting
                exp_date_str = str(exp_date_raw).strip().split(" ")[0]
                exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d")
                
                diff_time = exp_date - TODAY_DATE
                diff_days = diff_time.days
                
                if diff_days < 0:
                    risk_score = 100;
                    reason = f"Product expired on {exp_date_str}"
                elif diff_days <= 30:
                    risk_score = max(risk_score, 95)
                    reason = f"Urgent: Product expires in {diff_days} days ({exp_date_str})"
                elif diff_days <= 90:
                    risk_score = max(risk_score, 75)
                    reason = f"Warning: Product expires in {diff_days} days ({exp_date_str})"
                elif diff_days <= 180:
                    risk_score = max(risk_score, min(risk_score + 15, 70))
                    reason += f" (Expires in {diff_days} days)"
            except Exception as e:
                logger.error(f"Failed parsing expiry date: {exp_date_raw}. Details: {e}")

    # Map classifications
    classification = "Healthy"
    if risk_score >= 75:
        classification = "Dead Stock"
    elif risk_score >= 35:
        classification = "Slow-Moving"
    else:
        classification = "Fast-Moving"

    return {
        "name": row.get("name"),
        "sku": row.get("sku"),
        "category": row.get("category"),
        "quantity": qty,
        "price": price,
        "sold30": sold30,
        "sold90": sold90,
        "expiryDate": str(row.get("expiryDate")) if row.get("expiryDate") else "",
        "inventoryValue": inventoryValue,
        "dailyVelocity": daily_velocity,
        "dsi": "N/A" if dsi == float('inf') else dsi,
        "turnoverRate": turnover_rate,
        "riskScore": risk_score,
        "classification": classification,
        "classificationReason": reason
    }

# ==========================================
# 3. API Endpoints
# ==========================================
@app.post("/api/upload")
async def upload_inventory(file: UploadFile = File(...)):
    filename = file.filename
    extension = filename.split(".")[-1].lower()
    
    contents = await file.read()
    
    try:
        if extension == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        elif extension in ["xlsx", "xls"]:
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel files.")
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse spreadsheet: {str(e)}")

    # Clean headers
    df.columns = [str(col).strip() for col in df.columns]
    header_map = map_dataframe_headers(list(df.columns))
    
    # Validation checks
    required = ["name", "sku", "category", "quantity", "price", "sold30", "sold90"]
    missing = [req for req in required if req not in header_map]
    
    if missing:
        readable_missing = [req.replace("sold30", "Units Sold Last 30 Days").replace("sold90", "Units Sold Last 90 Days") for req in missing]
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required columns in sheet: {', '.join(readable_missing)}. Please verify layout guidelines."
        )

    # Process and build product dictionaries
    products = []
    for _, row in df.iterrows():
        product_dict = {
            "name": row[header_map["name"]],
            "sku": row[header_map["sku"]],
            "category": row[header_map["category"]],
            "quantity": row[header_map["quantity"]],
            "price": row[header_map["price"]],
            "sold30": row[header_map["sold30"]],
            "sold90": row[header_map["sold90"]],
            "expiryDate": row[header_map["expiryDate"]] if "expiryDate" in header_map else ""
        }
        
        # Clean null values
        for k, v in product_dict.items():
            if pd.isna(v):
                product_dict[k] = "" if k in ["name", "sku", "category", "expiryDate"] else 0
                
        analyzed = calculate_product_metrics(product_dict)
        products.append(analyzed)

    # Calculate summary metrics
    total_products = len(products)
    total_value = sum(p["inventoryValue"] for p in products)
    fast_moving = sum(1 for p in products if p["classification"] == "Fast-Moving")
    slow_moving = sum(1 for p in products if p["classification"] == "Slow-Moving")
    dead_stock = sum(1 for p in products if p["classification"] == "Dead Stock")

    return {
        "summary": {
            "totalProducts": total_products,
            "totalValue": round(total_value, 2),
            "fastMovingCount": fast_moving,
            "slowMovingCount": slow_moving,
            "deadStockCount": dead_stock
        },
        "products": products
    }

@app.post("/api/analyze-agent")
async def analyze_agent(req: AgentRequest):
    try:
        from backend.agent import SalesAgent
        agent = SalesAgent()
        
        result = agent.run_workflow(
            products=req.products,
            discount_mode=req.discount_mode,
            persona=req.persona
        )
        return result
    except Exception as e:
        logger.error(f"Error executing agent workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Agent workflow error: {str(e)}")

# ==========================================
# 4. Mount Frontend Static Files
# ==========================================
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
    logger.info(f"Mounted frontend static directory at: {frontend_path}")
else:
    logger.warning(f"Frontend static directory not found at: {frontend_path}. Backend endpoints will still be active.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
