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
  await new Promise(resolve => setTimeout(resolve, 3000));

  const imageUrls = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs
      .map(img => img.src)
      .filter(src =>
        src.includes("pbs.twimg.com/media") &&
        !src.includes("profile_images")
      );
  });

  await browser.close();

  // elimina duplicados y fuerza calidad original
  return [...new Set(imageUrls)].map(url =>
    url.replace(/&name=\w+/, "&name=orig")
  );
}
