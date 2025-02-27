/**
 * Canvas DAP (Data Access Platform) API Client
 * 
 * This module provides a JavaScript client for the Canvas Data Access Platform (DAP) API.
 * It allows for authentication, querying table data, and downloading result files.
 */

class DAPClient {
  /**
   * Initialize the DAP client
   * 
   * @param {string} baseUrl - Base URL for the DAP API
   * @param {string} clientId - OAuth2 client ID
   * @param {string} clientSecret - OAuth2 client secret
   * @param {string} proxyUrl - URL for the CORS proxy (optional)
   */
  constructor(baseUrl = "https://api-gateway.instructure.com", clientId = null, clientSecret = null, proxyUrl = "http://localhost:3000/proxy") {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.proxyUrl = proxyUrl;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Make a request through the proxy
   * 
   * @param {string} url - The target URL
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} headers - HTTP headers
   * @param {Object|string} data - Request body data
   * @param {Object} params - URL query parameters
   * @returns {Promise<Object>} - Response data
   */
  async makeProxyRequest(url, method = 'GET', headers = {}, data = null, params = null) {
    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          method,
          headers,
          data,
          params
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Proxy request error:", error);
      throw error;
    }
  }

  /**
   * Authenticate with the DAP API using OAuth2 client credentials flow
   * 
   * @returns {Promise<string>} - The access token
   * @throws {Error} - If authentication fails
   */
  async authenticate() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Client ID and Client Secret are required");
    }

    const authUrl = `${this.baseUrl}/oauth2/token`;
    
    // Create basic auth credentials
    const authStr = `${this.clientId}:${this.clientSecret}`;
    const authBase64 = btoa(authStr);
    
    try {
      // Use the proxy for authentication
      const response = await this.makeProxyRequest(
        authUrl, 
        'POST',
        {
          'Authorization': `Basic ${authBase64}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        'grant_type=client_credentials'
      );

      if (response.status !== 200) {
        throw new Error(`Authentication failed: ${response.status} - ${response.statusText}`);
      }

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      
      // Set token expiry based on expires_in (defaults to 1 hour)
      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error("Authentication error:", error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Ensure the client is authenticated, refreshing token if needed
   * 
   * @returns {Promise<string>} - The access token
   */
  async ensureAuthenticated() {
    // Check if token exists and is still valid
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      return await this.authenticate();
    }
    return this.accessToken;
  }

  /**
   * Get a list of available tables in the given namespace
   * 
   * @param {string} namespace - The namespace (default: "canvas")
   * @param {string|null} scope - The scope to access (optional)
   * @returns {Promise<Array<string>>} - List of table names
   * @throws {Error} - If the query fails
   */
  async getTables(namespace = "canvas", scope = null) {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/dap/query/${namespace}/table`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    const params = {};
    if (scope) {
      params.scope = scope;
    }
    
    try {
      const response = await this.makeProxyRequest(url, 'GET', headers, null, params);

      if (response.status !== 200) {
        throw new Error(`Failed to get tables: ${response.status} - ${response.statusText}`);
      }

      return response.data.tables || [];
    } catch (error) {
      console.error("Failed to get tables:", error);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  /**
   * Get the schema for a specific table
   * 
   * @param {string} namespace - The namespace
   * @param {string} table - The table name
   * @param {string|null} scope - The scope to access (optional)
   * @returns {Promise<Object>} - Table schema information
   * @throws {Error} - If the query fails
   */
  async getTableSchema(namespace, table, scope = null) {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/dap/query/${namespace}/table/${table}/schema`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    const params = {};
    if (scope) {
      params.scope = scope;
    }
    
    try {
      const response = await this.makeProxyRequest(url, 'GET', headers, null, params);

      if (response.status !== 200) {
        throw new Error(`Failed to get table schema: ${response.status} - ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get table schema:", error);
      throw new Error(`Failed to get table schema: ${error.message}`);
    }
  }

  /**
   * Start a query job for table data
   * 
   * @param {string} namespace - The namespace
   * @param {string} table - The table name
   * @param {Object} query - The query object
   * @param {string|null} scope - The scope to access (optional)
   * @returns {Promise<Object>} - Job information
   * @throws {Error} - If the query fails
   */
  async queryTableData(namespace, table, query, scope = null) {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/dap/query/${namespace}/table/${table}/data`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const params = {};
    if (scope) {
      params.scope = scope;
    }
    
    try {
      const response = await this.makeProxyRequest(url, 'POST', headers, query, params);

      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Failed to query table data: ${response.status} - ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error("Failed to query table data:", error);
      throw new Error(`Failed to query table data: ${error.message}`);
    }
  }

  /**
   * Check the status of a job
   * 
   * @param {string} jobId - The job ID
   * @returns {Promise<Object>} - Job status information
   * @throws {Error} - If the job check fails
   */
  async getJobStatus(jobId) {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/dap/job/${jobId}`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    try {
      const response = await this.makeProxyRequest(url, 'GET', headers);

      if (response.status === 404) {
        throw new Error(`Job not found or expired: ${jobId}`);
      }

      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Failed to get job status: ${response.status} - ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get job status:", error);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  /**
   * Wait for a job to complete, polling periodically
   * 
   * @param {string} jobId - The job ID
   * @param {number} timeout - Maximum time to wait in seconds
   * @param {number} pollInterval - Time between status checks in seconds
   * @returns {Promise<Object>} - The completed job information
   * @throws {Error} - If the job fails or times out
   */
  async waitForJobCompletion(jobId, timeout = 600, pollInterval = 2) {
    const startTime = new Date();
    const timeoutDelta = timeout * 1000; // convert to milliseconds
    
    while ((new Date() - startTime) < timeoutDelta) {
      const jobStatus = await this.getJobStatus(jobId);
      
      const status = jobStatus.status;
      
      if (status === "completed") {
        return jobStatus;
      } else if (status === "failed") {
        const errorInfo = jobStatus.error || "Unknown error";
        throw new Error(`Job failed: ${errorInfo}`);
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
    }
    
    throw new Error(`Job timed out after ${timeout} seconds`);
  }

  /**
   * Get download URLs for specified object IDs
   * 
   * @param {Array<string>} objectIds - List of object IDs
   * @returns {Promise<Object>} - Dictionary mapping object IDs to download URLs
   * @throws {Error} - If getting URLs fails
   */
  async getDownloadUrls(objectIds) {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/dap/object/url`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const requestData = objectIds.map(id => ({ id }));
    
    try {
      const response = await this.makeProxyRequest(url, 'POST', headers, requestData);

      if (response.status !== 200) {
        throw new Error(`Failed to get download URLs: ${response.status} - ${response.statusText}`);
      }

      return response.data.urls || {};
    } catch (error) {
      console.error("Failed to get download URLs:", error);
      throw new Error(`Failed to get download URLs: ${error.message}`);
    }
  }

  /**
   * Download a file from a URL
   * 
   * @param {string} url - The file URL
   * @returns {Promise<ArrayBuffer>} - The downloaded file content
   * @throws {Error} - If download fails
   */
  async downloadFile(url) {
    try {
      // For downloading files, we'll use the proxy as well
      const response = await this.makeProxyRequest(url, 'GET');

      if (response.status !== 200) {
        throw new Error(`Failed to download file: ${response.status} - ${response.statusText}`);
      }

      // Handle the data based on its type
      // If it's a base64 string, convert to ArrayBuffer
      if (typeof response.data === 'string') {
        const binaryString = atob(response.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      
      // If it's already an array, convert to ArrayBuffer
      if (Array.isArray(response.data)) {
        const bytes = new Uint8Array(response.data);
        return bytes.buffer;
      }
      
      // Return as is for other formats (JSON, etc.)
      return response.data;
    } catch (error) {
      console.error("Failed to download file:", error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Query table data and wait for the job to complete
   * 
   * @param {string} namespace - The namespace
   * @param {string} table - The table name
   * @param {Object} query - The query object
   * @param {string|null} scope - The scope to access (optional)
   * @returns {Promise<Object>} - Job information for the completed job
   * @throws {Error} - If the query fails or job fails
   */
  async getTableData(namespace, table, query, scope = null) {
    const jobInfo = await this.queryTableData(namespace, table, query, scope);
    const jobId = jobInfo.id;
    
    if (!jobId) {
      throw new Error("No job ID returned from query");
    }
    
    // If the job is already completed, return it
    if (jobInfo.status === "completed") {
      return jobInfo;
    }
    
    // Otherwise, wait for it to complete
    return await this.waitForJobCompletion(jobId);
  }

  /**
   * Query table data, wait for completion, and download the resulting files
   * 
   * @param {string} namespace - The namespace
   * @param {string} table - The table name
   * @param {Object} query - The query object
   * @param {string|null} scope - The scope to access (optional)
   * @returns {Promise<Object>} - Dictionary with file names and their content
   * @throws {Error} - If the query fails or download fails
   */
  async downloadTableData(namespace, table, query, scope = null) {
    const jobInfo = await this.getTableData(namespace, table, query, scope);
    
    // Get object IDs from the completed job
    const objectIds = (jobInfo.objects || []).map(obj => obj.id);
    
    if (objectIds.length === 0) {
      return { files: [] };
    }
    
    // Get download URLs for the objects
    const urlInfo = await this.getDownloadUrls(objectIds);
    
    // Download each file
    const files = [];
    for (const objId in urlInfo) {
      const info = urlInfo[objId];
      const url = info.url;
      const filename = info.filename || `${table}_${objId}`;
      
      if (url) {
        const content = await this.downloadFile(url);
        files.push({
          filename,
          content
        });
      }
    }
    
    return { files };
  }

  /**
   * Create a snapshot query object
   * 
   * @param {string} format - The output format (jsonl, csv, tsv, parquet)
   * @param {string|null} mode - Output mode (optional)
   * @returns {Object} - The snapshot query object
   */
  createSnapshotQuery(format, mode = null) {
    const query = {
      type: "snapshot",
      format: format
    };
    
    if (mode) {
      query.mode = mode;
    }
    
    return query;
  }

  /**
   * Create an incremental query object
   * 
   * @param {string} format - The output format (jsonl, csv, tsv, parquet)
   * @param {string|Date} since - Timestamp to get changes since
   * @param {string|Date|null} until - Upper timestamp bound (optional)
   * @param {string|null} mode - Output mode (optional)
   * @returns {Object} - The incremental query object
   */
  createIncrementalQuery(format, since, until = null, mode = null) {
    const query = {
      type: "incremental",
      format: format,
      since: since instanceof Date ? since.toISOString() : since
    };
    
    if (until) {
      query.until = until instanceof Date ? until.toISOString() : until;
    }
    
    if (mode) {
      query.mode = mode;
    }
    
    return query;
  }
}

// Export the client for use in other scripts
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { DAPClient };
} else {
  window.DAPClient = DAPClient;
}