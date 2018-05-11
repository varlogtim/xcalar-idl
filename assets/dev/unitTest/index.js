const puppeteer = require('puppeteer');
const fs = require('fs');


(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true
        });
        const page = await browser.newPage();
        await page.setViewport({width: 1920, height: 1076});

        page.on('console', msg => {
          for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
        });

        const userName = "unitTestUser" + Math.ceil(Math.random() * 100000 + 1);
        // const url = 'http://localhost:8888/unitTest.html?createWorkbook=y&user=' + userName;
        const url = 'http://localhost:8888/unitTestManager.html';
        await page.coverage.startJSCoverage({resetOnNavigation: true});
        console.log("go to url", url)
        await page.goto(url);
        // time out after 1 day
        await page.waitForSelector('#testFinish', {timeout: 864000000});
        console.log("test finished, getting code coverage");
        const jsCoverage = await page.coverage.stopJSCoverage();
        getCoverage(jsCoverage);
        browser.close();
    } catch (e) {
        console.error(e);
    }
})();


function getCoverage(coverage) {
    let totalBytes = 0;
    let usedBytes = 0;
    const coverageToReport = [];


    let entryMap = {};
    let entrySizeMap = {};
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

        // becuase of the iframe refresh, same url can occurl several times,
        // need to find the one that has the most coverage
        var url = entry.url;
        var bytes = 0;
        for (const range of entry.ranges) {
            bytes += range.end - range.start - 1;
        }

        if (!entryMap.hasOwnProperty(entry.url) ||
            bytes > entrySizeMap[url]
        ) {
            entryMap[url] = entry;
            entrySizeMap[url] = bytes;
        }
    }

    for (const url in entryMap) {
        const entry = entryMap[url];
        coverageToReport.push(entry);
        totalBytes += entry.text.length;
        usedBytes += entrySizeMap[url];
    }

    fs.writeFileSync("coverage/coverage.js", 'var coverage =' + JSON.stringify(coverageToReport));
    console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);
}