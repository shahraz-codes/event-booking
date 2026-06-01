/**
 * Expo inlines `EXPO_PUBLIC_*` vars at build time. Declare the env shape
 * here so we can read them via `process.env.<NAME>` without pulling in
 * `@types/node` (which would brick the React Native runtime types).
 */
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
    EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
    [key: string]: string | undefined;
  };
};

declare module "*.css";
