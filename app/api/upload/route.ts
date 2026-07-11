// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with your environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // Parse the incoming request body
    const { file } = await req.json(); // file is a base64 string

    console.log("📤 Starting Cloudinary upload...");
    console.log("File string length:", file?.length);

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: "findit-items", // optional: keeps uploads organized
    });

    console.log("✅ Upload response:", uploadResponse);

    // Return the secure URL
    return NextResponse.json({ url: uploadResponse.secure_url });
  } catch (err) {
    console.error("❌ Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
