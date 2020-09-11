import { expect } from 'chai'
import React from 'react';
import ReactDOM from 'react-dom';
import {BrowseDataSourceModal} from './components/BrowseDataSource/BrowseDataSource';
import * as S3Service from './services/S3Service'

describe('FileBrowser2 Test', () => {

    let oldS3ListFiles = S3Service.listFiles;
    let containerDiv;

    before(async () => {
        HomeScreen.switch(UrlToTab.load);
        LoadScreen.switchTab("loadWizard");
    });

    after(async () => {
        S3Service.listFiles = oldS3ListFiles;
        ReactDOM.unmountComponentAtNode(containerDiv);
        $(containerDiv).remove();
    });

    it("renders a list of files", async (done) => {
        S3Service.listFiles = async () => {
            let list = new Map();
            list.set("/xcfield/abc.csv", {
                directory: false,
                fileId: "/xcfield/abc.csv",
                fullPath: "/xcfield/abc.csv",
                name: "abc.csv",
                sizeInBytes: 132,
                targetName: "S3 Select Connector",
                type: "csv"
            });
            list.set("/xcfield/def.json", {
                directory: false,
                fileId: "/xcfield/def.json",
                fullPath: "/xcfield/def.json",
                name: "def.json",
                sizeInBytes: 160,
                targetName: "S3 Select Connector",
                type: "json"
            });
            list.set("/xcfield/udfs", {
                directory: true,
                fileId: "/xcfield/udfs",
                fullPath: "/xcfield/udfs",
                name: "udfs",
                sizeInBytes: 0,
                targetName: "S3 Select Connector",
                type: "directory"
            });
            return list;
        };

        containerDiv = document.createElement('div');
        containerDiv.setAttribute("id", "loadWizard")
        $("#container").append(containerDiv);

        ReactDOM.render(<BrowseDataSourceModal
            connector={"S3 Select Connector"}
            bucket={"/xcfield"}
            homePath={""}
            fileNamePattern={"*"}
            fileType={"csv"}
            selectedFileDir={[]}
            onPathChange={(newPath) => {
            }}
            onCancel={() => {
            }}
            onDone={(selectedFileDir, fileNamePattern) => {
            }}
        />, containerDiv);

        await xcHelper.asyncTimeout(10);
        expect($(containerDiv).find(".ReactVirtualized__Table__row").length).to.equal(3);
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("abc.csv132 Bcsv");
        done();
    });

    it("sort by name should work", () => {
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("abc.csv132 Bcsv");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(1).text()).to.equal("def.json160 Bjson");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(2).text()).to.equal("udfsdirectory");

        // sort by name
        $(containerDiv).find(".ReactVirtualized__Table__headerRow > div:nth-child(2) > div > span > span").click();
        // should already be sorted by name

        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("abc.csv132 Bcsv");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(1).text()).to.equal("def.json160 Bjson");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(2).text()).to.equal("udfsdirectory");

        $(containerDiv).find(".ReactVirtualized__Table__headerRow > div:nth-child(2) > div > span > span").click();

        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("udfsdirectory");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(1).text()).to.equal("def.json160 Bjson");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(2).text()).to.equal("abc.csv132 Bcsv");

        // sort by size
        $(containerDiv).find(".ReactVirtualized__Table__headerRow > div:nth-child(3) > div > span > span").click();
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("udfsdirectory");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(1).text()).to.equal("abc.csv132 Bcsv");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(2).text()).to.equal("def.json160 Bjson");

        $(containerDiv).find(".ReactVirtualized__Table__headerRow > div:nth-child(3) > div > span > span").click();
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("def.json160 Bjson");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(1).text()).to.equal("abc.csv132 Bcsv");
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(2).text()).to.equal("udfsdirectory");

        // sort by name
        $(containerDiv).find(".ReactVirtualized__Table__headerRow > div:nth-child(2) > div > span > span").click();
    });

    it("selecting a file should work", () => {
        expect($(containerDiv).find(".selectedFile").length).to.equal(0);
        expect( $(containerDiv).find(".ReactVirtualized__Table__row:nth-child(1)").hasClass("selectedRow")).to.be.false;
        $(containerDiv).find(".ReactVirtualized__Table__row:nth-child(1) > div:nth-child(1) input").click();
        expect($(containerDiv).find(".selectedFile").text()).to.equal("/xcfield/abc.csv");
        expect($(containerDiv).find(".ReactVirtualized__Table__row:nth-child(1)").hasClass("selectedRow")).to.be.true;
    });

    it("deselecting a file should work", () => {
        expect($(containerDiv).find(".selectedFile").text()).to.equal("/xcfield/abc.csv");
        $(containerDiv).find(".ReactVirtualized__Table__row:nth-child(1) > div:nth-child(1) input").click();
        expect($(containerDiv).find(".selectedFile").text()).to.equal("");
    });

    it("selecting a folder should work", () => {
        expect($(containerDiv).find(".selectedFile").length).to.equal(0);
        expect($(containerDiv).find(".selectedFile input").val()).be.undefined;
        $(containerDiv).find(".ReactVirtualized__Table__row:nth-child(3) > div:nth-child(1) input").click();
        expect($(containerDiv).find(".selectedFile").text()).to.equal("/xcfield/udfs");
        expect($(containerDiv).find(".selectedFile input").val()).to.equal("*");
    });

    it("should navigate through folder", async (done) => {
        let called = false;
        S3Service.listFiles = async (args) => {
            called = true;
            expect(args).to.equal("/xcfield/udfs/");
            let list = new Map();
            list.set("/xcfield/udfs/x.csv", {
                directory: false,
                fileId: "/xcfield/udfs/x.csv",
                fullPath: "/xcfield/udfs/x.csv",
                name: "x.csv",
                sizeInBytes: 132,
                targetName: "S3 Select Connector",
                type: "csv"
            });
            return list;
        };
        $(containerDiv).find(".ReactVirtualized__Table__row:nth-child(3) > div:nth-child(2) > div").click();
        await xcHelper.asyncTimeout(10);
        expect(called).to.be.true;
        expect($(containerDiv).find(".ReactVirtualized__Table__row").length).to.equal(1);
        expect($(containerDiv).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("x.csv132 Bcsv");
        done();
    });
});
