# EPUB Ingester

Little application that processes EPUB files and ingests them into Firebase Firestore for later purposes.

## Purpose

- Extracts text content from EPUBs
- Splits text into sentences using regex patterns
- Groups sentences into reasonably-sized passages (120-520 chars)

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/blakefrederick/epub-ingester
   cd epub-ingester
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Go to Project Settings → Service Accounts
   - Generate a new private key (downloads a JSON file)

4. **Set up your env vars**

   Edit `.env` and fill in your Firebase service account details from the downloaded JSON file.

5. **Add EPUB files**
   Place your EPUB files in the `./epubs/` directory.

6. **Run the ingester**
   ```bash
   node ingest.js
   ```
