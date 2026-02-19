import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function test() {
    const userId = 'fdc3f6ef-9a81-4a90-bfe6-afe42ddfec8d'
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Profile Data:', JSON.stringify(data, null, 2))
    }
}

test()
