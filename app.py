from flask import Flask, request, jsonify
from playwright.sync_api import sync_playwright
import urllib.parse

app = Flask(__name__)

@app.route("/api")
def scrape():

    url = request.args.get("url")
    if not url:
        return jsonify({"status": False, "msg": "URL required"})

    all_links = []
    found = None

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox"]
        )

        page = browser.new_page()

        # wait max 10 sec
        page.goto(url, wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(5000)

        links = page.query_selector_all("a")

        for a in links:
            href = a.get_attribute("href")
            if href:
                all_links.append(href)

                if "iteraplay.tera-api" in href and "/download?" in href:
                    found = href

        browser.close()

    if found:
        final_url = "https://playterabox.com/player?url=" + \
                    urllib.parse.quote(found)

        return jsonify({
            "status": True,
            "original": found,
            "player": final_url
        })

    return jsonify({
        "status": False,
        "msg": "Download link not found",
        "all_links": all_links
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
