import React from 'react';
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';

const Texts = {
    selectListTitle: 'Selected File'
};

export default function SelectedFileArea(props) {
    const {
        bucket,
        selectedFileDir
    } = props;
    return (
        <div className="selectedFilesArea">
            <div className="heading">{Texts.selectListTitle}</div>
            <div className="selectedFile">
                {selectedFileDir[0].directory ? <Folder style={{fontSize: 20, position: "relative", top: 2}}/> :
                    <InsertDriveFileOutlined style={{fontSize: 20, position: "relative", top: 2}}/>
                }
                <span>{selectedFileDir[0].fullPath}</span>
            </div>
        </div>
    )
}