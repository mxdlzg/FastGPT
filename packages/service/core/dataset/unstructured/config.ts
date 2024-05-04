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

function initClient(config?: UnstructuredEnvType){
    if (!config){
        config = global.unstructuredConfigs;
    }
    const httpClient = axios.create({
        timeout: config.timeout,
    })

    // httpClient.interceptors.request.use((config) => {
    //     return config;
    // })
    client = new UnstructuredClient({
        serverURL: config.baseUrl || 'http://localhost:8000',
        security: {
            apiKeyAuth: ""
        },
        defaultClient: httpClient,
        retryConfig: {
            logger: addLog,
            strategy: config.retryConfig.strategy,
            retryConnectionErrors: true,
            backoff: {
                initialInterval: config.retryConfig.initialInterval,
                maxInterval: config.retryConfig.maxInterval,
                maxElapsedTime: config.retryConfig.maxElapsedTime,
                exponent: config.retryConfig.exponent,
            }
        }
    });
}



export const getClient = (config?: UnstructuredEnvType) => {
    if (!client) {
        initClient(config);
    }
    return client;
}