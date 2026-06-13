/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // firebase-admin is server-only; keep it out of the client/edge bundle.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
