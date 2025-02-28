[Link to the live app in Vercel](https://canvas-dap-web-app.vercel.app/dap-query-web-app-js.html)

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

## Deployment

This project is set up for easy deployment to Vercel:

1. Fork/clone this repository
2. Connect your GitHub repo to Vercel
3. Deploy with a single click

## License

MIT

## Credits

Developed with [Claude](https://anthropic.com/claude) assistance.
