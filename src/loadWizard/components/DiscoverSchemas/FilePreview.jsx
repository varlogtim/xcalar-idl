import * as React from "react";
import InputDropdown from '../../../components/widgets/InputDropdown'
import * as AdvOption from './AdvanceOption'

class FilePreview extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { fileSelectProps } = this.props;
        const { files = [] } = fileSelectProps || {};

        if (files.length === 0) {
            return null;
        }

        return (<React.Fragment>
            <div className="header">Preview</div>
            <AdvOption.Container><AdvOption.OptionGroup>
                <AdvOption.Option>
                    <AdvOption.OptionLabel>File:</AdvOption.OptionLabel>
                    <AdvOption.OptionValue><FileDropdown {...fileSelectProps} /></AdvOption.OptionValue>
                </AdvOption.Option>
            </AdvOption.OptionGroup></AdvOption.Container>
        </React.Fragment>);
    }
}

function FileDropdown(props) {
    const { isLoading, files = [], fileSelected, onSelect } = props;

    if (isLoading) {
        return 'Loading ...'
    }

    const fileMap = new Map(files.map((file) => [file.fullPath, file]));
    return (
        <InputDropdown
            val={fileSelected.fullPath}
            onSelect={ (filePath) => { onSelect(fileMap.get(filePath)); }}
            list={files.map(({fullPath}) => fullPath)}
            readOnly
        />
    );
}

export { FilePreview };