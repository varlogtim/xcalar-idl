import { expect } from 'chai'
import React from 'react';
import ReactDOM from 'react-dom';
import ColSchemaSection from './../components/DiscoverSchemas/ColSchemaSection'

describe('React ColSchemaSection Test', () => {
    let containerDiv;
    let defaultSchema;
    let cols;

    before(async () => {
        HomeScreen.switch(UrlToTab.load);
        LoadScreen.switchTab("loadWizard");

        containerDiv = document.createElement('div');
        containerDiv.setAttribute("id", "loadWizard");
        containerDiv.style.backgroundColor= "black";
        containerDiv.style.position= "relative";
        containerDiv.style.zIndex= 100;
        $("#container").append(containerDiv);
    });

    after(async () => {
        ReactDOM.unmountComponentAtNode(containerDiv);
        $(containerDiv).remove();
    });

    it("should display", () => {
        expect(1).to.equal(1);
         defaultSchema = [{
            name: "a",
            type: "dfstring",
            mapping: "aLocation"
        }];
         cols = [{
            name: "a",
            type: "dfstring",
            mapping: "aLocation"
        }];

        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={true}
            addColTip={"addColumn"}
            isMappingEditable={true}

        />, containerDiv);

        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(1);
        expect($(containerDiv).find(".row:not(.schemaHeader) > div").length).to.equal(3);
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:first-child input").attr("readonly")).to.be.undefined;
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:first-child input").val()).to.equal("aLocation");
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:nth-child(2) input").val()).to.equal("string");
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:nth-child(3) input").val()).to.equal("a");
    });

    it("delete should work", () => {
        expect($(containerDiv).find(".remove").length).to.equal(1);
        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(1);
        expect(cols.length).to.equal(1);
        $(containerDiv).find('.remove').click();
        expect(cols.length).to.equal(0);

        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={true}
            addColTip={"addColumn"}
            isMappingEditable={true}
        />, containerDiv);

        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(0);

    });

    it("add should work", () => {
        expect($(containerDiv).find(".addCol").length).to.equal(1);
        expect($(containerDiv).find(".addCol.xc-unavailable").length).to.equal(0);
        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(0);

        $(containerDiv).find(".addCol").click();

        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={true}
            addColTip={"addColumn"}
            isMappingEditable={true}
        />, containerDiv);

        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(1);
        expect($(containerDiv).find(".row:not(.schemaHeader) > div").length).to.equal(3);
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:first-child input").val()).to.equal("");
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:nth-child(2) input").val()).to.equal("");
        expect($(containerDiv).find(".row:not(.schemaHeader) > div:nth-child(3) input").val()).to.equal("");
    });

    it("editing mapping input should work", () => {
        expect(cols[0].mapping).to.equal("");
        let input = $(containerDiv).find(".row:not(.schemaHeader) > div:first-child input")[0];
        let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, 'aMapping');
        let event = new Event("input", {bubbles: true});
        input.dispatchEvent(event);
        expect(cols[0].mapping).to.equal("aMapping");
    });

    it("column dropdown should work", () => {
        cols = [{
                name: "a",
                type: "dfstring",
                mapping: "aLocation"
            },
            {
                name: "b",
                type: "dfint",
                mapping: "bLocation"
            }
        ];
        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={true}
            addColTip={"addColumn"}
            isMappingEditable={true}
        />, containerDiv);
        $(containerDiv).find(".row:nth-child(2) > div:nth-child(2) .iconWrapper").click();
        expect($(containerDiv).find(".row:nth-child(2) > div:nth-child(2) li").length).to.equal(4);
        expect($(containerDiv).find(".row:nth-child(2) > div:nth-child(2) li").text()).to.equal("BooleanFloat64Int64String");

        $(containerDiv).find(".row:nth-child(2) > div:nth-child(2) li:first-child").click();
        expect(cols[0].type).to.equal("DfBoolean");
    });

    it("addCol should be disabled", () => {
        cols = [{
                name: "a",
                type: "dfstring",
                mapping: "aLocation"
            }
        ];
        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={false}
            addColTip={"addColumn"}
            isMappingEditable={true}
        />, containerDiv);

        expect($(containerDiv).find(".addCol.xc-unavailable").length).to.equal(1);
        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(1);
        $(containerDiv).find(".addCol").click();

        expect($(containerDiv).find(".row:not(.schemaHeader)").length).to.equal(1);
    });

    it("isMappingEditable set to false should show dropdown", () => {
        cols = [{
                name: "a",
                type: "dfstring",
                mapping: "aLocation"
            }
        ];
        ReactDOM.render(<ColSchemaSection
            defaultSchema={defaultSchema}
            editedSchema={cols}
            updateSchema={(val) => {
                // this._updateSchema(val);
            }}
            canAdd={true}
            addColTip={"addColumn"}
            isMappingEditable={false}
        />, containerDiv);


        expect($(containerDiv).find(".row:not(.schemaHeader) > div:first-child input").attr("readonly")).to.equal("readonly");
    });

});