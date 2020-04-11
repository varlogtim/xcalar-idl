import * as React from "react";
import dict from "../../../lang";
import Checkbox from "../../widgets/Checkbox";
import Tooltipbox from "../../widgets/Tooltipbox";
import { DeleteItems } from "./GeneralDeleteModal";

const {TooltipTStr} = dict;

type RowProps = {
    id: string;
    table: DeleteItems,
    onClick: any
};

export default function Row(props: RowProps) {
    const {id, table, onClick} = props;
    let {name, sizeText, locked, checked, date, dateTip} = table;
    let container = `#${id}`;
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
            <div>{sizeText}</div>
            <div {...dateTip}>{date}</div>
        </div>
    );
}