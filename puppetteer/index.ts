import { runAutomation } from "./automation";

async function main() {
    await runAutomation();
}

main().catch((err) => {
    console.error("Puppeteer error:", err);
    process.exit(1);
});
