import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
    const userId = 'fdc3f6ef-9a81-4a90-bfe6-afe42ddfec8d';
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Profile Data Result:', data ? JSON.stringify(data, null, 2) : 'No profile found');
    }
}

test();
