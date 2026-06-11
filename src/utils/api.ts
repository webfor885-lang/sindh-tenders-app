import { TenderItem, DocumentItem, APILog } from '../types';

const TENDERS_API = '/.netlify/functions/proxy?endpoint=tenders';
const DOCUMENTS_API = '/.netlify/functions/proxy?endpoint=documents';
const DOWNLOAD_API = '/.netlify/functions/download';

let apiLogs: APILog[] = [];
let onLogChange: ((logs: APILog[]) => void) | null = null;

export function registerLogListener(listener: (logs: APILog[]) => void) {
  onLogChange = listener;
  listener([...apiLogs]);
}

function addLog(log: Omit<APILog, 'id' | 'timestamp'>) {
  const newLog: APILog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
  };
  apiLogs = [newLog, ...apiLogs].slice(0, 30);
  if (onLogChange) onLogChange([...apiLogs]);
}

export function clearLogs() {
  apiLogs = [];
  if (onLogChange) onLogChange([]);
}

export function getTenderID(item: any): number {
  return item.publishedDocumentID ?? item.id ?? 0;
}

export function getTenderNo(item: any): string {
  return item.tenderNumbers ?? item.tenderNumber ?? 'N/A';
}

export function getTenderTitle(item: any): string {
  return item.name ?? item.tenderTitle ?? item.title ?? 'Untitled Tender';
}

export function getDepartment(item: any): string {
  return item.departmentName ?? 'N/A';
}

export function getClosingDate(item: any): string {
  const d = item.lastSubmissionDate ?? item.closingDate;
  return d ? new Date(d).toLocaleDateString('en-PK') : 'N/A';
}

export function getOpeningDate(item: any): string {
  const d = item.bidOpeningDate ?? item.openingDate;
  return d ? new Date(d).toLocaleDateString('en-PK') : 'N/A';
}

export function getPublishDate(item: any): string {
  const d = item.publishDate ?? item.publishedDate;
  return d ? new Date(d).toLocaleDateString('en-PK') : 'N/A';
}

export function getEstimatedCost(item: any): string {
  const cost = item.estimatedCost;
  if (!cost) return 'N/A';
  return 'PKR ' + Number(cost).toLocaleString();
}

export function getTenderFee(item: any): string {
  return item.tenderFee ? 'PKR ' + item.tenderFee : 'N/A';
}

export function getDocumentID(doc: any): number {
  return doc.dmS_FileID ?? doc.fileID ?? 0;
}

export function getDocumentGUID(doc: any): string {
  return doc.dmS_FileGUID ?? doc.fileGUID ?? '';
}

export function getDocumentTitle(doc: any): string {
  return doc.documentTemplateName ?? doc.fileName ?? 'document.pdf';
}

export function getDocumentSize(doc: any): string {
  return doc.fileSize ? doc.fileSize + ' bytes' : 'N/A';
}

export function extractArray(response: any): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data?.records && Array.isArray(response.data.records)) return response.data.records;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.records)) return response.records;
  return [];
}

export async function fetchTendersList(
  keywords: string = '',
  deptName: string | null = null,
  page: number = 1,
  pageSize: number = 10
): Promise<TenderItem[]> {
  const cleanKeywords = (!keywords || keywords === 'All') ? '' : keywords;
  const requestBody = {
    filter: {
      sortOrder: '',
      activityStatus: null,
      keywords: cleanKeywords,
      tenderNo: '',
      departmentName: deptName || null,
    },
    loggedInUserID: 1,
    loggedInUserOfficeID: 31640,
    pagination: {
      pageNumber: String(page),
      pageSize: String(pageSize),
      orderBy: '',
      orderByColumnName: '',
      approvalStatusID: 0,
    },
  };

  const startTime = Date.now();
  const res = await fetch(TENDERS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const duration = Date.now() - startTime;
  const text = await res.text();
  let responseBody: any;
  try { responseBody = JSON.parse(text); } catch { responseBody = text; }
  addLog({ endpoint: 'tenders', status: res.ok ? 'SUCCESS' : 'ERROR', statusCode: res.status, duration, requestBody, responseBody });
  if (!res.ok) throw new Error('Tenders fetch failed: ' + res.status);
  return extractArray(responseBody);
}

export async function fetchTenderDocuments(publishedDocumentID: number | string): Promise<DocumentItem[]> {
  const requestBody = { Id: publishedDocumentID, loggedInUserID: 1, loggedInUserOfficeID: 1 };
  const startTime = Date.now();
  const res = await fetch(DOCUMENTS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const duration = Date.now() - startTime;
  const text = await res.text();
  let responseBody: any;
  try { responseBody = JSON.parse(text); } catch { responseBody = text; }
  addLog({ endpoint: 'documents', status: res.ok ? 'SUCCESS' : 'ERROR', statusCode: res.status, duration, requestBody, responseBody });
  if (!res.ok) throw new Error('Documents fetch failed: ' + res.status);
  return extractArray(responseBody);
}

export async function downloadDocument(
  dmS_FileID: number | string,
  dmS_FileGUID: string,
  fileName: string
): Promise<Blob> {
  const requestBody = { ID: dmS_FileID, idsList: dmS_FileGUID, loggedInUserID: 1, loggedInUserOfficeID: 31640 };
  const startTime = Date.now();
  const res = await fetch(DOWNLOAD_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const duration = Date.now() - startTime;
  if (!res.ok) throw new Error('Download failed: ' + res.status);

  const rawText = await res.text();
  let pdfBlob: Blob;

  try {
    const jsonParsed = JSON.parse(rawText);
    const base64Bytes = jsonParsed?.data?.bytes || jsonParsed?.bytes;
    if (base64Bytes) {
      let binaryString: string;
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        binaryString = window.atob(base64Bytes);
      } else {
        binaryString = Buffer.from(base64Bytes, 'base64').toString('binary');
      }
      const len = binaryString.length;
      const bytesArray = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytesArray[i] = binaryString.charCodeAt(i);
      }
      pdfBlob = new Blob([bytesArray], { type: 'application/pdf' });
      addLog({ 
        endpoint: 'download', 
        status: 'SUCCESS', 
        statusCode: res.status, 
        duration, 
        requestBody, 
        responseBody: `Decoded Base64: ${pdfBlob.size} bytes` 
      });
    } else {
      throw new Error("JSON response didn't contain base64 bytes");
    }
  } catch (err) {
    console.warn("JSON decoding of PDF bytes failed, fallback to raw binary blob:", err);
    // Real fallback fetch to get blob directly if proxy behaves differently
    const secondRes = await fetch(DOWNLOAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const blob = await secondRes.blob();
    pdfBlob = new Blob([blob], { type: 'application/pdf' });
    addLog({ 
      endpoint: 'download', 
      status: 'SUCCESS', 
      statusCode: res.status, 
      duration, 
      requestBody, 
      responseBody: `Fallback raw blob: ${pdfBlob.size} bytes` 
    });
  }

  return pdfBlob;
}
