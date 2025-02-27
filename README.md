# Canvas DAP Web App

A web-based client for the Canvas Learning Management System's Data Access Platform (DAP) API. This application allows you to query and download data from the Canvas DAP API directly from your browser.

## Features

- Query Canvas DAP API tables
- Support for both Snapshot and Incremental queries
- Multiple export formats (JSONL, CSV, TSV, Parquet)
- Direct file downloads using the File System Access API
- Entirely client-side (browser-based application)

## Usage

1. Visit the deployed web app URL
2. Enter your Canvas DAP API credentials (Client ID and Client Secret)
3. Select a namespace and table
4. Choose a query type (Snapshot or Incremental)
5. Select your preferred file format
6. Click "Start Query" to begin
7. Save the downloaded files to your computer

## Browser Compatibility

This application uses the File System Access API which is currently supported in:
- Chrome 86+
- Edge 86+
- Opera 72+

It is not supported in Firefox or Safari.

## Technical Details

- **Front-end**: HTML, JavaScript, Bootstrap CSS
- **API Communication**: JavaScript client with CORS proxy
- **Proxy Backend**: Node.js serverless function deployed on Vercel
- **Data Processing**: Client-side JavaScript

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

## Deployment

This project is set up for easy deployment to Vercel:

1. Fork/clone this repository
2. Connect your GitHub repo to Vercel
3. Deploy with a single click

## License

MIT