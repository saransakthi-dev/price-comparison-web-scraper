import requests
import re
import os
from bs4 import BeautifulSoup

SERPAPI_KEY = os.environ.get("SERPAPI_KEY")

# Accessory exclusion keywords
FORBIDDEN_KEYWORDS = [
    "cover", "case", "tempered", "protector", "skin", "screen guard", "back guard",
    "full body", "housing", "panel", "lens", "adapter", "cable", "earphone",
    "charger", "battery", "plug", "sticker", "pouch", "spare part", "replacement",
    "lcd", "screen", "display", "flex", "button", "shield", "glass", "backdoor",
    "back glass", "camera lens", "camera glass", "folder", "touch glass", "combo"
]

def safe_str(val, maxlen=80):
    """Safely convert value to string with max length."""
    if val is None:
        return "Unknown Product"
    s = str(val).strip()
    return (s[:maxlen] + "...") if len(s) > maxlen else s

def parse_price(price_val):
    """
    Enhanced price parsing that handles multiple price clusters and filters out 
    discounts, exchange offers, and M.R.P. values to find the actual selling price.
    """
    if price_val is None:
        return None
    
    try:
        # Convert to string and clean common separators
        raw_str = str(price_val).replace(",", "")
        text_low = raw_str.lower()
        
        # Keywords that usually indicate a non-principal price (discounts, offers, etc.)
        exclude_keywords = [
            "off", "discount", "save", "exchange", "cashback", "emi", "coupon", 
            "up to", "bank", "card", "starting", "from", "deal", "limited", "bonus"
        ]
        mrp_keywords = ["m.r.p", "mrp", "original", "strikethrough", "was", "rrp"]

        # 1. Find all potential price matches with currency symbols (₹, Rs., INR)
        matches = list(re.finditer(r'(?:₹|rs\.|inr)\s?([\d]+(?:\.\d{1,2})?)', text_low))
        
        valid_prices = []
        for m in matches:
            try:
                val = float(m.group(1))
                if val < 200: continue 
                
                # Check context (approx 35 chars around the match)
                start = max(0, m.start() - 35)
                end = min(len(text_low), m.end() + 35)
                context = text_low[start:end]
                
                is_offer = any(kw in context for kw in exclude_keywords)
                is_mrp = any(kw in context for kw in mrp_keywords)
                
                # Priority: 
                # 3: Plain price (likely selling price)
                # 2: M.R.P (backup if no selling price)
                # 1: Offer/Discount price (least preferred)
                priority = 1 if is_offer else (2 if is_mrp else 3)
                
                valid_prices.append({
                    "val": val,
                    "priority": priority
                })
            except:
                continue
                
        if valid_prices:
            # Sort by priority descending. 
            # If multiple of same priority:
            # - For selling prices (3): we want the one that isn't a tiny accessory price (usually the higher one for phones)
            # - For others: take the lowest.
            valid_prices.sort(key=lambda x: (-x["priority"], x["val"] if x["priority"] == 3 else -x["val"]), reverse=True)
            
            # Re-sorting for clarity:
            # Primary sort: Priority (3 > 2 > 1)
            # Secondary sort: 
            #   For Priority 3: Take the highest (often snippets show "M.R.P ₹15k ₹10k", 
            #   but if we miss the M.R.P keyword, the higher one is usually the 'real' reference).
            #   Wait, actually usually we want the LOWER one if both are priority 3.
            #   Let's keep it simple: Highest Priority, then Highest Value (to avoid picking up accidental small numbers).
            valid_prices.sort(key=lambda x: (-x["priority"], -x["val"]))
            return round(valid_prices[0]["val"], 2)

        # 2. Case for $ (USD to INR conversion)
        match_usd = re.search(r'\$\s?([\d]+(?:\.\d{2})?)', raw_str)
        if match_usd:
            return round(float(match_usd.group(1)) * 83, 2)

        # 3. Generic 4+ digit number
        match_gen = re.search(r'(\d{4,}(?:\.\d{2})?)', raw_str)
        if match_gen:
            val = float(match_gen.group(1))
            if val > 100: return round(val, 2)

        return None
    except:
        return None

def is_accessory(name, keyword):
    """
    Check if the name sounds like an accessory for the given keyword.
    """
    kw_low = keyword.lower()
    # If the user is specifically searching for an accessory or a used item, don't filter it out
    special_search = ["cover", "case", "protector", "skin", "glass", "tempered", "used", "refurbished", "second hand"]
    if any(k in kw_low for k in special_search):
        return False
        
    name_low = name.lower()
    
    # Expanded forbidden keywords for accessories/parts/unwanted states
    FORBIDDEN = FORBIDDEN_KEYWORDS + ["stand", "mount", "refurbished", "used", "pre-owned", "shield", "guard", "mount", "holder"]
    
    if any(f in name_low for f in FORBIDDEN):
        return True
        
    # Check for "for [device]" which often implies an accessory
    if " for " in name_low and kw_low in name_low.split(" for ")[-1]:
        return True

    return False

def is_unwanted_content(title, link):
    """Filter out news, rumors, or spec sheets that aren't products."""
    title_low = title.lower()
    link_low = link.lower()
    unwanted = ["tipped", "launch", "rumor", "news", "specs", "review", "leaked", "comparison", "expected", "unboxed"]
    if any(u in title_low for u in unwanted):
        return True
    if any(u in link_low for u in ["gadgets360", "91mobiles", "gsmarena", "smartprix", "digit.in"]):
        return True
    return False

def scrape_prices(keyword):
    """
    Fetch real-time product prices.
    """
    if not keyword or not keyword.strip():
        return []

    all_products = []
    seen_links = set()

    def add_product(name, price, store, link, image, mrp=None):
        if not price or price <= 100 or not link:
            return
        if link in seen_links:
            return
        
        # Filter unwanted news/blogs
        if is_unwanted_content(name or "", link):
            return
            
        # Filter Accessories
        if is_accessory(name or "", keyword):
            return
            
        # Price-based heuristic for smartphones search
        # If keyword contains a phone brand, price shouldn't be < 2000 (usually accessories)
        phone_brands = ["iphone", "samsung", "redmi", "pixel", "oneplus", "realme", "vivo", "oppo", "iqoo", "motorola", "moto", "galaxy", "nothing phone"]
        kw_low = keyword.lower()
        if any(b in kw_low for b in phone_brands):
            # Smartphone searches should have a reasonable floor to avoid covers/panels
            if price < 2000 and not any(k in kw_low for k in ["charger", "cable", "adapter", "battery", "earphone"]):
                return

        seen_links.add(link)
        if mrp is None or mrp <= price:
            mrp = round(price * 1.25, 2)
            
        all_products.append({
            "name": safe_str(name),
            "price": price,
            "image": image or "",
            "link": link,
            "store": store or "Store",
            "mrp": round(mrp, 2)
        })

    all_results = []
    
    # 1. Dedicated Amazon Search
    try:
        amazon_params = {
            "engine": "amazon",
            "k": keyword,
            "api_key": SERPAPI_KEY,
            "amazon_domain": "amazon.in",
            "type": "search"
        }
        res = requests.get("https://serpapi.com/search.json", params=amazon_params, timeout=15).json()
        for item in res.get("organic_results", [])[:10]:
            price = parse_price(item.get("extracted_price") or item.get("price"))
            mrp = parse_price(item.get("extracted_original_price") or item.get("original_price"))
            add_product(item.get("title"), price, "Amazon", item.get("link"), item.get("thumbnail"), mrp)
    except: pass

    # 2. Dedicated Flipkart Search (via Google Search for reliability)
    try:
        flipkart_params = {
            "engine": "google",
            "q": f"site:flipkart.com -inurl:blog -inurl:news {keyword}",
            "gl": "in",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        res = requests.get("https://serpapi.com/search.json", params=flipkart_params, timeout=15).json()
        for item in res.get("organic_results", [])[:5]:
            # Try specific price fields first, then rich_snippet, then snippet
            price_val = item.get("price")
            if not price_val and "rich_snippet" in item:
                # Check rich snippet for potential price information
                ext = item["rich_snippet"].get("top", {}).get("extensions", [])
                for e in ext:
                    detected = parse_price(e)
                    if detected:
                        price_val = e
                        break
            
            if not price_val:
                price_val = item.get("snippet")

            price = parse_price(price_val)
            if price:
                add_product(item.get("title"), price, "Flipkart", item.get("link"), item.get("thumbnail"), None)
    except: pass

    # 3. Google Shopping (The mega-aggregator for Croma, Reliance, etc.)
    try:
        shopping_params = {
            "engine": "google_shopping",
            "q": keyword,
            "google_domain": "google.co.in",
            "gl": "in",
            "hl": "en",
            "api_key": SERPAPI_KEY,
            "direct_link": "true"
        }
        res = requests.get("https://serpapi.com/search.json", params=shopping_params, timeout=15).json()
        shopping_items = res.get("shopping_results", [])
        if not shopping_items:
            # Fallback to regular google search with shopping tab
            shopping_params["engine"] = "google"
            shopping_params["tbm"] = "shop"
            res = requests.get("https://serpapi.com/search.json", params=shopping_params, timeout=15).json()
            shopping_items = res.get("shopping_results", [])

        for item in shopping_items[:15]:
            price = parse_price(item.get("price"))
            mrp = parse_price(item.get("original_price"))
            source = item.get("source", "Store")
            add_product(item.get("title"), price, source, item.get("link"), item.get("thumbnail"), mrp)
    except: pass

    # 4. Multi-store fallback (Croma, Reliance via site-search)
    try:
        multi_params = {
            "engine": "google",
            "q": f"(site:croma.com OR site:reliancedigital.in OR site:tatacliq.com) -inurl:blog -inurl:news -inurl:unboxed {keyword}",
            "gl": "in",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        res = requests.get("https://serpapi.com/search.json", params=multi_params, timeout=15).json()
        for item in res.get("organic_results", [])[:5]:
            source = "Store"
            link = item.get("link", "")
            if "croma" in link: source = "Croma"
            elif "reliancedigital" in link: source = "Reliance"
            elif "tatacliq" in link: source = "TataCliq"
            
            # Check price field or snippet
            price_val = item.get("price") or item.get("snippet", "")
            price = parse_price(price_val)
            if price:
                add_product(item.get("title"), price, source, link, item.get("thumbnail"), None)
    except: pass

    # Return results sorted by price (ascending)
    return sorted(all_products, key=lambda x: x["price"])

def scrape_item_by_url(url):
    """
    Enhanced link scraping that works for any product page.
    Uses OpenGraph, JSON-LD, and fallback regex extraction.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        res = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        title, price, image, store = "Unknown Product", None, "", "Store"
        
        # 1. Store Name
        if "amazon.in" in url: store = "Amazon"
        elif "flipkart.com" in url: store = "Flipkart"
        elif "reliancedigital.in" in url: store = "Reliance"
        else:
            og_site = soup.find("meta", property="og:site_name")
            if og_site: store = og_site.get("content")
            else: store = url.split("//")[-1].split("/")[0].replace("www.", "")

        # 2. Title
        og_title = soup.find("meta", property="og:title")
        if og_title: 
            title = og_title.get("content")
        else:
            title_node = soup.find("title") or soup.find("h1")
            if title_node: title = title_node.get_text().strip()

        # 3. Image
        og_image = soup.find("meta", property="og:image")
        if og_image:
            image = og_image.get("content")
        else:
            img_node = soup.find("img", {"src": re.compile(r'\.(jpg|jpeg|png|webp)', re.I)})
            if img_node: image = img_node.get("src")

        # 4. Price Logic
        # 4a. OG Tags
        og_price = soup.find("meta", property="og:price:amount") or soup.find("meta", property="product:price:amount")
        if og_price:
            price = parse_price(og_price.get("content"))

        # 4b. JSON-LD Fallback
        if not price:
            import json
            scripts = soup.find_all("script", type="application/ld+json")
            for s in scripts:
                try:
                    data = json.loads(s.string)
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if item.get("@type") == "Product":
                            offers = item.get("offers")
                            if isinstance(offers, dict):
                                price = parse_price(offers.get("price"))
                            elif isinstance(offers, list) and offers:
                                price = parse_price(offers[0].get("price"))
                            if price: break
                    if price: break
                except: continue

        # 4c. Regex Search Fallback
        if not price:
            price_patterns = [
                r'₹\s?([\d,]+(\.\d{2})?)',
                r'Rs\.\s?([\d,]+(\.\d{2})?)',
                r'INR\s?([\d,]+(\.\d{2})?)',
                r'\$\s?([\d,]+(\.\d{2})?)'
            ]
            for pattern in price_patterns:
                match = re.search(pattern, res.text)
                if match:
                    price = parse_price(match.group(0))
                    if price: break

        if not price:
            return {"error": f"Could not extract price from {store}. Please ensure this is a product page."}
            
        return {
             "name": safe_str(title),
             "price": price,
             "store": store,
             "link": url,
             "image": image,
             "mrp": round(price * 1.25, 2)
        }
    except Exception as e:
        return {"error": f"Failed to access the link: {str(e)}"}
