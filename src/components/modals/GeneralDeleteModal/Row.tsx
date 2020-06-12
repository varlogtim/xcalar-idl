import * as React from "react";
import dict from "../../../lang";
import Checkbox from "../../widgets/Checkbox";
import Tooltipbox from "../../widgets/Tooltipbox";
import { DeleteItems } from "./GeneralDeleteModal";

const {TooltipTStr} = dict;

type RowProps = {
    id: string;
    table: DeleteItems,
    hideDate: boolean,
    onClick: any
};

export default function Row(props: RowProps) {
    const xcHelper = window["xcHelper"];
    const {id, table, hideDate, onClick} = props;
    const {name, locked, checked, size, date} = table;
    const container = `#${id}`;
    const {date_str, date_tip}= getDateString(date, container);
    return (
        <div className="grid-unit" key={name}>
            {
                locked
                ? <i className="lockIcon icon xi-lockwithkeyhole"
                    data-toggle="tooltip"
                    data-container={container}
                    data-placement="top"
                    data-title={TooltipTStr.LockedTable}>
                </i>
                : <Checkbox checked={checked} onClick={onClick}/>
            }
            <Tooltipbox className="name" container={container} title={name}>
                {name}
            </Tooltipbox>
            <div>{xcHelper.sizeTranslator(size)}</div>
            {hideDate ? null : <div {...date_tip}>{date_str}</div>}
        </div>
    );
}

function getDateString(date: number, container: string): {date_str: string, date_tip: object} {
    const xcTimeHelper = window["xcTimeHelper"];
    const moment = window["moment"];
    let date_tip = null;
    let date_str = "--";
    if (date !== -1) {
        let time = moment(date);
        date_tip = xcTimeHelper.reactGetDateTip(time, {
            container: container
        });
        date_str = time.calendar();
    }
    return {
        date_str,
        date_tip
    };
}