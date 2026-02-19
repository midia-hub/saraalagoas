
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length) {
            process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });
}

loadEnv();

const DRIVE_FOLDER_ID = '1F3jbt9zRCD30dWUANru_ueAYMikqvT5U';

async function main() {
    // Try to load credentials
    const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!jsonEnv) {
        console.error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
        return;
    }

    const credentials = JSON.parse(jsonEnv);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    console.log('Listing files in folder:', DRIVE_FOLDER_ID);
    const res = await drive.files.list({
        q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
    });

    console.log('Files found:', res.data.files?.length || 0);
    res.data.files?.slice(0, 10).forEach(f => {
        console.log(`- ${f.name} (${f.mimeType})`);
    });
}

main().catch(console.error);
