import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkColumns() {
    console.log('Verifying columns in people and profiles...');

    // Checking people table by trying to fetch one row with avatar_url
    const { error: peopleError } = await supabase
        .from('people')
        .select('avatar_url')
        .limit(1);

    if (peopleError) {
        console.log('Column avatar_url missing in people table or error:', peopleError.message);
    } else {
        console.log('Column avatar_url exists in people table.');
    }

    // Checking profiles table
    const { error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .limit(1);

    if (profileError) {
        console.log('Column avatar_url missing in profiles table or error:', profileError.message);
    } else {
        console.log('Column avatar_url exists in profiles table.');
    }
}

checkColumns().catch(err => console.error('Execution error:', err));
