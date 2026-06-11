exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const endpoint = event.queryStringParameters?.endpoint;
  
  const urls = {
    tenders: 'https://apiprd.eprocure.gov.pk/websiteportal/publicportal/1.0.0/api/v1/publicportal/getallpublictenders',
    documents: 'https://apiprd.eprocure.gov.pk/websiteportal/publicportal/1.0.0/api/v1/publicportal/getallpublisheddocumentdetailbypdid',
  };

  const defaultBody = {
    filter: { sortOrder: '', activityStatus: null, keywords: '', tenderNo: '', departmentName: null },
    loggedInUserID: 1,
    loggedInUserOfficeID: 31640,
    pagination: { pageNumber: '1', pageSize: '10', orderBy: '', orderByColumnName: '', approvalStatusID: 0 }
  };

  const body = event.body ? JSON.parse(event.body) : defaultBody;

  try {
    const response = await fetch(urls[endpoint], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic YWRtaW46cHByYTEy',
        'officedetail': 'Sindh-PPRA-Dev',
        'origin': 'https://portalsindh.eprocure.gov.pk',
        'referer': 'https://portalsindh.eprocure.gov.pk/',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
