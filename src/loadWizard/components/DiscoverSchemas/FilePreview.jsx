import * as React from "react";
import InputDropdown from '../../../components/widgets/InputDropdown'
import * as AdvOption from './AdvanceOption'
import LoadingText from '../../../components/widgets/LoadingText'

class FilePreview extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { fileSelectProps } = this.props;
        const { files = [], fileSelected } = fileSelectProps || {};

        if (files.length === 0) {
            return null;
        }

        return (<div>
            <div className="header">Preview</div>
            <AdvOption.Container><AdvOption.OptionGroup>
                <AdvOption.Option>
                    <AdvOption.OptionLabel>File:</AdvOption.OptionLabel>
                    <AdvOption.OptionValue><FileDropdown {...fileSelectProps} /></AdvOption.OptionValue>
                </AdvOption.Option>
            </AdvOption.OptionGroup></AdvOption.Container>
            <FileContentWrap filePath={fileSelected.fullPath} />
        </div>);
    }
}

function FileDropdown(props) {
    const { isLoading, files = [], fileSelected, onSelect } = props;

    if (isLoading) {
        return (<LoadingText className="clearfix" />);
    }

    return (
        <InputDropdown
            val={fileSelected.fullPath}
            onSelect={ (file) => { onSelect(file); }}
            list={files.map((file) => ({
                value: file, text: file.fullPath
            }))}
            readOnly
        />
    );
}

class FileContentWrap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            error: null,
            content: [],
            isAutoDetect: false,
            lineSelected: -1,
            lineOffset: 0
        };

        this._fetchJob = {
            cancel: () => {},
            getFilePath: () => null
        };
    }

    componentDidMount() {
        this._fetchFileContent(this.props.filePath);
    }

    componentDidUpdate(prevProps, prevState) {
        const { filePath } = this.props;
        this._fetchFileContent(filePath);
    }

    async _fetchFileContent(filePath) {
        if (filePath === this._fetchJob.getFilePath()) {
            return;
        }

        // Stop the previous fetching
        this._fetchJob.cancel();

        let cancel = false;
        this._fetchJob = {
            cancel: () => { cancel = true; },
            getFilePath: () => filePath
        };

        // Fetch file content
        this.setState({
            isLoading: true,
            error: null
        });

        try {
            // XXX TODO: replace with the real service call
            const fileContent = await fakePreviewCall(filePath);
            if (!cancel) {
                this.setState({
                    isLoading: false,
                    content: fileContent,
                    lineSelected: -1,
                    lineOffset: 0
                });
            }
        } catch(e) {
            if (!cancel) {
                this.setState({
                    isLoading: false,
                    error: `${e}`
                });
            }
        }
    }

    _onLineChange(index) {
        this.setState({ lineSelected: index });
        if (index >= 0) {
            this.setState({ isAutoDetect: false });
            console.log('Schema selected: ', this.state.content[index].schema)
        } else {
            console.log('No schema selected');
        }
    }

    _onAutoDetectChange(checked) {
        this.setState(({ lineSelected }) => ({
            isAutoDetect: checked,
            lineSelected: checked ? -1 : lineSelected
        }));
    }

    render() {
        const { isLoading, error, content, isAutoDetect, lineSelected, lineOffset } = this.state;
        const { pageSize = 10 } = this.props || {};

        if (isLoading) {
            return (<LoadingText className="clearfix" />);
        }

        if (error != null) {
            return (<pre>{error}</pre>);
        }

        const prevOffset = lineOffset - pageSize;
        const pagePrev = prevOffset >= 0
            ? () => { this.setState({ lineOffset: prevOffset }); }
            : null;
        const nextOffset = lineOffset + pageSize;
        const pageNext = nextOffset < content.length
            ? () => { this.setState({ lineOffset: nextOffset }); }
            : null;

        return (<div>
            <FileContent
                data={content.map(({data}) => data)}
                selected={lineSelected}
                onSelectChange={(i) => { this._onLineChange(i); }}
                offset={lineOffset}
                numRows={pageSize}
            >
                <AutoDetectOption checked={isAutoDetect} onChange={(checked) => { this._onAutoDetectChange(checked); }}></AutoDetectOption>
            </FileContent>
            <Pagination onNext={pageNext} onPrev={pagePrev} />
        </div>);
    }
}

async function fakePreviewCall(filePath) {
    await timeout(3000);
    const result = [];
    for (let i = 0; i < 100; i ++) {
        result.push({
            data: { path: filePath, line: i },
            schema: [
                { name: `path${i}`, type: 'DfString', mapping: '$."path"'},
                { name: 'line', type: 'DfInt64', mapping: '$."line"'}
            ]
        });
    }
    return result;

    function timeout(ms) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(); }, ms);
        });
    }
}


function FileContent(props) {
    const { data = [], onSelectChange, selected = -1, children, offset = 0, numRows = -1 } = props;

    if (data.length === 0) {
        return (<span>No Content</span>);
    }

    const startIndex = offset;
    const endIndex = startIndex + (numRows > 0 ? numRows : data.length) - 1;
    return (<div>
        { children }
        {data.map((line, index) => {
            return (<FileLine key={`${index}`} checked={selected === index} onChange={(checked) => {
                onSelectChange(checked ? index : -1)
            }}>
                <span style={{fontStyle: 'italic'}}>{index}: </span>{JSON.stringify(line)}
            </FileLine>);
        }).filter((v, i) => (i >= startIndex && i <= endIndex))}
    </div>);
}

function Pagination(props) {
    const { onNext, onPrev } = props;
    return (<ul style={{listStyle: 'none'}}>
        <NavButton onClick={onPrev}>{'< Previous'}</NavButton>
        <NavButton onClick={onNext}>{'Next >'}</NavButton>
    </ul>);

    function NavButton({ onClick, children }) {
        const style = {
            padding: '4px',
            display: 'inline',
            cursor: 'pointer'
        };
        if (onClick == null) {
            style.opacity = '0.3';
            style.pointerEvents = 'none';
        }
        return (<li style={style} onClick={() => {onClick()}}>{children}</li>);
    }
}

function FileLine(props) {
    const { checked, onChange, children } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];

    return (
        <div className="csvArgs-chkbox">
            <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <span style={{paddingLeft: '4px'}} onClick={() => { onChange(!checked); }}>{children}</span>
        </div>
    );
}

function AutoDetectOption(props) {
    const { checked, onChange } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];

    return (
        <div className="csvArgs-chkbox">
            <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <span style={{paddingLeft: '4px'}} onClick={() => { onChange(!checked); }}>Auto Detect Schema</span>
        </div>
    );
}

export { FilePreview };