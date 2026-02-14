import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export default cloudinary;

/**
 * Upload an audio buffer to Cloudinary
 */
export async function uploadAudio(buffer: Buffer, publicId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
                public_id: publicId,
                folder: "skunkstudio/audio",
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
}
