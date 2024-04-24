import {UnstructuredClient} from "../../../../unstructured-js-client/src";
import axios from "axios";
import {addLog} from "../../../common/system/log";

export const UnstructuredBaseUrl = process.env.UNSTRUCTURED_BASE_URL || 'http://localhost:8000'//'https://892d-47-100-114-86.ngrok-free.app';

const httpClient = axios.create({
    timeout: 480000,
})

httpClient.interceptors.request.use((config) => {
    return config;
})

const client = new UnstructuredClient({
    serverURL: UnstructuredBaseUrl,
    security: {
        apiKeyAuth: ""
    },
    defaultClient: httpClient,
    retryConfig: {
        logger: addLog,
        strategy: "backoff",
        retryConnectionErrors: true,
        backoff: {
            initialInterval: 5000,
            maxInterval: 10000,
            maxElapsedTime: 1200000,
            exponent: 1.5,
        }
    }
});

export const getClient = ({

}) => {
    return client;
}