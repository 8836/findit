import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/;

// Configure Cloudinary once on the server.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { file?: unknown } | null;
    const file = typeof body?.file === "string" ? body.file : "";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const match = file.match(DATA_URL_RE);
    if (!match) {
      return NextResponse.json(
        { error: "Please upload a valid PNG, JPG, WEBP, or GIF image as a data URL." },
        { status: 400 }
      );
    }

    const base64 = match[2];
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const sizeBytes = Math.floor((base64.length * 3) / 4) - padding;

    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: "findit-items",
      resource_type: "image",
      overwrite: true,
    });

    return NextResponse.json({ url: uploadResponse.secure_url });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }
}
