import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkPersonId() {
    console.log('Verifying person_id in profiles...');

    const { error } = await supabase
        .from('profiles')
        .select('person_id')
        .limit(1);

    if (error) {
        console.log('Column person_id missing in profiles table or error:', error.message);
    } else {
        console.log('Column person_id exists in profiles table.');
    }
}

checkPersonId().catch(err => console.error('Execution error:', err));
