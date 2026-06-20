/**
 * Trash to Treasure – Sample Inventory Data & Marketing Templates
 */

const DEFAULT_INVENTORY = [
    {
        name: "Aura Noise-Cancelling Headphones",
        sku: "AUD-ANC-09",
        category: "Electronics",
        quantity: 120,
        price: 189.99,
        sold30: 95,
        sold90: 280,
        expiryDate: ""
    },
    {
        name: "Ergonomic Mesh Office Chair",
        sku: "OFF-ERGO-42",
        category: "Furniture",
        quantity: 45,
        price: 249.99,
        sold30: 4,
        sold90: 12,
        expiryDate: ""
    },
    {
        name: "Smart Garden Herb Grow Kit",
        sku: "LIV-SMG-05",
        category: "Home & Garden",
        quantity: 85,
        price: 59.99,
        sold30: 0,
        sold90: 0,
        expiryDate: ""
    },
    {
        name: "Neon Glow Mechanical Keyboard",
        sku: "ACC-NEO-88",
        category: "Electronics",
        quantity: 65,
        price: 79.99,
        sold30: 6,
        sold90: 22,
        expiryDate: ""
    },
    {
        name: "Vintage Handcrafted Leather Journal",
        sku: "STA-VNL-12",
        category: "Stationery",
        quantity: 110,
        price: 34.99,
        sold30: 1,
        sold90: 3,
        expiryDate: ""
    },
    {
        name: "Ultra-Thin Multi-Device Charging Pad",
        sku: "ACC-WCP-31",
        category: "Electronics",
        quantity: 150,
        price: 29.99,
        sold30: 130,
        sold90: 360,
        expiryDate: ""
    },
    {
        name: "Retro Wooden Bluetooth Speaker",
        sku: "AUD-RBS-22",
        category: "Electronics",
        quantity: 75,
        price: 69.99,
        sold30: 2,
        sold90: 8,
        expiryDate: ""
    },
    {
        name: "Ceramic Matcha Whisk & Tea Set",
        sku: "KIT-MAT-08",
        category: "Kitchen",
        quantity: 90,
        price: 45.00,
        sold30: 5,
        sold90: 15,
        expiryDate: "2027-12-31"
    },
    {
        name: "Carbon Fiber Aerodynamic Bike Helmet",
        sku: "SPO-CFH-01",
        category: "Sports & Outdoors",
        quantity: 40,
        price: 129.99,
        sold30: 32,
        sold90: 98,
        expiryDate: ""
    },
    {
        name: "Eco-Friendly Flexi-Grip Yoga Mat",
        sku: "SPO-YGM-04",
        category: "Sports & Outdoors",
        quantity: 95,
        price: 39.99,
        sold30: 8,
        sold90: 25,
        expiryDate: ""
    },
    {
        name: "Organic Glow Vitamin C Face Serum",
        sku: "COS-VCS-77",
        category: "Cosmetics",
        quantity: 210,
        price: 24.50,
        sold30: 0,
        sold90: 4,
        expiryDate: "2026-09-30" // Expiring soon in our fictional timeline (June 2026)
    },
    {
        name: "Titanium Travel French Press",
        sku: "KIT-TFP-03",
        category: "Kitchen",
        quantity: 55,
        price: 89.99,
        sold30: 1,
        sold90: 2,
        expiryDate: ""
    }
];

const SAMPLE_CSV_CONTENT = `Product Name,SKU,Category,Quantity in Stock,Current Price,Units Sold Last 30 Days,Units Sold Last 90 Days,Expiry Date
Aura Noise-Cancelling Headphones,AUD-ANC-09,Electronics,120,189.99,95,280,
Ergonomic Mesh Office Chair,OFF-ERGO-42,Furniture,45,249.99,4,12,
Smart Garden Herb Grow Kit,LIV-SMG-05,Home & Garden,85,59.99,0,0,
Neon Glow Mechanical Keyboard,ACC-NEO-88,Electronics,65,79.99,6,22,
Vintage Handcrafted Leather Journal,STA-VNL-12,Stationery,110,34.99,1,3,
Ultra-Thin Multi-Device Charging Pad,ACC-WCP-31,Electronics,150,29.99,130,360,
Retro Wooden Bluetooth Speaker,AUD-RBS-22,Electronics,75,69.99,2,8,
Ceramic Matcha Whisk & Tea Set,KIT-MAT-08,Kitchen,90,45.00,5,15,2027-12-31
Carbon Fiber Aerodynamic Bike Helmet,SPO-CFH-01,Sports & Outdoors,40,129.99,32,98,
Eco-Friendly Flexi-Grip Yoga Mat,SPO-YGM-04,Sports & Outdoors,95,39.99,8,25,
Organic Glow Vitamin C Face Serum,COS-VCS-77,Cosmetics,210,24.50,0,4,2026-09-30
Titanium Travel French Press,KIT-TFP-03,Kitchen,55,89.99,1,2,`;

const MARKETING_TEMPLATES = {
    email: {
        subject: "Exclusive Offer: Save big on our {PRODUCT_NAME}!",
        body: `Hi there,

We have something special for you! For a limited time only, we are offering an exclusive discount on our popular {PRODUCT_NAME}.

Get it today for only $ {NEW_PRICE} (originally $ {ORIGINAL_PRICE}) — that's a massive {DISCOUNT_PERCENT}% off!

{BUNDLE_TEXT}

Don't miss out on this deal. Click the link below to claim yours before we run out of stock!

👉 [Shop now and save {DISCOUNT_PERCENT}%]

Warm regards,
The Customer Success Team`
    },
    facebook: {
        body: `🔥 HOT DEAL ALERT! 🔥

Looking to upgrade? We are running a flash clearance on our premium {PRODUCT_NAME}! 
Grab yours now for only $ {NEW_PRICE} (regularly $ {ORIGINAL_PRICE}). That's {DISCOUNT_PERCENT}% off! 

✨ Why people love it:
- High quality and built to last
- Top-rated customer reviews

🎁 SPECIAL BUNDLE: {BUNDLE_OFFER}

Hurry, inventory is extremely limited and this offer ends soon! Click the shop button to secure yours now. 👇

#Sale #Clearance #SmartShopping #Upgrade`
    },
    instagram: {
        body: `Steal of the week! ✨ The {PRODUCT_NAME} is officially on clearance! 

Get it today at {DISCOUNT_PERCENT}% off — now just $ {NEW_PRICE} (down from $ {ORIGINAL_PRICE}). 

👉 Click the link in our bio to shop the sale before it sells out!

{BUNDLE_TEXT_SHORT}

#DealOfTheDay #ClearanceSale #FlashSale #SmartLiving #RetailTherapy`
    },
    google: {
        headline1: "Clearance: {PRODUCT_NAME}",
        headline2: "Save {DISCOUNT_PERCENT}% Today Only",
        description: "Get {PRODUCT_NAME} for just $ {NEW_PRICE} instead of $ {ORIGINAL_PRICE}. Limited stock available. Buy now and save!"
    }
};

// Export to window object for browser access
window.DEFAULT_INVENTORY = DEFAULT_INVENTORY;
window.SAMPLE_CSV_CONTENT = SAMPLE_CSV_CONTENT;
window.MARKETING_TEMPLATES = MARKETING_TEMPLATES;
