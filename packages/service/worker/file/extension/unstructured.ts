import {ReadFileResponse} from "../../../common/file/read/type";
import {initMarkdownText} from '../../../common/file/read/utils';
import {queryImageDescription} from "../../../core/ai/functions/queryImageDescription";
import {getClient} from "../../../core/dataset/unstructured/config";
import {addLog} from "../../../common/system/log";
import {PDFDocument} from "pdf-lib"
import pLimit from "p-limit";
import {ReadRawTextByBuffer} from "../type";
import {workerData} from "worker_threads"
import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";
import {getAIApi} from "../../../core/ai/config";

type UnstructuredElementType = {
    type: string;
    text: string;
    element_id?: string;
    metadata: {
        image_base64: string;
        languages: string[];
    };
}

const limit = pLimit(3);

// 解构文件，目前接收pdf、word
export const readUnFile = async ({ buffer, preview, metadata }: ReadRawTextByBuffer): Promise<ReadFileResponse> => {

    if (preview) {
        const pdfDoc = await PDFDocument.load(buffer);
        const pagesMax = pdfDoc.getPageCount() > 3 ? 3 : pdfDoc.getPageCount()
        const pdfTempDoc = await PDFDocument.create();
        const newPages = await pdfTempDoc.copyPages(pdfDoc, Array.from({ length: pagesMax }, (_, index) => index))
        for (let i = 0; i < newPages.length; i++) {
            pdfTempDoc.addPage(newPages[i])
        }
        buffer = Buffer.from(await pdfTempDoc.save());
    }

    //1. 请求分割pdf
    addLog.info(`File ${metadata?.relatedId} partition started.`);
    const client = getClient(workerData.globalConfig.unstructuredConfigs)
    const res = await client?.general.partition({
        files: {
            content: buffer,
            fileName: "input_file.pdf"
        },
        extractImageBlockTypes: ["image", "table"],
        hiResModelName: "yolox",
        encoding: "utf-8",
    })
    addLog.info(`File ${metadata?.relatedId} partition finished.`);

    //2. 清洗原始分割元素（去除header）
    let pageElements = res?.elements?.filter((element: any) => {
        return element && element.type != "Header";
    })

    if (!pageElements || pageElements.length == 0) {
        pageElements = []
    }
    if (metadata) {
        metadata["elements"] = pageElements;
    }
    return {
        formatText: "", metadata: metadata, rawText: ""
    }
}

export const initPdfText = async ({ metadata, teamId, dataset, pageElements }: {
    metadata: any;
    teamId: string;
    dataset: DatasetSchemaType|undefined;
    pageElements: any[];
}): Promise<string> => {
    const ai = getAIApi({
        timeout: 480000
    })
    //3. 请求llm-v对图片（图片和表格）进行描述 4. 将图片、表格插入mongodb
    const asyncOperation = async (element: UnstructuredElementType) => {
        if (["Image", "Table"].includes(element.type) && element.text.length >= 2 && element.metadata.image_base64) {
            addLog.info(`Begin llm image: ${element.element_id}`);
            const [llmText, mongoText] = await Promise.all([
                queryImageDescription({
                    rawTex: element.text,
                    image_base64: "data:image/jpeg;base64," + element.metadata.image_base64,
                    model: (dataset?.agentModel || "gemini-pro-vision"),
                    ai: ai,
                    language: element.metadata.languages[0],
                }).catch(error => {
                    addLog.error(`Llm image ${element.element_id} error:`, error)
                    return "";
                }),
                initMarkdownText({
                    teamId: teamId,
                    md: `, the image related to previous description is: ![](data:image/jpeg;base64,${element.metadata.image_base64})`,
                    metadata: metadata,
                }).catch(error => {
                    addLog.error(`initMarkdownText ${element.element_id} error:`, error)
                    return "";
                })
            ]);
            element.text = llmText + mongoText + "\n";
            addLog.info(`End llm image: ${element.element_id}`);
        }
    };
    const promises = pageElements.map((element: UnstructuredElementType) => limit(() => asyncOperation(element)));
    await Promise.all(promises);
    addLog.info(`Query ${metadata?.relatedId} pdf image description and mongo end.`);

    //5. 拼接所有文本成rawText
    const finalText = pageElements?.map((element: UnstructuredElementType) => {
        return `${element.text}\n`
    }).join('');
    addLog.info(`Join ${metadata?.relatedId} pdf text end.`);

    return finalText
}