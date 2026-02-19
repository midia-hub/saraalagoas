
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables in .env');
    process.exit(1);
}

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Checking if album exists...');

    const { data: existing, error: checkError } = await supabase
        .from('galleries')
        .select('id, title')
        .eq('drive_folder_id', DRIVE_FOLDER_ID)
        .maybeSingle();

    if (checkError) {
        console.error('Error checking existing album:', checkError.message);
        process.exit(1);
    }

    if (existing) {
        console.log(`Album already exists: ${existing.title} (ID: ${existing.id})`);
        return;
    }

    const albumData = {
        title: 'XP26 Alagoas',
        type: 'evento',
        slug: 'xp26-alagoas',
        date: '2026-02-14',
        description: 'Fotos oficiais do evento XP26 Alagoas.',
        drive_folder_id: DRIVE_FOLDER_ID,
    };

    const { data: created, error } = await supabase
        .from('galleries')
        .insert(albumData)
        .select('id')
        .single();

    if (error) {
        console.error('Error creating album:', error.message);
        process.exit(1);
    }

    console.log(`Album created successfully! ID: ${created.id}`);
}

main().catch(console.error);
