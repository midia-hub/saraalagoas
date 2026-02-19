import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function ensureBucket() {
    console.log('Checking storage buckets...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const avatarBucket = buckets.find(b => b.id === 'avatars');

    if (!avatarBucket) {
        console.log('Bucket "avatars" not found. Creating it...');
        const { data, error } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 1048576, // 1MB
            allowedMimeTypes: ['image/*']
        });

        if (error) {
            console.error('Error creating bucket:', error);
        } else {
            console.log('Bucket "avatars" created successfully.');
        }
    } else {
        console.log('Bucket "avatars" already exists.');
    }
}

ensureBucket().catch(err => console.error('Execution error:', err));
