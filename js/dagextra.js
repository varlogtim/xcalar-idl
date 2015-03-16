 var html = 
            '<div class="retTab unconfirmed">' + 
                '<div class="tabWrap">' + 
                    '<input type="text" class="retTitle"' + 
                    ' value="' + retName + '" >' + 
                    '<div class="retDown">' + 
                        '<span class="icon"></span>' + 
                    '</div>' + 
                '</div>' + 
                '<div class="retPopUp">' + 
                    '<div class="divider"></div>' + 
                    '<div class="inputSection">' + 
                        '<input class="newParam" type="text"' + 
                        ' placeholder="Input New Parameter">' + 
                        '<div class="btn addParam">' + 
                            '<span class="icon"></span>' + 
                            '<span class="label">' + 
                                'CREATE NEW PARAMETER' + 
                            '</span>' + 
                        '</div>' +
                    '</div>' + 
                    '<div class="tableContainer">' + 
                        '<div class="tableWrapper">' + 
                            '<table>' + 
                                '<thead>' + 
                                    '<tr>' +
                                        '<th>' +  
                                            '<div class="thWrap">' + 
                                                'Current Parameter' + 
                                            '</div>' + 
                                        '</th>' +  
                                        '<th>' +  
                                            '<div class="thWrap">' + 
                                                'Default Value' + 
                                            '</div>' + 
                                        '</th>' +   
                                    '</tr>' + 
                                '</thead>' +
                                '<tbody>';
        for (var i = 0; i < 7; i ++) {
            html += '<tr class="unfilled">' +
                        '<td class="paramName"></td>' + 
                        '<td>' + 
                            '<div class="paramVal"></div>' + 
                            '<div class="delete paramDelete">' +
                                '<span class="icon"></span>' + 
                            '</div>' + 
                        '</td>' + 
                   '</tr>';
        }

        html += '</tbody></table></div></div></div></div>';


        .retPopUp {
                    display: none;
                    width: 440px;
                    height: 295px;
                    position: absolute;
                    left: -288px;
                    top: 30px;
                    background: @color-white;
                    border-radius: 0px 0px 3px 3px;
                    box-shadow: 0px 3px 6px 0 rgba(0, 0, 0, 0.3);

                    .divider {
                        width: 100%;
                        height: 4px;
                        background: #979797;
                    }
                    .inputSection {
                        width: 100%;
                        height: 45px;
                        background: #eaeaea;
                        box-shadow: 0px 3px 3px 0 rgba(0, 0, 0, 0.4);
                        padding: 7px 10px;
                        .newParam {
                            display: inline-block;
                            width: 194px;
                            height: 30px;
                            background: @color-white;
                            float: left;
                            padding-left: 9px;
                            box-shadow: inset -2px 0px 2px 0 rgba(0, 0, 0, 0.3);
                            border-radius: 3px;
                            font-weight: bold;
                            font-size: 13px;
                            color: #cccccc;
                            .input-placeholder(#cccccc);
                        }
                        .addParam {
                            display: inline-block;
                            width: 214px;
                            height: 30px;
                            margin-left: 12px;
                            border-radius: 3px;
                            box-shadow: 1px 1px 4px 0 rgba(0, 0, 0, 0.8);
                            padding-top: 5px;
                            .icon {
                                float: left;
                                margin: 0px 8px 0 6px;
                                .background("/images/retina/retNewParam.png", 24px, 23px);
                            }
                            .label {
                                width: 170px;
                                font-size: 12px;
                                font-weight: bold;
                                color: @color-text-cyan;
                            }
                        }
                    }
                    .tableContainer {
                        position: relative;
                        width: 100%;
                        height: ~"calc(100% - 55px)";
                        background: @color-white;
                        z-index: -1;
                        padding: 0 10px;
                        .tableWrapper {
                            overflow-y: scroll;
                            height: 100%;
                            margin: 0 auto;
                            .thWrap {
                                width: 226px;
                                height: 30px;
                                line-height: 30px;
                                position: absolute;
                                background: #a8a8a8;
                                top: 0px;
                                z-index: 40;
                                padding-left: 10px;
                                font-weight: bold;
                                font-size: 13px;
                                color: @color-text-white;
                            }
                            .paramVal {
                                    float: left;
                                    background: transparent;
                                    height: 100%;
                                    line-height: 100%;
                                    width: 80%;
                            }
                            .paramDelete {
                                float: right;
                                width: 20px;
                                position: relative;
                                right: 2px;
                                cursor: pointer;
                                .icon {
                                    position: relative;
                                    top: 1px;
                                    .background("/images/ds-close.png", 15px, 15px);
                                }
                            }
                            &::-webkit-scrollbar {
                                display: none;
                            }
                            .unfilled .paramDelete {
                                display: none;
                            }
                        }
                    }
                    table {
                        margin: auto;
                        table-layout: fixed;
                        text-align: left;
                        border-collapse: collapse;
                        th {
                            height: 30px;
                            &:first-of-type .thWrap{
                                width: 194px !important;
                                border-right: 1px solid #ffffff;
                            }
                        }
                        tbody {
                            tr {
                                td {
                                    width: 226px;
                                    height: 30px;
                                    line-height: 30px;
                                    position: relative;
                                    padding-left: 10px;
                                    font-weight: bold;
                                    font-size: 13px;
                                    &:first-of-type {
                                        width: 194px;
                                        border-right: 1px solid #a8a8a8;
                                    }
                                }
                                &:nth-child(odd) {
                                    background-color: @color-background-darkGray;
                                }
                                &:nth-child(even) {
                                    background-color: #f4f4f4;
                                }
                            }
                        }
                    }