import type { Metadata } from "next";
import Image from "next/image";
import { PageHeading } from "@/components/page-heading";
import { loadGallery } from "@/lib/content";

export const metadata: Metadata = { title: "Gallery — PHEVE" };

export default function GalleryPage() {
  const gallery = loadGallery();

  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="Photos & video" title="Gallery" />

      <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {gallery.photos.map((photo) => (
          <li key={photo.src} className="relative aspect-square overflow-hidden bg-[#111]">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1536px) 25vw, 20vw"
            />
          </li>
        ))}
      </ul>

      {gallery.videos.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl uppercase">Videos</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
                  className="h-full w-full border-0"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
