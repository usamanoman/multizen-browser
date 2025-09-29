import puppeteer from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    headless: "new", // or true
    // executablePath: "/usr/bin/google-chrome", // uncomment if needed on servers
    // args: ["--no-sandbox", "--disable-setuid-sandbox"], // for some CI/containers
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto("https://www.google.com", { waitUntil: "networkidle2" });

  await page.screenshot({ path: "google.png", fullPage: true });
  await browser.close();
}

main().catch((err) => {
  console.error("Puppeteer error:", err);
  process.exit(1);
});