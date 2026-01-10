from flask import Flask, request, jsonify
from playwright.sync_api import sync_playwright
import urllib.parse

app = Flask(__name__)

@app.route("/api")
def scrape():

    url = request.args.get("url")
    if not url:
        return jsonify({"status":False,"msg":"URL required"})

    with sync_playwright() as p:

        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(4000)

        links = page.query_selector_all("a")

        found = None
        for a in links:
            href = a.get_attribute("href")
            if href and "iteraplay.tera-api61.workers.dev/download" in href:
                found = href
                break

        browser.close()

    if not found:
        return jsonify({
            "status":False,
            "msg":"Download link not found"
        })

    final_url = "https://playterabox.com/player?url=" + \
                urllib.parse.quote(found)

    return jsonify({
        "status":True,
        "original":found,
        "player":final_url
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
