

'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

interface WasabiCredentials {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}

async function getWasabiCredentials(): Promise<WasabiCredentials> {
    const { apiKeys } = await getAdminSettings();
    const wasabiEndpoint = apiKeys['wasabiEndpoint'];
    const wasabiRegion = apiKeys['wasabiRegion'];
    const wasabiAccessKey = apiKeys['wasabiAccessKey'];
    const wasabiSecretKey = apiKeys['wasabiSecretKey'];
    const wasabiBucket = apiKeys['wasabiBucket'];

    if (!wasabiEndpoint || !wasabiRegion || !wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
        throw new Error('Wasabi storage is not configured.');
    }

    return {
        endpoint: `https://${wasabiEndpoint}`,
        region: wasabiRegion,
        accessKeyId: wasabiAccessKey,
        secretAccessKey: wasabiSecretKey,
        bucket: wasabiBucket,
    };
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const { filename, contentType } = await request.json();
        
        if (!filename || !contentType) {
            return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
        }

        const creds = await getWasabiCredentials();
        const s3Client = new S3Client({
            endpoint: creds.endpoint,
            region: creds.region,
            credentials: {
                accessKeyId: creds.accessKeyId,
                secretAccessKey: creds.secretAccessKey,
            },
        });

        const fileExtension = filename.split('.').pop();
        const key = `uploads/${randomUUID()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: creds.bucket,
            Key: key,
            ContentType: contentType,
            ACL: 'public-read',
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        const { apiKeys } = await getAdminSettings();
        const cdnUrl = apiKeys['bunnyCdnUrl'];
        let publicUrl;
         if (cdnUrl) {
            const finalCdnUrl = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
            publicUrl = `${finalCdnUrl}${key}`;
        } else {
            publicUrl = `${creds.endpoint}/${creds.bucket}/${key}`;
        }

        return NextResponse.json({ success: true, uploadUrl: presignedUrl, publicUrl: publicUrl });

    } catch (error) {
        console.error('Error creating presigned URL:', error);
        return NextResponse.json({ error: 'Failed to create presigned URL' }, { status: 500 });
    }
}
