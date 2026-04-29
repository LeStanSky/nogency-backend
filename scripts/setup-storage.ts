/**
 * Setup Supabase Storage Buckets
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { supabaseAdmin } from '../src/db/client.js';

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  try {
    // 1. Create 'documents' bucket (public for easier access via service role)
    console.log('Creating "documents" bucket...');
    const { error: documentsError } = await supabaseAdmin.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    });

    if (documentsError) {
      if (documentsError.message.includes('already exists')) {
        console.log('✅ "documents" bucket already exists');
      } else {
        console.error('❌ Error creating documents bucket:', documentsError);
      }
    } else {
      console.log('✅ "documents" bucket created successfully');
    }

    // 2. Create 'property-photos' bucket (public)
    console.log('\nCreating "property-photos" bucket...');
    const { error: photosError } = await supabaseAdmin.storage.createBucket('property-photos', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (photosError) {
      if (photosError.message.includes('already exists')) {
        console.log('✅ "property-photos" bucket already exists');
      } else {
        console.error('❌ Error creating property-photos bucket:', photosError);
      }
    } else {
      console.log('✅ "property-photos" bucket created successfully');
    }

    // 3. List all buckets to verify
    console.log('\n📋 Listing all buckets:');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
    } else {
      console.log('\nAvailable buckets:');
      buckets?.forEach((bucket) => {
        console.log(`  - ${bucket.name} (public: ${bucket.public})`);
      });
    }

    console.log('\n✅ Storage setup completed successfully!');
    console.log('\n📝 Note: RLS policies should be configured in Supabase Dashboard if needed.');
    console.log('   See scripts/setup-storage.sql for SQL policy examples.');
  } catch (error) {
    console.error('❌ Failed to setup storage:', error);
    process.exit(1);
  }
}

// Run setup
setupStorageBuckets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
