import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceKey)

async function check() {
    const userId = 'fdc3f6ef-9a81-4a90-bfe6-afe42ddfec8d'

    // 1. Check profiles table structure and data for this user
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

    if (pError) console.error('Profile Error:', pError)
    else console.log('Profile record:', JSON.stringify(profile, null, 2))

    // 2. Check if the value in person_id exists in people table
    if (profile?.person_id) {
        const { data: person, error: peError } = await supabase
            .from('people')
            .select('id, full_name')
            .eq('id', profile.person_id)
            .maybeSingle()

        if (peError) console.error('Person Error:', peError)
        else console.log('Linked Person record:', JSON.stringify(person, null, 2))
    } else {
        console.log('No person_id found in profile record.')
    }
}

check()
