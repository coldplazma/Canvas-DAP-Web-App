const axios = require('axios');

module.exports = async (req, res) => {
  // Log every request for debugging
  console.log(`[CORS PROXY] Received ${req.method} request from origin: ${req.headers.origin}`);
  console.log(`[CORS PROXY] Request headers:`, req.headers);
  
  // IMPORTANT: Handle preflight OPTIONS request FIRST
  if (req.method === 'OPTIONS') {
    console.log('[CORS PROXY] Handling OPTIONS preflight request');
    
    // Set CORS headers for preflight request
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600'); // Cache preflight for 1 hour
    
    // Return 204 No Content for preflight
    res.status(204).end();
    return;
  }
  
  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  
  // Check if this is a GET or POST request
  if (req.method !== 'POST' && req.method !== 'GET') {
    console.log(`[CORS PROXY] Method ${req.method} not allowed`);
    return res.status(405).json({ error: 'Only GET and POST methods are allowed' });
  }

  try {
    const { url, method, headers, data, params } = req.body || {};
    
    if (!url) {
      console.log('[CORS PROXY] Missing URL parameter');
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`[CORS PROXY] Proxying request to: ${method || 'GET'} ${url}`);
    console.log('[CORS PROXY] Request data:', { method, headers, dataSize: data ? 'present' : 'none' });
    
    // Make the actual request
    const response = await axios({
      url,
      method: method || 'GET',
      headers: headers || {},
      data: data || null,
      params: params || null,
      // Important: This disables certificate validation when connecting to HTTPS sites
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
    
    console.log(`[CORS PROXY] Target response status: ${response.status}`);
    
    // Send back the response
    res.status(response.status).json({
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
  } catch (error) {
    console.error('[CORS PROXY] Error:', error.message);
    if (error.response) {
      console.error('[CORS PROXY] Response error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Send error response with as much info as possible
    res.status(error.response?.status || 500).json({
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
};