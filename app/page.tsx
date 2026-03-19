import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <Image
        src="/logo_liinks.svg"
        alt="Liinks"
        width={160}
        height={70}
        className="h-14 w-auto"
        priority
      />
      <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
        v0.1 Beta
      </p>
    </div>
  );
}
