"""
セブンイレブン商品スクレイパー (東海エリア)
カテゴリ一覧ページから商品リンク・画像を取得し、
詳細ページから栄養成分を抽出して CSV / JSON に出力する。
"""

import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.sej.co.jp"
REGION = "tokai"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
DELAY = 1.5

CATEGORIES = {
    "おにぎり": f"/products/a/onigiri/{REGION}/",
    "お弁当": f"/products/a/bento/{REGION}/",
    "サンドイッチ・ロールパン": f"/products/a/sandwich/{REGION}/",
    "サラダ": f"/products/a/salad/{REGION}/",
    "惣菜": f"/products/a/dailydish/{REGION}/",
    "パン": f"/products/a/bread/{REGION}/",
    "そば・うどん・中華麺": f"/products/a/men/{REGION}/",
    "スパゲティ・パスタ": f"/products/a/pasta/{REGION}/",
}

OUT_DIR = Path(__file__).resolve().parent
FRONTEND_DATA = Path(__file__).resolve().parent.parent / "src" / "data" / "products.json"


def fetch(url: str) -> BeautifulSoup:
    time.sleep(DELAY)
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return BeautifulSoup(r.text, "lxml")


def get_listing_urls_for_category(category_name: str, category_path: str) -> list[str]:
    """
    カテゴリトップページを取得し、「ラインナップを見る」リンクから
    サブカテゴリの一覧URLを収集する。なければカテゴリパスそのものを1件返す。
    """
    url = urljoin(BASE_URL, category_path)
    try:
        soup = fetch(url)
    except Exception as e:
        print(f"    ERROR fetching category top: {e}")
        return [category_path]

    listing_paths: list[str] = []
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        href = a.get("href", "")
        if "ラインナップを見る" in text and "/products/a/cat/" in href:
            # 絶対URLの場合は path のみ取り出す
            path = urlparse(href).path or href
            path = path.rstrip("/") or path
            if path and path not in listing_paths:
                listing_paths.append(path)

    if not listing_paths:
        return [category_path]
    return listing_paths


def get_listing_items(category_name: str, path: str) -> list[dict]:
    """一覧ページ（ラインナップ）から商品の基本情報を取得。100件表示で全ページを巡回。"""
    base_url = urljoin(BASE_URL, path).rstrip("/")
    items = []
    page = 1

    while True:
        # 常に /1/l100/, /2/l100/ 形式で100件ずつ取得（ページネーションを確実に）
        # 1ページ目で0件のときは、ラインナップ形式でないカテゴリ用にトップURLを試す
        if page == 1:
            page_url = f"{base_url}/1/l100/"
        else:
            page_url = f"{base_url}/{page}/l100/"
        print(f"  [{category_name}] page {page}: {page_url}")

        try:
            soup = fetch(page_url)
        except Exception as e:
            print(f"    ERROR fetching listing: {e}")
            break

        cards = soup.select(".list_inner")
        if not cards and page == 1:
            page_url = base_url + "/"
            print(f"  [{category_name}] retry page 1 (no l100): {page_url}")
            try:
                soup = fetch(page_url)
                cards = soup.select(".list_inner")
            except Exception as e:
                print(f"    ERROR: {e}")
        if not cards:
            break

        for card in cards:
            link_el = card.select_one(".item_ttl a")
            if not link_el:
                continue

            name = link_el.get_text(strip=True)
            href = link_el.get("href", "")
            item_id_match = re.search(r"/item/(\d+)/", href)
            item_id = item_id_match.group(1) if item_id_match else ""

            img_el = card.select_one("img[data-original]")
            image_url = img_el.get("data-original", "") if img_el else ""

            price_el = card.select_one(".item_price")
            price_text = price_el.get_text(strip=True) if price_el else ""
            tax_match = re.search(r"税込([\d.]+)円", price_text)
            price = round(float(tax_match.group(1))) if tax_match else 0

            items.append({
                "id": item_id,
                "name": name,
                "price": price,
                "image_url": image_url,
                "detail_path": href,
                "category": category_name,
            })

        # 100件未満なら次ページなし
        if len(cards) < 100:
            break
        page += 1

    return items


def get_nutrition(detail_path: str) -> dict | None:
    """商品詳細ページから栄養成分を取得"""
    url = urljoin(BASE_URL, detail_path)
    try:
        soup = fetch(url)
    except Exception as e:
        print(f"    ERROR fetching detail: {e}")
        return None

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            text = " ".join(c.get_text(strip=True) for c in cells)
            if "熱量" in text or "たんぱく質" in text:
                return parse_nutrition(text)

    return None


def parse_nutrition(text: str) -> dict | None:
    cal_m = re.search(r"熱量[：:]?\s*([\d.]+)\s*kcal", text)
    pro_m = re.search(r"たんぱく質[：:]?\s*([\d.]+)\s*g", text)
    fat_m = re.search(r"脂質[：:]?\s*([\d.]+)\s*g", text)
    carb_m = re.search(r"炭水化物[：:]?\s*([\d.]+)\s*g", text)

    if not all([cal_m, pro_m, fat_m, carb_m]):
        return None

    return {
        "calories": float(cal_m.group(1)),
        "protein": float(pro_m.group(1)),
        "fat": float(fat_m.group(1)),
        "carbs": float(carb_m.group(1)),
    }


def is_healthy(item: dict) -> bool:
    """不健康アイテムフィルタ: カロリー800超 or 脂質比率40%超 を除外"""
    cal = item.get("calories", 0)
    fat = item.get("fat", 0)

    if cal > 800:
        return False
    if cal > 0 and (fat * 9) / cal > 0.4:
        return False

    return True


def main():
    all_items: list[dict] = []

    print("=== セブンイレブン商品スクレイパー (東海エリア) ===\n")

    for cat_name, cat_path in CATEGORIES.items():
        print(f"\n--- {cat_name} ---")
        listing_urls = get_listing_urls_for_category(cat_name, cat_path)
        print(f"  取得する一覧URL: {len(listing_urls)} 件")
        listings_by_id: dict[str, dict] = {}
        for listing_path in listing_urls:
            for item in get_listing_items(cat_name, listing_path):
                if item.get("id") and item["id"] not in listings_by_id:
                    listings_by_id[item["id"]] = item
        listings = list(listings_by_id.values())
        print(f"  {len(listings)} 件の商品を検出（重複除く）")

        for i, item in enumerate(listings):
            print(f"  [{i+1}/{len(listings)}] {item['name']}")
            nutrition = get_nutrition(item["detail_path"])
            if nutrition:
                item.update(nutrition)
                all_items.append(item)
            else:
                print(f"    SKIP: 栄養成分取得不可")

    csv_path = OUT_DIR / "products.csv"
    fieldnames = [
        "id", "name", "price", "image_url", "calories",
        "protein", "fat", "carbs", "category",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_items)

    print(f"\n=== CSV 出力完了: {csv_path} ({len(all_items)} 件) ===")

    healthy = [item for item in all_items if is_healthy(item)]
    removed = len(all_items) - len(healthy)
    print(f"フィルタリング: {removed} 件除外 → {len(healthy)} 件を JSON に出力")

    json_items = [
        {k: item[k] for k in fieldnames}
        for item in healthy
    ]
    FRONTEND_DATA.parent.mkdir(parents=True, exist_ok=True)
    with open(FRONTEND_DATA, "w", encoding="utf-8") as f:
        json.dump(json_items, f, ensure_ascii=False, indent=2)

    print(f"=== JSON 出力完了: {FRONTEND_DATA} ({len(healthy)} 件) ===")


if __name__ == "__main__":
    main()
