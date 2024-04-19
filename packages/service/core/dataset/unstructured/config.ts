import {UnstructuredClient} from "../../../../unstructured-js-client/src";
import axios from "axios";

export const UnstructuredBaseUrl = process.env.UNSTRUCTURED_BASE_URL || 'http://localhost:8000'//'https://892d-47-100-114-86.ngrok-free.app';

const httpClient = axios.create({
    timeout: 200000,
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
        strategy: "backoff",
        retryConnectionErrors: true,
        backoff: {
            initialInterval: 10000,
            maxInterval: 30000,
            maxElapsedTime: 600000,
            exponent: 1.5,
        }
    }
});

export const getClient = ({

}) => {
    return client;
}