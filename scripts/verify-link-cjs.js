const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    const userId = 'fdc3f6ef-9a81-4a90-bfe6-afe42ddfec8d';

    console.log('Checking user ID:', userId);

    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (pError) {
        console.error('Profile DB Error:', pError);
    } else {
        console.log('Profile DB Result:', JSON.stringify(profile, null, 2));
    }

    if (profile && profile.person_id) {
        const { data: person, error: peError } = await supabase
            .from('people')
            .select('id, full_name')
            .eq('id', profile.person_id)
            .maybeSingle();

        if (peError) {
            console.error('Person DB Error:', peError);
        } else {
            console.log('Linked Person DB Result:', JSON.stringify(person, null, 2));
        }
    } else {
        console.log('Field "person_id" is null or missing in "profiles" record.');
    }
}

check().catch(err => console.error('Execution error:', err));
