import {UnstructuredClient} from "../sdk/sdk"
import fs from "fs"
import axios from "axios";

export const UnstructuredBaseUrl = process.env.UNSTRUCTURED_BASE_URL || 'http://localhost:8000'//'https://892d-47-100-114-86.ngrok-free.app';

const httpClient = axios.create({
    timeout: 100000,
    proxy:{
        host:'localhost',
        port:8888
    }
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

export const getClient = () => {
    return client;
}


describe('test', () => {
    const client = getClient()
    client.general.partition({
        files: {
            content: fs.readFileSync("README.md"),
            fileName: "input_file.pdf"
        },
        extractImageBlockTypes: Array.of("image", "table"),
        hiResModelName: "yolox",
        encoding: "utf-8",
    })
});