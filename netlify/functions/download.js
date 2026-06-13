export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body;
    
    const response = await fetch(
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

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Download failed', 
        status: response.status 
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tender.pdf"');
    res.setHeader('Content-Length', bytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.status(200).send(Buffer.from(bytes));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
