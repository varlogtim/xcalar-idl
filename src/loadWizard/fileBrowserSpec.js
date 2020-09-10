import { expect } from 'chai'
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import {BrowseDataSourceModal} from './components/BrowseDataSource/BrowseDataSource';
import * as S3Service from './services/S3Service'

describe('FileBrowser2 Test', () => {

    let oldS3ListFiles = S3Service.listFiles;

    before(async () => {
        HomeScreen.switch(UrlToTab.load);
        LoadScreen.switchTab("loadWizard");
    });

    after(async () => {
        S3Service.listFiles = oldS3ListFiles;
    });


    it('renders without crashing', () => {
        const div = document.createElement('div');
        ReactDOM.render(<App />, div);
        ReactDOM.unmountComponentAtNode(div);
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
                name: "def.csv",
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

        const div = document.createElement('div');
        div.setAttribute("id", "loadWizard")
        $("#container").append(div);

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
        />, div);

        await xcHelper.asyncTimeout(10);
        expect($(div).find(".ReactVirtualized__Table__row").length).to.equal(3);
        expect($(div).find(".ReactVirtualized__Table__row").eq(0).text()).to.equal("abc.csv132 Bcsv");

        ReactDOM.unmountComponentAtNode(div);
        $(div).remove();
        done();
    });
});
