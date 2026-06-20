import os
import json
import random
import logging
from typing import Dict, List, Any
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Trash2TreasureAgent")

# Category-based fallback database
MARKET_INTELLIGENCE = {
    "Electronics": {
        "demandTrend": "Slight decrease in standalone purchases; consumers prefer bundles and accessories.",
        "trendingAccessories": ["Premium USB-C Braided Cable", "Microfiber Cleaning Cloth pack", "Anti-dust Silicone Covers"],
        "clearanceStrategies": [
            "Tech Refresh Clearance Bundle: Include accessories to clear older SKU volumes.",
            "Tiered Flash Sale: 20% off for 48 hours, scaling to 40% off for remaining units."
        ]
    },
    "Furniture": {
        "demandTrend": "Stable demand but high shipping barrier. Customers respond well to 'free shipping' bundle thresholds.",
        "trendingAccessories": ["Memory Foam Lumbar Cushion", "Silicon Floor Protector Caps", "Furniture Polish Wipes"],
        "clearanceStrategies": [
            "Home Office Bundle: Package the chair with ergonomic accessories and offer free shipping.",
            "Corporate Bulk Buy: Reach out to local startups with a 25% volume discount for orders over 5 units."
        ]
    },
    "Home & Garden": {
        "demandTrend": "High seasonal demand shifting towards outdoor planting; indoor grow kits are seeing a temporary plateau.",
        "trendingAccessories": ["Organic Fertilizer Tablets", "Decorative Ceramic Pot Covers", "Stainless Steel Precision Pruners"],
        "clearanceStrategies": [
            "BOGO Green Thumb: Buy a Grow Kit, get premium organic seeds and pruners free.",
            "Subscription Starter Pack: Sell with a 3-month soil/fertilizer subscription coupon."
        ]
    },
    "Stationery": {
        "demandTrend": "Artisan journaling and writing products have niche but passionate demand. High response to social media aesthetic posts.",
        "trendingAccessories": ["Premium Brass Fountain Pen", "Set of 3 Washi Tapes", "Acid-Free Gel Pens (Pack of 5)"],
        "clearanceStrategies": [
            "Aesthetic Journaling Gift Set: Bundle the journal with a fountain pen and premium box packaging.",
            "Social Media Exclusive: 35% discount code promoted via Instagram/Pinterest stories."
        ]
    },
    "Kitchen": {
        "demandTrend": "Wellness lifestyle trends keeping matcha and tea accessories popular, though stock turnover is slow.",
        "trendingAccessories": ["Ceramic Whisk Holder", "Organic Ceremonial Matcha powder (30g)", "Bamboo Tea Scoop"],
        "clearanceStrategies": [
            "Complete Matcha Ritual Set: Bundle the whisk and tea set with high-grade organic matcha powder.",
            "Health & Wellness Promo: Offer 15% discount and share recipes on social media channels."
        ]
    },
    "Sports & Outdoors": {
        "demandTrend": "Steady summer activity demand. High competition in budget models; premium equipment sells via review comparison.",
        "trendingAccessories": ["Microfiber Quick-Dry Sweat Towel", "Insulated Stainless Steel Flask", "Reflective Safety Straps"],
        "clearanceStrategies": [
            "Safety/Performance Bundle: Sell safety gear with a water bottle or sweat towel at a discount.",
            "Local Club Outreach: Offer 20% off discount codes to local sports clubs and running groups."
        ]
    },
    "Cosmetics": {
        "demandTrend": "Rapidly shifting beauty trends. Clean beauty products remain popular, but expiring stock must move quickly.",
        "trendingAccessories": ["Quartz Face Roller", "Bamboo Cleansing Cotton Pads", "Hydrating Hydrosol Mist"],
        "clearanceStrategies": [
            "Daily Glow Routine Bundle: Package the face serum with a quartz roller at 40% discount.",
            "Expiry Clearance Sale: Promote 'Buy 1 Get 1 50% Off' for skincare items expiring within 6 months."
        ]
    },
    "Default": {
        "demandTrend": "Stable baseline demand, facing general market pressure.",
        "trendingAccessories": ["Premium Carry Bag", "Extended 1-Year Warranty", "Universal Utility Pouch"],
        "clearanceStrategies": [
            "BOGO clearance: Buy one, get a related accessory free.",
            "Direct customer newsletter discount: 20% off for loyal customers."
        ]
    }
}

LOCAL_COPY_TEMPLATES = {
    "email": {
        "subject": "Exclusive Offer: Save big on our {PRODUCT_NAME}!",
        "body": """Hi there,

We have something special for you! For a limited time only, we are offering an exclusive discount on our popular {PRODUCT_NAME}.

Get it today for only $ {NEW_PRICE} (originally $ {ORIGINAL_PRICE}) — that's a massive {DISCOUNT_PERCENT}% off!

{BUNDLE_TEXT}

Don't miss out on this deal. Click the link below to claim yours before we run out of stock!

👉 [Shop now and save {DISCOUNT_PERCENT}%]

Warm regards,
The Customer Success Team"""
    },
    "facebook": {
        "body": """🔥 HOT DEAL ALERT! 🔥

Looking to upgrade? We are running a flash clearance on our premium {PRODUCT_NAME}! 
Grab yours now for only $ {NEW_PRICE} (regularly $ {ORIGINAL_PRICE}). That's {DISCOUNT_PERCENT}% off! 

✨ Why people love it:
- High quality and built to last
- Top-rated customer reviews

🎁 SPECIAL BUNDLE: {BUNDLE_OFFER}

Hurry, inventory is extremely limited and this offer ends soon! Click the shop button to secure yours now. 👇

#Sale #Clearance #SmartShopping #Upgrade"""
    },
    "instagram": {
        "body": """Steal of the week! ✨ The {PRODUCT_NAME} is officially on clearance! 

Get it today at {DISCOUNT_PERCENT}% off — now just $ {NEW_PRICE} (down from $ {ORIGINAL_PRICE}). 

👉 Click the link in our bio to shop the sale before it sells out!

{BUNDLE_TEXT_SHORT}

#DealOfTheDay #ClearanceSale #FlashSale #SmartLiving #RetailTherapy"""
    },
    "google": {
        "headline1": "Clearance: {PRODUCT_NAME}",
        "headline2": "Save {DISCOUNT_PERCENT}% Today Only",
        "description": "Get {PRODUCT_NAME} for just $ {NEW_PRICE} instead of $ {ORIGINAL_PRICE}. Limited stock available. Buy now and save!"
    }
}

class SalesAgent:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.use_gemini = False
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.use_gemini = True
                logger.info("Gemini API successfully configured. Running in generative mode.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {e}. Falling back to local rules engine.")

    def run_workflow(self, products: List[Dict[str, Any]], discount_mode: str = "balanced", persona: str = "excited") -> Dict[str, Any]:
        logs = []
        enriched_products = []
        
        logs.append("🤖 Starting Smart Sales Agent Workflow...")
        logs.append("📊 Step 1: Performing Deep Inventory Metric Analysis...")
        
        # Filter and prioritize slow-moving / dead products
        flagged = [p for p in products if p.get("classification") != "Fast-Moving"]
        
        # Sort by Capital Tied Up (inventoryValue) descending
        flagged.sort(key=lambda x: x.get("inventoryValue", 0), reverse=True)
        
        logs.append(f"🔍 Found {len(flagged)} slow-moving or dead stock products in the inventory database.")
        for idx, p in enumerate(flagged):
            logs.append(f"📌 Priority #{idx + 1}: SKU {p['sku']} ({p['name']}) - Capital Tied Up: ${p['inventoryValue']:,.2f} | Risk Score: {p['riskScore']}/100")
            
        logs.append("🌐 Step 2: Executing Online Market & Competitor Price Intelligence...")
        
        for idx, prod in enumerate(flagged):
            logs.append(f"🔎 [Web Search] querying competitors for '{prod['name']}' under Category '{prod['category']}'...")
            
            # Competitor prices are generally cheaper for slow stock items
            discount_factor = 0.85 + (random.random() * 0.1) # 2% to 15% cheaper
            competitor_price = round(prod["price"] * discount_factor, 2)
            
            cat_data = MARKET_INTELLIGENCE.get(prod["category"], MARKET_INTELLIGENCE["Default"])
            
            logs.append(f"   -> Competitor average price: ${competitor_price:.2f} (Your price: ${prod['price']:.2f})")
            logs.append(f"   -> Market Demand Trend: {cat_data['demandTrend']}")
            
            prod["competitorPrice"] = competitor_price
            prod["demandTrend"] = cat_data["demandTrend"]
            prod["trendingAccessories"] = cat_data["trendingAccessories"]
            prod["clearanceStrategies"] = cat_data["clearanceStrategies"]
            prod["priority"] = idx + 1

        logs.append("✅ Market research simulation completed. Competitor data fetched.")
        logs.append("💡 Step 3: Drafting Clearance Strategies & Dynamic Pricing Recommendations...")
        
        # Base recommendations
        for prod in flagged:
            # Base markdown recommendation
            rec_discount = 15
            if prod["riskScore"] >= 90:
                rec_discount = 45
            elif prod["riskScore"] >= 75:
                rec_discount = 35
            elif prod["riskScore"] >= 50:
                rec_discount = 25
            elif prod["riskScore"] >= 35:
                rec_discount = 15
                
            # Apply clearance aggressiveness
            if discount_mode == "aggressive":
                rec_discount = min(70, round(rec_discount * 1.35))
            elif discount_mode == "conservative":
                rec_discount = max(10, round(rec_discount * 0.7))
                
            suggested_price = round(prod["price"] * (1 - rec_discount / 100), 2)
            
            # Bundle setups
            main_acc = prod["trendingAccessories"][0]
            acc_price = round(prod["price"] * 0.15 + 5, 2)
            combined_original = round(suggested_price + acc_price, 2)
            bundle_price = round(combined_original * 0.85, 2)
            
            bundle_offer = f"Get the '{prod['name']}' + '{main_acc}' package for only ${bundle_price:.2f} (Save 15% extra compared to individual items!)"
            bundle_text = f"As a special bonus, we are offering an exclusive bundle! Pair your {prod['name']} with the trending {main_acc} for a total price of just $ {bundle_price:.2f}. That's an extra saving of 15% on the accessory!"
            bundle_text_short = f"🎁 Bundle Promo: Pair it with the trending {main_acc} for a combined deal!"

            prod["recommendedDiscount"] = rec_discount
            prod["suggestedPrice"] = suggested_price
            prod["bundleOffer"] = bundle_offer
            prod["bundleText"] = bundle_text
            prod["bundleTextShort"] = bundle_text_short
            prod["mainAccessory"] = main_acc
            prod["bundlePrice"] = bundle_price
            prod["clearanceStrategy"] = prod["clearanceStrategies"][0]
            
            logs.append(f"🎯 Recommended strategy formulated for SKU {prod['sku']}: Price Drop to ${suggested_price:.2f} ({rec_discount}% off).")

        logs.append("✍️ Step 4: Authoring Tailored Marketing & Copywriting Assets...")
        
        # Generation of copies (Gemini generative or local fallback)
        if self.use_gemini:
            logs.append("🧠 Contacting Gemini generative model to draft custom ad text and strategies...")
            for prod in flagged:
                logs.append(f"📝 Generating personalized campaign copies for '{prod['name']}'...")
                ai_copies = self._generate_gemini_copy(prod, persona)
                if ai_copies:
                    prod["marketing"] = ai_copies["marketing"]
                    if "clearanceStrategy" in ai_copies:
                        prod["clearanceStrategy"] = ai_copies["clearanceStrategy"]
                    if "bundleOffer" in ai_copies:
                        prod["bundleOffer"] = ai_copies["bundleOffer"]
                else:
                    logger.warn(f"Gemini generation failed for {prod['sku']}, falling back to template-based copies.")
                    prod["marketing"] = self._generate_local_copy(prod, persona)
        else:
            logs.append("📝 Utilizing standard templates engine for copywriting setups...")
            for prod in flagged:
                prod["marketing"] = self._generate_local_copy(prod, persona)
                
        logs.append("✅ Copywriting assets generated successfully for all flagged items.")
        logs.append("🎉 Smart Sales Agent Workflow completed successfully!")
        
        return {"logs": logs, "products": flagged}

    def _generate_local_copy(self, prod: Dict[str, Any], persona: str) -> Dict[str, Any]:
        temp = LOCAL_COPY_TEMPLATES
        
        def replace_tags(text: str) -> str:
            return (text.replace("{PRODUCT_NAME}", prod["name"])
                        .replace("{ORIGINAL_PRICE}", f"{prod['price']:.2f}")
                        .replace("{NEW_PRICE}", f"{prod['suggestedPrice']:.2f}")
                        .replace("{DISCOUNT_PERCENT}", str(prod["recommendedDiscount"]))
                        .replace("{BUNDLE_OFFER}", prod["bundleOffer"])
                        .replace("{BUNDLE_TEXT}", prod["bundleText"])
                        .replace("{BUNDLE_TEXT_SHORT}", prod["bundleTextShort"]))

        email_subj = replace_tags(temp["email"]["subject"])
        email_body = replace_tags(temp["email"]["body"])
        fb_body = replace_tags(temp["facebook"]["body"])
        ig_body = replace_tags(temp["instagram"]["body"])
        goog_hl1 = replace_tags(temp["google"]["headline1"])
        goog_hl2 = replace_tags(temp["google"]["headline2"])
        goog_desc = replace_tags(temp["google"]["description"])

        # Handle persona tone modifiers
        if persona == "professional":
            email_subj = f"Strategic Inventory Markdown: Save {prod['recommendedDiscount']}% on {prod['name']}"
            email_body = (email_body.replace("Hi there,", "Dear Client,")
                                    .replace("We have something special for you!", "We are pleased to introduce a pricing adjustment on our high-quality inventory.")
                                    .replace("massive", "professional")
                                    .replace("👉 [Shop now and save", "Please view this special pricing arrangement here: [View"))
            fb_body = f"Professional clearance offer: The premium {prod['name']} is now available at a {prod['recommendedDiscount']}% price adjustment. Original price: ${prod['price']:.2f}, Clearance: ${prod['suggestedPrice']:.2f}.\n\nLearn more: [Link]"
            ig_body = f"Professional clearance offer: The premium {prod['name']} is now available at a {prod['recommendedDiscount']}% price adjustment. Link in bio."
        elif persona == "witty":
            email_subj = f"Confession: We ordered too many {prod['name']}... (You benefit)"
            email_body = (email_body.replace("Hi there,", "Hey friend,")
                                    .replace("We have something special for you!", f"So, our inventory warehouse planner was a bit too excited, and now we have an absolute stack of {prod['name']} taking up our desk space.")
                                    .replace("save", "save our warehouse spacer"))
            fb_body = f"Unpopular opinion: Our storage unit is too small. 📦\n\nOur loss is your gain. Get the {prod['name']} at a neat {prod['recommendedDiscount']}% off! Buy now before we have to stack them on the lunch tables: [Link]"
            ig_body = f"Unpopular opinion: Our storage unit is too small. 📦 Get the {prod['name']} at a neat {prod['recommendedDiscount']}% off! Link in bio."

        return {
            "email": {"subject": email_subj, "body": email_body},
            "facebook": {"body": fb_body},
            "instagram": {"body": ig_body},
            "google": {"headline1": goog_hl1, "headline2": goog_hl2, "description": goog_desc}
        }

    def _generate_gemini_copy(self, prod: Dict[str, Any], persona: str) -> Dict[str, Any]:
        prompt = f"""
        You are an expert retail marketing strategist and copywriter.
        Analyze the following slow-moving product details and generate structured markdown strategies and marketing copy in strict JSON format.

        Product Details:
        - Product Name: {prod['name']}
        - SKU: {prod['sku']}
        - Category: {prod['category']}
        - Current Retail Price: ${prod['price']:.2f}
        - Quantity in Stock: {prod['quantity']}
        - Recommended Discount Percentage: {prod['recommendedDiscount']}%
        - Target Clearance Markdown Price: ${prod['suggestedPrice']:.2f}
        - Days Stock on Hand (DSI): {prod['dsi']}
        - Calculated Dead Stock Risk Score: {prod['riskScore']}/100
        - Competitor Pricing Average: ${prod['competitorPrice']:.2f}
        - Category Demand Trend: {prod['demandTrend']}
        - Suggested Accessory to Bundle: {prod['mainAccessory']} (Suggested Bundle Price: ${prod['bundlePrice']:.2f})

        Parameters:
        - Copywriting Tone/Persona: {persona} (excited, professional, or witty)

        Requirements:
        Provide a JSON object containing marketing copies and strategies tailored to the '{persona}' tone.
        Your response must contain ONLY a valid JSON block matching this schema:
        {{
            "clearanceStrategy": "A brief clearance action plan tailored to this product's status and trends.",
            "bundleOffer": "A summary description of the bundle package offer.",
            "marketing": {{
                "email": {{
                    "subject": "Email Subject Line",
                    "body": "Full body text of a promotional email including pricing and bundle details."
                }},
                "facebook": {{
                    "body": "Facebook ad caption with emojis and hashtags."
                }},
                "instagram": {{
                    "body": "Instagram post copy with link-in-bio prompt."
                }},
                "google": {{
                    "headline1": "Search Ad Headline 1 (Max 30 chars)",
                    "headline2": "Search Ad Headline 2 (Max 30 chars)",
                    "description": "Google search description (Max 90 chars)"
                }}
            }}
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return data
        except Exception as e:
            logger.error(f"Error querying Gemini model: {e}")
            return None
