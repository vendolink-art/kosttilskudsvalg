
              const { chromium } = require('playwright');
              const fs = require('fs');
              const path = require('path');
              
              (async () => {
                const browser = await chromium.launch({ headless: true });
                const context = await browser.newContext({
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  viewport: { width: 1280, height: 800 }
                });
                const page = await context.newPage();
                
                try {
                  // Go to the product page first
                  await page.goto('https://www.med24.dk/slank-og-fitness/sportsernaering/energipulver/high5-energy-drink-citrus-2-2-kg', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                  await page.waitForTimeout(2000); // Wait for Cloudflare/bot checks
                  
                  // Extract the image directly from the DOM to bypass direct URL blocks
                  const imgBuffer = await page.evaluate(async (imgUrl) => {
                    try {
                      const response = await fetch(imgUrl);
                      const buffer = await response.arrayBuffer();
                      return Array.from(new Uint8Array(buffer));
                    } catch (e) {
                      return null;
                    }
                  }, 'https://www.med24.dk/imgsrv/2025-03-04/22475251/3/high5-energy-drink-citrus-2-2-kg-88445.jpg?c=IOmc8Y');
                  
                  if (imgBuffer && imgBuffer.length > 1000) {
                    const buffer = Buffer.from(imgBuffer);
                    fs.mkdirSync(path.dirname('C:/Users/robin/Kostmag/public/vendor/products/high5-energy-drink-citrus-22-kg-1772804412807.jpg'), { recursive: true });
                    fs.writeFileSync('C:/Users/robin/Kostmag/public/vendor/products/high5-energy-drink-citrus-22-kg-1772804412807.jpg', buffer);
                    console.log('SUCCESS');
                  } else {
                    console.log('FAILED_SIZE');
                  }
                } catch (e) {
                  console.log('FAILED_ERROR');
                } finally {
                  await browser.close();
                }
              })();
            