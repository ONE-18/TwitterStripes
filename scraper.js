import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function scrapeImages(tweetUrl) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(tweetUrl, { waitUntil: "networkidle2" });
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    await page.waitForSelector('article [data-testid="tweetPhoto"] img, img[src*="pbs.twimg.com/media"]', {
      timeout: 8000
    });
  } catch {
    // Si no aparece el selector, continuamos con el scrapeo general
  }

  await new Promise(resolve => setTimeout(resolve, 1500));

  const imageUrls = await page.evaluate(() => {
    const urls = new Set();

    const tweetImgs = Array.from(
      document.querySelectorAll('article [data-testid="tweetPhoto"] img, div[data-testid="tweetPhoto"] img')
    );

    const imgs = tweetImgs.length > 0 ? tweetImgs : Array.from(document.querySelectorAll("img"));

    for (const img of imgs) {
      const candidates = [];

      if (img.src) candidates.push(img.src);
      if (img.currentSrc) candidates.push(img.currentSrc);

      if (img.srcset) {
        const srcsetUrls = img.srcset
          .split(",")
          .map(part => part.trim().split(" ")[0])
          .filter(Boolean);
        candidates.push(...srcsetUrls);
      }

      for (const src of candidates) {
        if (
          src.includes("pbs.twimg.com/media") &&
          !src.includes("profile_images")
        ) {
          urls.add(src);
        }
      }
    }

    return Array.from(urls);
  });

  await browser.close();

  // elimina duplicados y fuerza calidad original
  return [...new Set(imageUrls)].map(url =>
    url.replace(/&name=\w+/, "&name=orig")
  );
}
