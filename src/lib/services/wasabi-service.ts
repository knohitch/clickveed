

'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { randomUUID } from 'crypto';

interface WasabiCredentials {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    cdnUrl: string | null;
}

async function getWasabiCredentials(): Promise<WasabiCredentials> {
    const { apiKeys } = await getAdminSettings();
    const wasabiEndpoint = apiKeys['wasabiEndpoint'];
    const wasabiRegion = apiKeys['wasabiRegion'];
    const wasabiAccessKey = apiKeys['wasabiAccessKey'];
    const wasabiSecretKey = apiKeys['wasabiSecretKey'];
    const wasabiBucket = apiKeys['wasabiBucket'];
    const bunnyCdnUrl = apiKeys['bunnyCdnUrl'];

    if (!wasabiEndpoint || !wasabiRegion || !wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
        throw new Error('Wasabi storage is not configured. Please set the required API keys in the admin settings.');
    }

    return {
        endpoint: `https://${wasabiEndpoint}`, // Ensure endpoint starts with https://
        region: wasabiRegion,
        accessKeyId: wasabiAccessKey,
        secretAccessKey: wasabiSecretKey,
        bucket: wasabiBucket,
        cdnUrl: bunnyCdnUrl || null,
    };
}

function dataUriToBuffer(dataUri: string): { buffer: Buffer, contentType: string, extension: string } {
    const base64 = dataUri.split(',')[1];
    if (!base64) {
        throw new Error('Invalid Data URI');
    }
    const mimeType = dataUri.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
    const extension = mimeType.split('/')[1] ?? 'bin';
    const buffer = Buffer.from(base64, 'base64');
    return { buffer, contentType: mimeType, extension };
}

/**
 * Uploads a file from a data URI to Wasabi and returns the public CDN URL and file size.
 * @param dataUri The data URI of the file to upload.
 * @param folder The folder within the bucket to upload the file to.
 * @returns An object containing the public URL and the size in MB.
 */
export async function uploadToWasabi(dataUri: string, folder: 'images' | 'videos' | 'audio'): Promise<{ publicUrl: string, sizeMB: number }> {
    const creds = await getWasabiCredentials();
    const { buffer, contentType, extension } = dataUriToBuffer(dataUri);
    const sizeMB = buffer.length / (1024 * 1024);

    const s3Client = new S3Client({
        endpoint: creds.endpoint,
        region: creds.region,
        credentials: {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
        },
    });

    const filename = `${folder}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
        Bucket: creds.bucket,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read', // Required for Bunny.net to pull the file
    });

    try {
        await s3Client.send(command);
        console.log(`Successfully uploaded ${filename} to Wasabi.`);
        
        let publicUrl;
        if (creds.cdnUrl) {
            const cdnUrl = creds.cdnUrl.endsWith('/') ? creds.cdnUrl : `${creds.cdnUrl}/`;
            publicUrl = `${cdnUrl}${filename}`;
        } else {
            // Fallback to direct Wasabi URL if CDN is not configured
            publicUrl = `${creds.endpoint}/${creds.bucket}/${filename}`;
        }

        return { publicUrl, sizeMB };
    } catch (error) {
        console.error("Error uploading to Wasabi:", error);
        throw new Error("Failed to upload media to storage.");
    }
}
