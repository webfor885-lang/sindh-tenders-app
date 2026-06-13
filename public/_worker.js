export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Proxy API calls
    if (url.pathname === '/api/tenders') {
      const body = await request.json();
      const res = await fetch(
        'https://apiprd.eprocure.gov.pk/websiteportal/publicportal/1.0.0/api/v1/publicportal/getallpublictenders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YWRtaW46cHByYTEy',
            'officedetail': 'Sindh-PPRA-Dev',
            'origin': 'https://portalsindh.eprocure.gov.pk',
            'referer': 'https://portalsindh.eprocure.gov.pk/',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/documents') {
      const body = await request.json();
      const res = await fetch(
        'https://apiprd.eprocure.gov.pk/websiteportal/publicportal/1.0.0/api/v1/publicportal/getallpublisheddocumentdetailbypdid',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YWRtaW46cHByYTEy',
            'officedetail': 'Sindh-PPRA-Dev',
            'origin': 'https://portalsindh.eprocure.gov.pk',
            'referer': 'https://portalsindh.eprocure.gov.pk/',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/download') {
      const body = await request.json();
      const res = await fetch(
        'https://apiprd.eprocure.gov.pk/documentmanagementsystem/dmspublicapi/1.0.0/api/v1/dmspublicapi/downloadportalfilebyguid',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YWRtaW46cHByYTEy',
            'officedetail': 'Sindh-PPRA-Dev',
            'origin': 'https://portalsindh.eprocure.gov.pk',
            'referer': 'https://portalsindh.eprocure.gov.pk/',
          },
          body: JSON.stringify(body),
        }
      );
      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="tender.pdf"',
        },
      });
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};
