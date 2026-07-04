import type { Metadata } from "next";
import Image from "next/image";
import { loadGallery } from "@/lib/content";

export const metadata: Metadata = { title: "Gallery — PHEVE" };

export default function GalleryPage() {
  const gallery = loadGallery();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Gallery</h1>

      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {gallery.photos.map((photo) => (
          <li key={photo.src} className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </li>
        ))}
      </ul>

      {gallery.videos.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Videos</h2>
          <ul className="mt-4 grid gap-6 md:grid-cols-2">
            {gallery.videos.map((video) => (
              <li key={video.youtubeId} className="aspect-video">
                {/* oxlint-disable-next-line react/iframe-missing-sandbox -- YouTube nocookie
                    embeds require an unsandboxed iframe (sandboxing breaks fullscreen and
                    playback); the embedded content is fully controlled by us via
                    content/gallery.json, not user input. */}
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                  title={video.title}
                  allowFullScreen
                  className="h-full w-full rounded-lg border-0"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
