const puppeteer = require('puppeteer');
const fs = require('fs');
const exec = require("child_process").execSync;

const commandLineArgs = process.argv;

// Usage: npm test <testName> <hostname>
// E.g.: npm test unitTest https://cantor:8443
let testName = "unitTest";
let hostname = "http://localhost:8888";
// Host name must be with protocol and whatever port
if (commandLineArgs.length > 2) {
    testName = commandLineArgs[2].trim();
    if (commandLineArgs.length > 3) {
        hostname = commandLineArgs[3].trim();;
    }
}

runTest(testName, hostname);

async function runTest(testType, hostname) {
    try {
        let browser;
        if (testType === "testSuite") {
            browser = await puppeteer.launch({
                headless: true,
                ignoreHTTPSErrors: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else if (testType === "expServer") {
            let exitCode = 0;
            try {
                let mochaTest = "NODE_ENV=test node_modules/istanbul/lib/cli.js cover mocha ../../../xcalar-gui/services/test/expServerSpec/*.js --dir ../../../services/test/report";
                exec(mochaTest);
                console.log("Expserver test passed.");
            } catch (error) {
                console.log("Expserver test failed.");
                exitCode = error.status;
            }
            process.exit(exitCode);
        } else {
            browser = await puppeteer.launch({
                headless: false,
                ignoreHTTPSErrors: true
            });
        }
        const page = await browser.newPage();
        await page.setViewport({width: 1920, height: 1076});

        page.on('console', msg => {
          for (let i = 0; i < msg.args().length; ++i)
            console.log(`${msg.args()[i]}`);
        });

        const userName = "unitTestUser" + Math.ceil(Math.random() * 100000 + 1);
        if (testType === "testSuite") {
            url = hostname + "/testSuite.html?type=testSuite&test=y&noPopup=y&animation=y&cleanup=y&close=y&user=ts-" + userName + "&id=0&workbook=testSuite";
        } else {
            url = hostname + "/unitTest.html?createWorkbook=y&user=" + userName;
        }
        if (testType === "unitTest") {
            await page.coverage.startJSCoverage({ resetOnNavigation: true });
        }
        console.log("Opening page:", url)
        await page.goto(url);
        // time out after 1 day
        await page.waitForSelector('#testFinish', {timeout: 864000000});
        const results = await page.evaluate(() => document.querySelector('#testFinish').textContent);
        let exitCode = 1;
        if (results === "PASSED") {
            console.log("All passed!");
            exitCode = 0;
        } else {
            console.log("Failed: " + JSON.stringify(results));
        }

        if (testType === "unitTest") {
            console.log("test finished, getting code coverage");
            const jsCoverage = await page.coverage.stopJSCoverage();
            getCoverage(jsCoverage);
        }
        browser.close();
        process.exit(exitCode);
    } catch (e) {
        console.error(e);
    }
}

function getCoverage(coverage) {
    let totalBytes = 0;
    let usedBytes = 0;
    const coverageToReport = [];
    const excludeFolders = ['/thrift/', '/sdk/', 'tutorial'];
    const excludeFiles = ['config.js', 'loginConfig.js', 'compatible.js',
    'replay.js', 'XcalarThrift.js', 'sqlCompiler.js', 'sqlApi.js',
    'sqlCache.js', 'sqlTest.js',
    'undo.js', 'redo.js', 'upgrader.js'];

    let entryMap = {};
    let entrySizeMap = {};
    for (const entry of coverage) {
        if (!entry.url.includes('assets/js')) {
            continue;
        }

        let shouldExclude = false;
        excludeFolders.forEach((name) => {
            if (entry.url.includes(name)) {
                shouldExclude = true;
                return false;
            }
        });

        if (shouldExclude) {
            continue;
        }

        shouldExclude = false;
        excludeFiles.forEach((name) => {
            if (entry.url.endsWith(name)) {
                shouldExclude = true;
                return false;
            }
        });

        if (shouldExclude) {
            continue;
        }

        // becuase of the iframe refresh, same url can occurl several times,
        // need to find the one that has the most coverage
        let url = entry.url;
        let bytes = 0;
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
