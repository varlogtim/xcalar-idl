// This is the Typescript shape of xcrpc JS client code(assets/js/xcrpc/*)

// === Service definitions: Begin ===
declare namespace xce {
    export class XceClient {
        constructor(endpoint: string);
    }

    export class KvStoreService {
        constructor(client: XceClient);
        lookup(request: proto.xcalar.compute.localtypes.KvStore.LookupRequest): XDPromise<proto.xcalar.compute.localtypes.KvStore.LookupResponse>;
    }
}
// === Service definitions: End ===

// === Data structure definitions: Begin ===
declare namespace proto.xcalar.compute.localtypes.KvStore {
    export class LookupRequest {
        setKey(value: ScopedKey): void;
    }
    export class LookupResponse {
        getValue(): KeyValue;
    }
    export class KeyValue {
        getText(): string;
    }
    export class ScopedKey {
        setName(value: string): void;
        setScope(value: Workbook.WorkbookScope): void;
    }
}

declare namespace proto.xcalar.compute.localtypes.Workbook {
    export class WorkbookScope {
        setGlobl(value: GlobalSpecifier): void;
        setWorkbook(value: WorkbookSpecifier): void;
    }

    export class GlobalSpecifier {}

    export class WorkbookSpecifier {
        setName(value: WorkbookSpecifier.NameSpecifier): void;
    }
    export namespace WorkbookSpecifier {
        export class NameSpecifier {
            setUsername(value: string): void;
            setWorkbookname(value: string): void;
        }
    }

    export const ScopeType: {
        GLOBALSCOPETYPE: number, WORKBOOKSCOPETYPE: number
    }
}
// === Data structure definitions: End ===