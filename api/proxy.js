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
    
    // For debugging DAP job status
    if (url.includes('/dap/job/')) {
      console.log('DAP JOB STATUS REQUEST: ' + url);
    }
    
    if (typeof data === 'string' && data.includes('=') && !data.startsWith('{')) {
      if (!processedHeaders['Content-Type']) {
        processedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
    
    // Determine if this is a binary file download request (improved detection)
    const fileExtensions = ['.gz', '.csv', '.parquet', '.zip', '.json', '.jsonl', '.tsv', '.txt'];
    const isBinaryDownload = fileExtensions.some(ext => url.includes(ext)) || 
                             url.includes('/dap/object/url') || 
                             url.includes('/dap/object/');
    
    // Check if this is a direct S3 download request (likely large file)
    const isS3FileDownload = url.includes('amazonaws.com') && 
                            (url.includes('X-Amz-Algorithm') || url.includes('X-Amz-Signature')) &&
                            fileExtensions.some(ext => url.includes(ext));
    
    // For S3 direct downloads, we'll return a redirect instead of proxying the file
    if (isS3FileDownload) {
      console.log('Detected S3 download URL, returning redirect instead of proxying');
      return res.status(200).json({
        redirect: url,
        status: 302,
        statusText: 'Redirect to S3',
        headers: {
          'Location': url
        }
      });
    }
    
    // Create the request configuration with increased timeout (5 minutes)
    const requestConfig = {
      url,
      method: method || 'GET',
      headers: processedHeaders,
      params: params,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      maxRedirects: 5,
      // Set a timeout of 5 minutes (300000ms)
      timeout: 300000,
      validateStatus: function (status) {
        return status < 500; // Accept all responses with status < 500
      },
      // For binary data downloads
      responseType: isBinaryDownload ? 'arraybuffer' : 'json',
      // Enable to handle larger responses
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024 // 100MB
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
    
    // Log job status responses for debugging
    if (url.includes('/dap/job/')) {
      console.log('DAP JOB STATUS RESPONSE:', 
        typeof response.data === 'object' ? 
        JSON.stringify(response.data, null, 2) : 'data is not an object');
    }
    
    // Check content type specifically for JSON first
    const isJsonResponse = 
      response.headers['content-type']?.includes('application/json') ||
      (typeof response.data === 'object' && !Buffer.isBuffer(response.data));
      
    // Improved binary response detection
    const isBinaryResponse = 
      response.headers['content-type']?.includes('application/octet-stream') ||
      response.headers['content-type']?.includes('application/gzip') ||
      response.headers['content-type']?.includes('application/zip') ||
      response.headers['content-type']?.includes('application/x-gzip') ||
      response.headers['content-type']?.includes('application/parquet') ||
      isBinaryDownload ||
      (response.data instanceof Buffer || response.data instanceof ArrayBuffer);
    
    // Process JSON first - important for object URLs API which returns JSON but might be detected as binary
    if (isJsonResponse && !isBinaryResponse) {
      console.log('Processing as JSON response');
      
      // Ensure we have valid JSON
      let jsonData = response.data;
      
      // Handle case where JSON is in a Buffer
      if (Buffer.isBuffer(response.data)) {
        try {
          const jsonString = response.data.toString('utf8');
          jsonData = JSON.parse(jsonString);
          console.log('Successfully converted Buffer to JSON');
        } catch (jsonError) {
          console.error('Failed to convert Buffer to JSON:', jsonError);
        }
      }
      
      console.log('Canvas API response data:', typeof jsonData === 'object' ? 
        JSON.stringify(jsonData, null, 2) : 'data is not an object');
      
      // Return the JSON response
      return res.status(200).json({
        data: jsonData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } 
    // Process binary data
    else if (isBinaryResponse) {
      console.log('Received binary data response, returning as ArrayBuffer');
      
      try {
        // For binary responses, convert to array of bytes
        let buffer;
        if (Buffer.isBuffer(response.data)) {
          buffer = response.data;
        } else if (response.data instanceof ArrayBuffer) {
          buffer = Buffer.from(response.data);
        } else if (typeof response.data === 'string') {
          buffer = Buffer.from(response.data, 'utf8');
        } else if (Array.isArray(response.data)) {
          buffer = Buffer.from(response.data);
        } else {
          buffer = Buffer.from(response.data);
        }
        
        // Special handling for URLs API - check if this looks like a JSON response
        if (url.includes('/dap/object/url')) {
          try {
            // Try to parse as JSON first
            const textContent = buffer.toString('utf8');
            if (textContent.startsWith('{') && textContent.includes('"urls"')) {
              console.log('URL response appears to be JSON, processing as JSON');
              const jsonData = JSON.parse(textContent);
              return res.status(200).json({
                data: jsonData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
          } catch (jsonParseError) {
            console.log('Failed to parse URL response as JSON, continuing with binary handling');
          }
        }
        
        // Check if the response is too large for JSON
        const responseSize = buffer.length;
        console.log(`Binary response size: ${responseSize} bytes`);
        
        if (responseSize > 50 * 1024 * 1024) { // 50MB limit for JSON response
          console.log('Warning: Binary response is very large, may exceed Vercel limits');
        }
        
        // Return binary data as array of bytes for proper handling in client
        return res.status(200).json({
          data: [...new Uint8Array(buffer)], // Convert to array of numbers
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          isBinary: true
        });
      } catch (binaryError) {
        console.error('Error processing binary data:', binaryError);
        return res.status(500).json({
          error: 'Failed to process binary response: ' + binaryError.message,
          status: response.status,
          statusText: response.statusText
        });
      }
    } else {
      // For all other responses
      console.log('Canvas API response has unrecognized format, processing as text');
      
      try {
        // Try to handle as string first
        if (Buffer.isBuffer(response.data)) {
          const textData = response.data.toString('utf8');
          return res.status(200).json({
            data: textData,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } else {
          // Return as-is
          return res.status(200).json({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (textError) {
        console.error('Error processing response as text:', textError);
        // Last resort - return raw data
        return res.status(200).json({
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Handle axios timeout errors specifically
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out after 5 minutes');
      return res.status(504).json({
        error: 'Request timed out after 5 minutes. The Canvas DAP API is taking too long to respond.',
        code: 'TIMEOUT'
      });
    }
    
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