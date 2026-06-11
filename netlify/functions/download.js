const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const body = JSON.parse(event.body || '{}');

  return new Promise((resolve) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: 'apiprd.eprocure.gov.pk',
      path: '/documentmanagementsystem/dmspublicapi/1.0.0/api/v1/dmspublicapi/downloadportalfilebyguid',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Basic YWRtaW46cHByYTEy',
        'officedetail': 'Sindh-PPRA-Dev',
        'origin': 'https://portalsindh.eprocure.gov.pk',
        'referer': 'https://portalsindh.eprocure.gov.pk/',
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chu
