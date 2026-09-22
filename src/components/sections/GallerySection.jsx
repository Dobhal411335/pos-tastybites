"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { Camera } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const COLUMNS_PER_SLIDE = 5;
const TALL_RATIO = 1.05;

function loadImageMeta(image) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !image?.url) {
      resolve({ ...image, width: 1, height: 1, isTall: false });
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;
      resolve({
        ...image,
        width,
        height,
        isTall: height / width >= TALL_RATIO,
      });
    };
    img.onerror = () => {
      resolve({ ...image, width: 1, height: 1, isTall: false });
    };
    img.src = image.url;
  });
}

/** Pack tall images as full-height columns; wide images as stacked pairs. */
function packGalleryColumns(items = []) {
  const tall = items.filter((item) => item.isTall);
  const wide = items.filter((item) => !item.isTall);
  const columns = [];
  let ti = 0;
  let wi = 0;

  while (ti < tall.length || wi < wide.length) {
    const canStackWide = wi + 1 < wide.length;
    const preferStack =
      canStackWide && (ti >= tall.length || columns.length % 2 === 1);

    if (preferStack) {
      columns.push({
        type: "stack",
        images: [wide[wi], wide[wi + 1]],
      });
      wi += 2;
      continue;
    }

    if (ti < tall.length) {
      columns.push({ type: "tall", images: [tall[ti]] });
      ti += 1;
      continue;
    }

    if (canStackWide) {
      columns.push({
        type: "stack",
        images: [wide[wi], wide[wi + 1]],
      });
      wi += 2;
      continue;
    }

    if (wi < wide.length) {
      columns.push({ type: "single", images: [wide[wi]] });
      wi += 1;
    }
  }

  return columns;
}

function chunkColumns(columns, size) {
  const chunks = [];
  for (let i = 0; i < columns.length; i += size) {
    chunks.push(columns.slice(i, i + size));
  }
  return chunks;
}

function GalleryImage({ image, alt, className, sizes }) {
  return (
    <div className={`relative overflow-hidden rounded-image bg-border ${className}`}>
      <Image
        src={image.url}
        alt={alt}
        fill
        loading="lazy"
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

function GalleryColumn({ column, columnIndex, slideIndex }) {
  const baseIndex = slideIndex * COLUMNS_PER_SLIDE + columnIndex;

  if (column.type === "tall") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <GalleryImage
          image={column.images[0]}
          alt={`Gallery image ${baseIndex + 1}`}
          className="h-full min-h-[22rem] w-full md:min-h-[26rem]"
          sizes="(max-width: 768px) 50vw, 20vw"
        />
      </div>
    );
  }

  if (column.type === "stack") {
    return (
      <div className="flex h-full min-h-[22rem] flex-col gap-3 md:min-h-[26rem] md:gap-4">
        {column.images.map((image, index) => (
          <GalleryImage
            key={image.key || `${baseIndex}-${index}`}
            image={image}
            alt={`Gallery image ${baseIndex + 1}-${index + 1}`}
            className="min-h-0 flex-1 w-full"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GalleryImage
        image={column.images[0]}
        alt={`Gallery image ${baseIndex + 1}`}
        className="h-full min-h-[11rem] w-full md:min-h-[13rem]"
        sizes="(max-width: 768px) 50vw, 20vw"
      />
    </div>
  );
}

function GallerySlide({ columns, slideIndex, allImages }) {
  if (!columns.length) return null;

  return (
    <div className="relative">
      <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {columns.map((column, index) => (
          <GalleryColumn
            key={`col-${slideIndex}-${index}`}
            column={column}
            columnIndex={index}
            slideIndex={slideIndex}
          />
        ))}
      </div>

      <Dialog>
        <DialogTrigger className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-button bg-heading/80 px-4 py-2 font-body text-sm text-white transition-opacity hover:bg-heading">
          <Camera className="size-4" />
          View gallery
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-heading">
              Gallery
            </DialogTitle>
          </DialogHeader>
          <div className="columns-1 gap-3 sm:columns-2 md:columns-3 md:gap-4">
            {allImages.map((image, index) => (
              <div
                key={image.key || index}
                className="mb-3 break-inside-avoid md:mb-4"
              >
                <img
                  src={image.url}
                  alt={`Gallery detail ${index + 1}`}
                  className="h-auto w-full rounded-image object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomeGallerySection() {
  const [images, setImages] = useState([]);
  const [measuredImages, setMeasuredImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMeasuring, setIsMeasuring] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch("/api/web/gallerySection");
        const result = await res.json();
        setImages(
          result?.success && Array.isArray(result?.data?.images)
            ? result.data.images
            : [],
        );
      } catch {
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!images.length) {
      setMeasuredImages([]);
      setIsMeasuring(false);
      return undefined;
    }

    setIsMeasuring(true);
    Promise.all(images.map(loadImageMeta)).then((results) => {
      if (!cancelled) {
        setMeasuredImages(results);
        setIsMeasuring(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [images]);

  const slides = useMemo(() => {
    const columns = packGalleryColumns(measuredImages);
    return chunkColumns(columns, COLUMNS_PER_SLIDE);
  }, [measuredImages]);

  if (!isLoading && images.length === 0) return null;

  const showSkeleton = isLoading || isMeasuring;

  return (
    <section className="w-full overflow-hidden bg-white py-10">
      <div className="mx-auto w-full max-w-8xl px-4 md:px-6">
        <div className="mb-10 ">
          <p className="font-body text-sm text-heading md:text-base text-center">
            Glimpses of the luxury Sanctuary
          </p>
          <h2 className="mt-3 font-heading text-3xl leading-[1.2] text-heading md:text-4xl lg:text-5xl text-center">
            Moments of Peace{" "}
            <span className="text-primary">& Transformation</span>
          </h2>
          <p className="mt-4 font-body text-sm leading-relaxed text-foreground md:text-base md:leading-[1.8] text-center mx-auto max-w-3xl">
            Step into the serene world of luxurious and discover moments created
            for inner peace, mindful living, and meaningful transformation.
            Explore our tranquil meditation spaces, immersive yoga sessions,
            nourishing organic cuisine, soulful experiences, and the
            breathtaking natural beauty of Himalya.
          </p>
        </div>

        {showSkeleton ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
            {Array.from({ length: COLUMNS_PER_SLIDE }).map((_, index) => (
              <Skeleton
                key={index}
                className="min-h-[22rem] rounded-image md:min-h-[26rem]"
              />
            ))}
          </div>
        ) : (
          <Carousel
            opts={{ align: "start", loop: slides.length > 1 }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {slides.map((slideColumns, index) => (
                <CarouselItem key={index} className="basis-full pl-0">
                  <GallerySlide
                    columns={slideColumns}
                    slideIndex={index}
                    allImages={measuredImages}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {slides.length > 1 ? (
              <>
                <CarouselPrevious className="left-1 size-10 border-border bg-surface text-heading shadow-none hover:bg-background md:-left-4" />
                <CarouselNext className="right-1 size-10 border-border bg-surface text-heading shadow-none hover:bg-background md:-right-4" />
              </>
            ) : null}
          </Carousel>
        )}
      </div>
    </section>
  );
}
