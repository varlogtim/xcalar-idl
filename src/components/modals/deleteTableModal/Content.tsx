import * as React from "react";
import dict from "../../../lang";
import Checkbox from "../../widgets/Checkbox";
import { TableAttrs } from "../../../services/DeleteTableModalService";
import Row from "./Row";
import Title from "./Title";

const {CommonTStr, DeleteTableModalTStr} = dict;

type ContentProps = {
    tables: TableAttrs[];
    sortKey: string;
    onSelectAllClick;
    onCheckboxClick;
    onSort;
};
export default function Content(props: ContentProps) {
    const { tables, sortKey, onSelectAllClick, onSort } = props;
    let selectAllVal: boolean = true;
    let checked: boolean = false;
    let selectedTables = tables.filter((table) => table.checked);
    let unlockedTabls = tables.filter((table) => !table.locked);
    if (selectedTables.length == unlockedTabls.length && unlockedTabls.length > 0) {
        checked = true;
        selectAllVal = false;
    }

    let titles = [{
        name: "name",
        text: DeleteTableModalTStr.Tables
    }, {
        name: "size",
        text: CommonTStr.Size,
    }, {
        name: "date",
        text: CommonTStr.DateModified
    }];
    return (
        <section className="section">
            <div className="titleSection">
                <Checkbox
                    checked={checked}
                    onClick={() => onSelectAllClick(selectAllVal)}
                />
                {
                titles.map((title) => {
                    let classNames = [];
                    let {name, text} = title;
                    if (name === "name") {
                        classNames.push("name");
                    }
                    if (name === sortKey) {
                        classNames.push("active");
                    }
                    return <Title
                                name={name}
                                className={classNames.join(" ")}
                                onSort={onSort}
                            >
                                { text }
                            </Title>
                })
                }
            </div>
            <div className="listSection">
                <ul>
                {
                    tables.map((table, i) => {
                        return <Row table={table} onClick={() => props.onCheckboxClick(i)}/>;
                    })
                }
                </ul>
            </div>
        </section>
    )
}