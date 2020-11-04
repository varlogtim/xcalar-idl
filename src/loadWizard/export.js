import * as SchemaLoadSetting from './services/SchemaLoadSetting'
import * as SchemaLoadService from './services/SchemaLoadService'
import { loadSessionName } from './services/sdk/Session'

window['XcalarLoad'] = {
    Setting: SchemaLoadSetting,
    SchemaLoadService: SchemaLoadService,
    workSessionName: loadSessionName
};
