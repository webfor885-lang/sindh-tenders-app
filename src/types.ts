export interface TenderFilter {
  sortOrder: string;
  activityStatus: string | null;
  keywords: string;
  tenderNo: string;
  departmentName: string | null;
}

export interface TenderPagination {
  pageNumber: string;
  pageSize: string;
  orderBy: string;
  orderByColumnName: string;
  approvalStatusID: number;
}

export interface TenderListRequest {
  filter: TenderFilter;
  loggedInUserID: number;
  loggedInUserOfficeID: number;
  pagination: TenderPagination;
}

export interface TenderItem {
  // Common possible fields (supporting auto-mapping)
  id?: number | string;
  publishedDocumentID?: number | string;
  publishedDocumentId?: number | string;
  tenderNo?: string;
  tender_No?: string;
  tenderNo_?: string;
  tenderNumber?: string;
  tenderTitle?: string;
  title?: string;
  tenderSubject?: string;
  subject?: string;
  tenderName?: string;
  description?: string;
  departmentName?: string;
  department_Name?: string;
  department?: string;
  closingDate?: string;
  closing_Date?: string;
  submissionDate?: string;
  tenderClosingDate?: string;
  openingDate?: string;
  tenderOpeningDate?: string;
  publishedDate?: string;
  publishDate?: string;
  tenderFee?: number | string;
  estimatedCost?: number | string;
  [key: string]: any; // Allow indexing
}

export interface DocumentItem {
  dmS_FileID?: number | string;
  dmsfileID?: number | string;
  fileID?: number | string;
  dmS_FileGUID?: string;
  dmsfileGUID?: string;
  fileGUID?: string;
  documentTitle?: string;
  fileName?: string;
  title?: string;
  fileSize?: string | number;
  documentTypeName?: string;
  [key: string]: any;
}

export interface APILog {
  id: string;
  timestamp: string;
  endpoint: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  statusCode?: number;
  duration?: number;
  requestBody: any;
  responseBody?: any;
  errorMessage?: string;
}
