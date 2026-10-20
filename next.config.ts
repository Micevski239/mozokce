import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Мозоците и предметите се читаат од диск при барање; без ова не влегуваат во серверскиот пакет при build.
  outputFileTracingIncludes: {
    "/**": ["./brains/**/*.json", "./data/**/*.json"],
  },
  experimental: {
    // Посетена страница се чува 30 секунди во кешот на прелистувачот, па враќањето на неа е моментално.
    // Промените (server actions со revalidatePath, router.refresh по запис) го чистат кешот.
    staleTimes: {
      dynamic: 30,
    },
    // Материјалите се качуваат преку server action; датотеките се до 50 MB (+ малку за multipart).
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
};

export default nextConfig;
