
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const DRIVE_FOLDER_ID = '1F3jbt9zRCD30dWUANru_ueAYMikqvT5U';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check if folder already exists in galleries
    const { data: existing } = await supabase
        .from('galleries')
        .select('id, title')
        .eq('drive_folder_id', DRIVE_FOLDER_ID)
        .maybeSingle();

    if (existing) {
        console.log(`Album already exists: ${existing.title} (ID: ${existing.id})`);
        return;
    }

    // 2. Create the album
    // We'll use "XP26 Alagoas" as the title and "evento" as the type.
    // The date is set to 2026-02-14 (start of the event weekend).
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
