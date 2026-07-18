"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const mainImage = images[selected] ?? images[0] ?? "/images/pheagle.png";

  return (
    <div>
      <div className="clip-angled relative h-80 w-full bg-[#111] md:h-[28rem]">
        <Image
          src={mainImage}
          alt={name}
          fill
          priority
          className="object-contain p-6"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      {images.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                aria-label={`View image ${i + 1} of ${name}`}
                aria-current={i === selected}
                onClick={() => setSelected(i)}
                className={`relative block h-16 w-16 border ${
                  i === selected ? "border-pheve-red" : "border-zinc-700 hover:border-zinc-400"
                }`}
              >
                <Image src={src} alt="" fill className="object-contain p-1" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
