import {UnstructuredClient} from "../../../../unstructured-js-client/src";
import axios from "axios";

export const UnstructuredBaseUrl = process.env.UNSTRUCTURED_BASE_URL || 'http://localhost:8000'//'https://892d-47-100-114-86.ngrok-free.app';

const httpClient = axios.create({
    timeout: 100000,
})

httpClient.interceptors.request.use((config) => {
    return config;
})

const client = new UnstructuredClient({
    serverURL: UnstructuredBaseUrl,
    security: {
        apiKeyAuth: ""
    },
    defaultClient: httpClient
});

export const getClient = ({

}) => {
    return client;
}