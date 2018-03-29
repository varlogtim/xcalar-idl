const puppeteer = require('puppeteer');
const fs = require('fs');


(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    page.on('console', msg => {
      for (let i = 0; i < msg.args().length; ++i)
        console.log(`${i}: ${msg.args()[i]}`);
    });

    const userName = "unitTestUser" + Math.ceil(Math.random() * 100000 + 1);
    const url = 'http://localhost:8888/unitTest.html?createWorkbook=y&user=' + userName;
    await page.coverage.startJSCoverage({resetOnNavigation: true});
    console.log("go to url", url)
    await page.goto(url);
    await page.waitForSelector('#testFinish');
    const jsCoverage = await page.coverage.stopJSCoverage();
    getCoverage(jsCoverage);
    browser.close();
})();


function getCoverage(coverage) {
    let totalBytes = 0;
    let usedBytes = 0;
    const coverageToReport = [];
    for (const entry of coverage) {
        if (!entry.url.includes('assets/js')) {
            continue;
        }

        if (entry.url.includes('/thrift/')) {
            // exclude thrift folder
            continue;
        }

        if (entry.url.endsWith('config.js')) {
            continue;
        }

        coverageToReport.push(entry);
        totalBytes += entry.text.length;
        for (const range of entry.ranges) {
            usedBytes += range.end - range.start - 1;
        }
    }

    fs.writeFileSync("coverage/coverage.js", 'var coverage =' + JSON.stringify(coverageToReport)); 

    console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);
}