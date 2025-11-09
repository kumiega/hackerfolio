import { createClientSSR } from "@/db/supabase.client";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        }),
        { status: 401 }
      );
    }

    const userId = locals.user.user_id;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return new Response(
        JSON.stringify({
          error: { code: "BAD_REQUEST", message: "No avatar file provided" },
        }),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({
          error: { code: "BAD_REQUEST", message: "File must be an image" },
        }),
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error: { code: "BAD_REQUEST", message: "File size must be less than 5MB" },
        }),
        { status: 400 }
      );
    }

    const supabase = createClientSSR({ request, cookies: locals.cookies });

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({
          error: { code: "UPLOAD_FAILED", message: "Failed to upload avatar" },
        }),
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Get current portfolio data
    const { data: portfolio, error: fetchError } = await supabase
      .from("portfolios")
      .select("draft_data")
      .eq("user_id", userId)
      .single();

    if (fetchError || !portfolio) {
      console.error("Portfolio fetch error:", fetchError);
      await supabase.storage.from("avatars").remove([fileName]);
      return new Response(
        JSON.stringify({
          error: { code: "NOT_FOUND", message: "Portfolio not found" },
        }),
        { status: 404 }
      );
    }

    // Update the avatar URL in the bio data
    const draftData = portfolio.draft_data as any;
    const updatedBio = {
      ...draftData.bio,
      avatar_url: avatarUrl,
    };

    // Update portfolio with new bio data
    const { error: updateError } = await supabase
      .from("portfolios")
      .update({
        draft_data: {
          ...draftData,
          bio: updatedBio,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Database update error:", updateError);
      // Try to clean up uploaded file
      await supabase.storage.from("avatars").remove([fileName]);
      return new Response(
        JSON.stringify({
          error: { code: "UPDATE_FAILED", message: "Failed to update portfolio" },
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          avatar_url: avatarUrl,
          message: "Avatar uploaded successfully",
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Avatar upload error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      }),
      { status: 500 }
    );
  }
};
