namespace Xcrpc {
    import ServiceClient = Xcrpc.ServiceClient;

    export class ServiceClientFactory {
        public static readonly DEFAULT_CLIENT_NAME = 'DEFAULT';
        private static _serviceClients = new Map<string, ServiceClient>();

        public static getServiceClient(name: string): ServiceClient {
            return this._serviceClients.get(name);
        }

        public static create(name: string, endpoint: string): ServiceClient {
            if (!this._serviceClients.has(name)) {
                this._serviceClients.set(name, new ServiceClient(endpoint));
            }
            return this._serviceClients.get(name);
        }
    }

    // Shortcut functions
    export function createClient(name: string, endpoint: string): ServiceClient {
        return ServiceClientFactory.create(name, endpoint);
    }

    export function getClient(name: string): ServiceClient {
        return ServiceClientFactory.getServiceClient(name);
    }
    
    export const DEFAULT_CLIENT_NAME = ServiceClientFactory.DEFAULT_CLIENT_NAME;
}

if (typeof exports !== 'undefined') {
    exports.ServiceClientFactory = Xcrpc.ServiceClientFactory;
    exports.createClient = Xcrpc.createClient;
    exports.getClient = Xcrpc.getClient;
    exports.DEFAULT_CLIENT_NAME = Xcrpc.DEFAULT_CLIENT_NAME;
}