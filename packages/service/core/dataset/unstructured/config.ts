import {UnstructuredClient} from "../../../../unstructured-js-client/src";
import axios from "axios";
import {addLog} from "../../../common/system/log";

export type UnstructuredEnvType = {
    baseUrl: string;
    timeout: number;
    retryConfig: {
        strategy: "backoff" | "none";
        initialInterval: number;
        maxInterval: number;
        maxElapsedTime: number;
        exponent: number;
    };
}

let client: UnstructuredClient | null = null;

function initClient(){
    const httpClient = axios.create({
        timeout: global.unstructuredConfigs.timeout,
    })

    // httpClient.interceptors.request.use((config) => {
    //     return config;
    // })
    client = new UnstructuredClient({
        serverURL: global.unstructuredConfigs.baseUrl || 'http://localhost:8000',
        security: {
            apiKeyAuth: ""
        },
        defaultClient: httpClient,
        retryConfig: {
            logger: addLog,
            strategy: global.unstructuredConfigs.retryConfig.strategy,
            retryConnectionErrors: true,
            backoff: {
                initialInterval: global.unstructuredConfigs.retryConfig.initialInterval,
                maxInterval: global.unstructuredConfigs.retryConfig.maxInterval,
                maxElapsedTime: global.unstructuredConfigs.retryConfig.maxElapsedTime,
                exponent: global.unstructuredConfigs.retryConfig.exponent,
            }
        }
    });
}



export const getClient = ({

}) => {
    if (!client) {
        initClient();
    }
    return client;
}