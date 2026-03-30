"use client";

import Image from "next/image";
import { KeyboardEvent, TouchEvent, useState } from "react";

export function ItemImageCarousel({
  itemLabel,
  imageUrls,
}: {
  itemLabel: string;
  imageUrls: string[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const selectedImage = imageUrls[selectedIndex] ?? imageUrls[0];
  const swipeThreshold = 40;

  const showPrevious = () => {
    setSelectedIndex((current) => (current === 0 ? imageUrls.length - 1 : current - 1));
  };

  const showNext = () => {
    setSelectedIndex((current) => (current === imageUrls.length - 1 ? 0 : current + 1));
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX;
    setTouchStartX(null);

    if (typeof touchEndX !== "number") {
      return;
    }

    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) < swipeThreshold) {
      return;
    }

    if (deltaX > 0) {
      showPrevious();
      return;
    }

    showNext();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (imageUrls.length <= 1) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  return (
    <section className="space-y-3">
      <div
        className="relative touch-pan-y rounded-lg focus:outline-none focus:ring-2 focus:ring-black/70 focus:ring-offset-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={onKeyDown}
        tabIndex={imageUrls.length > 1 ? 0 : -1}
        aria-label="Item photo carousel"
      >
        <Image
          key={selectedImage}
          src={selectedImage}
          alt={`${itemLabel} photo ${selectedIndex + 1}`}
          width={900}
          height={700}
          className="carousel-fade h-72 w-full rounded-lg border border-gray-300 object-cover"
        />
        {imageUrls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-black shadow-sm transition hover:bg-white"
              aria-label="Show previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-black shadow-sm transition hover:bg-white"
              aria-label="Show next photo"
            >
              ›
            </button>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
              {selectedIndex + 1} / {imageUrls.length}
            </div>
          </>
        ) : null}
      </div>
      {imageUrls.length > 1 ? (
        <div className="grid grid-cols-3 gap-3">
          {imageUrls.map((imageUrl, index) => {
            const isSelected = index === selectedIndex;

            return (
              <button
                key={imageUrl}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`overflow-hidden rounded-lg border transition ${
                  isSelected ? "border-black ring-1 ring-black" : "border-gray-300"
                }`}
                aria-label={`View photo ${index + 1}`}
                aria-pressed={isSelected}
              >
                <Image
                  src={imageUrl}
                  alt={`${itemLabel} thumbnail ${index + 1}`}
                  width={300}
                  height={220}
                  className="h-24 w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}