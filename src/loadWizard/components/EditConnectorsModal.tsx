import * as React from "react"
import * as Modal from './Modal'

export default class EditConnectorsModal extends React.Component<any, any> {
    render() {
        const { onClose} = this.props;
        return (
            <Modal.Dialog resizable>
                <Modal.Header onClose={onClose}>Connectors</Modal.Header>
                <Modal.Body style={{padding: '12px'}}>

                </Modal.Body>
            </Modal.Dialog>
        );
    }
}
