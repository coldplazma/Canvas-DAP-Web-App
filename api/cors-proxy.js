const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  // Use the requesting origin instead of '*'
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { url, method, headers, data, params } = req.body;
    
    console.log(`Proxying request to: ${method} ${url}`);
    
    // Make the actual request
    const response = await axios({
      url,
      method: method || 'GET',
      headers: headers || {},
      data: data || null,
      params: params || null,
      // Important: This disables certificate validation when connecting to HTTPS sites
      // For production, you might want to handle certificates properly
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
    
    // Send back the response
    res.status(response.status).json({
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Send error response with as much info as possible
    res.status(error.response?.status || 500).json({
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
};