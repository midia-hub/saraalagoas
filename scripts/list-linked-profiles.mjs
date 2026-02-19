import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkProfiles() {
    console.log('Fetching profiles with person_id...');

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, person_id, role')
        .not('person_id', 'is', null);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Profiles with person_id:', JSON.stringify(data, null, 2));
    }
}

checkProfiles().catch(err => console.error('Execution error:', err));
