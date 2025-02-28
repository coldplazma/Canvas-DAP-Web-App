[# Link to Live APP](https://canvas-dap-web-app.vercel.app/dap-query-web-app-js.html)

# Canvas DAP Web App

A web-based client for the Canvas Learning Management System's Data Access Platform (DAP) API. This application allows you to query and download data from the Canvas DAP API directly from your browser.

## Features

- Query Canvas DAP API tables with both Snapshot and Incremental queries
- Support for all Canvas DAP namespaces (canvas, canvaslogs, catalog)
- Multiple export formats (JSONL, CSV, TSV, Parquet)
- Robust binary file handling (including compressed files)
- Direct file downloads using the File System Access API
- Table browsing with dynamic updates
- Transparent error handling with clear user feedback
- Responsive UI with loading indicators
- Entirely client-side for maximum security

## Usage

1. Visit the deployed web app URL
2. Enter your Canvas DAP API credentials (Client ID and Client Secret)
3. Click "Fetch Tables" to populate the available tables
4. Select a table from the dropdown
5. Choose a query type (Snapshot or Incremental)
6. If using Incremental, select a since timestamp
7. Select your preferred file format
8. Click "Run Query" to begin
9. Confirm each file download when prompted
10. Save the downloaded files to your computer

## Technology Stack

### Frontend
- **HTML5/CSS3** - Semantic markup with responsive layout
- **JavaScript (ES6+)** - Modern JavaScript with async/await patterns
- **Bootstrap 5** - For UI components and responsive grid
- **File System Access API** - For secure file saving

### Backend
- **Node.js** - Server environment for the proxy
- **Vercel Serverless Functions** - For hosting the CORS proxy
- **Axios** - For making HTTP requests from the proxy

### API & Data Handling
- **Canvas DAP API Client** - Custom JavaScript client for the Canvas Data API
- **OAuth2 Authentication** - Using client credentials flow
- **CORS Proxy** - For secure cross-origin requests
- **Binary Data Processing** - Special handling for compressed files
- **ArrayBuffer & Uint8Array** - For processing binary data

### Security
- **Server-side Proxy** - Prevents exposing credentials in browser requests
- **Client-side Processing** - All data stays in the browser
- **No Data Storage** - Nothing is stored on servers
- **HTTPS Only** - All communications are encrypted

## Browser Compatibility

This application uses the File System Access API which is currently supported in:
- Chrome 86+
- Edge 86+
- Opera 72+

It is not supported in Firefox or Safari.

## Technical Implementation Details

### Authentication Flow
1. Client collects credentials from the user
2. Credentials are sent to the proxy service via secure HTTPS
3. Proxy makes OAuth request to Canvas IDS service
4. Access token is returned to client and stored in memory (never persisted)

### Query Process
1. User selects table and query parameters
2. Client creates appropriate query object (snapshot or incremental)
3. Query is sent to Canvas DAP API via proxy
4. Job ID is returned and client polls for job completion
5. When job completes, client requests download URLs
6. Files are downloaded via proxy to preserve binary data integrity
7. User is prompted to save each file

### Binary File Handling
- Automatic detection of compressed files (.gz) and binary formats
- Custom proxy configuration to request binary data as ArrayBuffer
- Special client-side processing for correct data handling
- File type-specific MIME type assignment
- Special handling in File System Access API

## Privacy & Security

- Your credentials are never sent to any third-party server
- All API requests are proxied through a secure serverless function
- No data is stored on any server - everything stays in your browser
- Downloaded data is saved directly to your computer

## Development

To run this project locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open the provided local URL in your browser

### Project Structure
- `/` - Root contains main HTML and JavaScript files
- `/api` - Contains the proxy serverless function
- `/css` - Contains any custom CSS

## Deployment on Vercel

### Why Vercel?

This project is specifically designed to be deployed on Vercel for several critical reasons:

1. **SSL/CORS Issue Resolution**: The Canvas DAP API requires HTTPS connections and has CORS restrictions. When running locally or on traditional hosting, browsers block cross-origin requests to the Canvas API. Vercel solves this by providing:
   - Automatic SSL certificates for secure HTTPS connections
   - Serverless functions that act as a CORS proxy

2. **Node.js Serverless Proxy**: The application uses a Node.js serverless function (`/api/proxy.js`) that:
   - Runs server-side code without maintaining a traditional server
   - Handles the sensitive API requests including authentication
   - Properly manages binary data transfers
   - Shields client credentials from browser exposure

3. **Serverless Architecture Benefits**:
   - Zero infrastructure management
   - Automatic scaling based on usage
   - Pay-only-for-what-you-use cost structure
   - Global CDN deployment for low latency
   - CI/CD integration with GitHub for easy updates

### What is Node.js?

Node.js is a JavaScript runtime that allows JavaScript to run on a server rather than just in a browser. In this application, we use Node.js to:
- Process HTTP requests server-side
- Handle authentication securely
- Manage binary data correctly
- Route API requests to Canvas DAP

### How to Deploy to Vercel

Deploying this application to Vercel is remarkably simple:

1. **Fork or Clone the Repository**
   - Create your own copy of this repository on GitHub

2. **Sign Up for Vercel**
   - Go to [Vercel](https://vercel.com/) and sign up for a free account
   - Connect your GitHub account to Vercel

3. **Import Your Repository**
   - From the Vercel dashboard, click "Add New..."
   - Select "Project"
   - Choose the repository you forked/cloned

4. **Configure the Project** (usually no changes needed)
   - Framework Preset: Other
   - Build Command: Leave default
   - Output Directory: Leave default

5. **Deploy**
   - Click "Deploy"
   - Vercel will automatically detect the Node.js API folder and deploy it as serverless functions

6. **Access Your Application**
   - Once deployment is complete, Vercel will provide you with a URL
   - Your application is now live and ready to use

### Custom Domains (Optional)

If you want to use your own domain:
1. Go to your project settings in Vercel
2. Navigate to the "Domains" section
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS records

## License

MIT

## Credits

Developed with [Claude](https://anthropic.com/claude) assistance.
