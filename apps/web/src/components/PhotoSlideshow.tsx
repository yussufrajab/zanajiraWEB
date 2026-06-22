'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const PHOTOS = [
  { src: '/photos/1.jpeg', alt: 'CSC Zanzibar photo 1' },
  { src: '/photos/2.jpeg', alt: 'CSC Zanzibar photo 2' },
  { src: '/photos/3.jpeg', alt: 'CSC Zanzibar photo 3' },
  { src: '/photos/4.jpeg', alt: 'CSC Zanzibar photo 4' },
  { src: '/photos/5.jpeg', alt: 'CSC Zanzibar photo 5' },
  { src: '/photos/6.jpeg', alt: 'CSC Zanzibar photo 6' },
  { src: '/photos/7.jpeg', alt: 'CSC Zanzibar photo 7' },
  { src: '/photos/8.jpeg', alt: 'CSC Zanzibar photo 8' },
];

export function PhotoSlideshow() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedCount = loaded.size;

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setLoaded((prev) => new Set(prev).add(index));
    // Preload next few
    for (let i = 1; i <= 3; i++) {
      const next = (index + i) % PHOTOS.length;
      if (!loaded.has(next)) {
        const img = new Image();
        img.onload = () => setLoaded((prev) => new Set(prev).add(next));
        img.src = PHOTOS[next].src;
      }
    }
  }, [loaded]);

  const next = useCallback(() => goTo((current + 1) % PHOTOS.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + PHOTOS.length) % PHOTOS.length), [current, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    intervalRef.current = setInterval(next, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next]);

  // Pause on hover
  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const resume = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(next, 5000);
  };

  if (loadedCount === 0) {
    return (
      <div className="photo-slideshow" style={{ height: 400, background: 'var(--color-primary)' }}>
        <div className="photo-slideshow-loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="photo-slideshow"
      onMouseEnter={pause}
      onMouseLeave={resume}
      role="region"
      aria-label="Photo slideshow"
      aria-roledescription="carousel"
    >
      {/* Images */}
      {PHOTOS.map((photo, i) => (
        <div
          key={i}
          className={`photo-slide ${i === current ? 'photo-slide-active' : ''}`}
          aria-hidden={i !== current}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${PHOTOS.length}`}
        >
          <img
            src={photo.src}
            alt={photo.alt}
            className="photo-slide-img"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="photo-slideshow-overlay-top" aria-hidden="true" />
      <div className="photo-slideshow-overlay-bottom" aria-hidden="true" />

      {/* Prev / Next arrows */}
      <button
        className="photo-slideshow-arrow photo-slideshow-arrow-prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        className="photo-slideshow-arrow photo-slideshow-arrow-next"
        onClick={next}
        aria-label="Next slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Dots */}
      <div className="photo-slideshow-dots" role="tablist" aria-label="Slide navigation">
        {PHOTOS.map((_, i) => (
          <button
            key={i}
            className={`photo-slideshow-dot ${i === current ? 'photo-slideshow-dot-active' : ''}`}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
