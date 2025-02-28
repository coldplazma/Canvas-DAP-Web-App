// Simple CORS proxy for Canvas DAP API
const axios = require('axios');

module.exports = async (req, res) => {
  // Log request for debugging
  console.log(`Proxy received ${req.method} request`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST for proxy requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get request data
    const { url, method, headers = {}, data = null, params = null } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Detailed logging for debugging
    console.log('==== REQUEST DETAILS ====');
    console.log(`URL: ${url}`);
    console.log(`Method: ${method || 'GET'}`);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Data:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log('Params:', params ? JSON.stringify(params, null, 2) : 'none');
    console.log('========================');
    
    // Set correct Content-Type if it's a string and looks like form data
    let processedData = data;
    let processedHeaders = { ...headers };
    
    if (typeof data === 'string' && data.includes('=') && !data.startsWith('{')) {
      if (!processedHeaders['Content-Type']) {
        processedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
    
    // Determine if this is a binary file download request
    const isBinaryDownload = url.includes('.gz') || url.includes('.csv') || url.includes('.parquet');
    
    // Create the request configuration
    const requestConfig = {
      url,
      method: method || 'GET',
      headers: processedHeaders,
      params: params,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500; // Accept all responses with status < 500
      },
      // For binary data downloads
      responseType: isBinaryDownload ? 'arraybuffer' : 'json'
    };
    
    // Handle data for different content types
    if (processedData !== null) {
      // If content type is application/json, ensure data is sent as plain JSON
      if (processedHeaders['Content-Type'] === 'application/json') {
        // If it's already a string, check if it's valid JSON
        if (typeof processedData === 'string') {
          try {
            // Try to parse it to confirm it's valid JSON
            JSON.parse(processedData);
            requestConfig.data = processedData;
          } catch (e) {
            // If parsing fails, assume it's not JSON and stringify the object
            console.log('Warning: Invalid JSON string, converting to string');
            requestConfig.data = JSON.stringify(processedData);
          }
        } else {
          // For objects, stringify them
          console.log('Converting object to JSON string for API request');
          requestConfig.data = JSON.stringify(processedData);
        }
      } else {
        // For other content types, send as is
        requestConfig.data = processedData;
      }
    }
    
    console.log('Final request config data:', typeof requestConfig.data === 'string' ? 
      requestConfig.data.substring(0, 200) + (requestConfig.data.length > 200 ? '...' : '') : 
      requestConfig.data);
    
    console.log('Sending request to Canvas API...');
    const response = await axios(requestConfig);
    
    console.log(`Canvas API response status: ${response.status}`);
    console.log('Canvas API response headers:', JSON.stringify(response.headers, null, 2));
    
    // Check if we received binary data (e.g., CSV, gzip)
    const isBinaryResponse = 
      response.headers['content-type']?.includes('application/octet-stream') ||
      response.headers['content-type']?.includes('application/gzip') ||
      isBinaryDownload ||
      (response.data instanceof Buffer || response.data instanceof ArrayBuffer);
    
    if (isBinaryResponse) {
      console.log('Received binary data response, returning as ArrayBuffer');
      
      // For binary responses, convert Buffer to array of bytes
      const buffer = Buffer.from(response.data);
      
      // Return binary data as array of bytes for proper handling in client
      return res.status(200).json({
        data: [...new Uint8Array(buffer)], // Convert to array of numbers
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        isBinary: true
      });
    } else {
      // For normal JSON responses
      console.log('Canvas API response data:', typeof response.data === 'object' ? 
        JSON.stringify(response.data, null, 2) : 'data is not an object');
      
      // Return the JSON response
      return res.status(200).json({
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      console.error('Error response details:');
      console.error(`Status: ${error.response.status}`);
      console.error(`Status text: ${error.response.statusText}`);
      console.error('Response data:', 
        typeof error.response.data === 'object' ? 
        JSON.stringify(error.response.data, null, 2) : 
        'binary data');
      console.error('Response headers:', error.response.headers);
    }
    
    if (error.request) {
      console.error('Request details (failed):');
      console.error('URL:', error.request._currentUrl);
      console.error('Method:', error.request.method);
    }
    
    return res.status(500).json({
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
};