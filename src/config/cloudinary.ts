import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadToCloudinary = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "snapclash" }, (error, result) => {
      if (error || !result) return reject(error);
      resolve(result.secure_url);
    });
    Readable.from(buffer).pipe(stream);
  });
};

export const blurUrl = (url: string): string =>
  url.replace("/upload/", "/upload/e_blur:2000,e_pixelate:200/");

export const deleteFromCloudinary = (url: string): Promise<void> => {
  const parts = url.split("/upload/");
  if (parts.length < 2) return Promise.resolve();
  const publicId = parts[1].replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
  return cloudinary.uploader.destroy(publicId).then(() => undefined);
};
