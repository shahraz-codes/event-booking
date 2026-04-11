import { prisma } from "@/lib/prisma";

const STORAGE_LIMIT_BYTES = 25 * 1024 * 1024 * 1024; // 25 GB

// ── Media Library ───────────────────────────────────────────────────

export async function getAllMediaFiles() {
  return prisma.mediaFile.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getMediaUsage() {
  const result = await prisma.mediaFile.aggregate({
    _sum: { fileSize: true },
  });
  const usedBytes = result._sum.fileSize ?? 0;
  return {
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    availableBytes: STORAGE_LIMIT_BYTES - usedBytes,
  };
}

export async function createMediaFile(data: {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: string;
  width?: number;
  height?: number;
}) {
  const { usedBytes } = await getMediaUsage();
  if (usedBytes + data.fileSize > STORAGE_LIMIT_BYTES) {
    throw new Error("Storage limit exceeded. Delete some files to free space.");
  }
  return prisma.mediaFile.create({ data });
}

export async function deleteMediaFile(id: string) {
  const [carouselCount, galleryCount, heroCount] = await Promise.all([
    prisma.heroCarouselImage.count({ where: { mediaFileId: id } }),
    prisma.galleryItem.count({ where: { mediaFileId: id } }),
    prisma.heroSection.count({ where: { logoMediaFileId: id } }),
  ]);

  if (carouselCount + galleryCount + heroCount > 0) {
    const usedIn: string[] = [];
    if (carouselCount > 0) usedIn.push(`${carouselCount} carousel slide(s)`);
    if (galleryCount > 0) usedIn.push(`${galleryCount} gallery item(s)`);
    if (heroCount > 0) usedIn.push("hero logo");
    throw new Error(
      `Cannot delete: file is used in ${usedIn.join(", ")}. Remove it from those sections first.`
    );
  }

  return prisma.mediaFile.delete({ where: { id } });
}

// ── Hero ────────────────────────────────────────────────────────────

export async function getHero() {
  return prisma.heroSection.findFirst({ include: { logoMedia: true } });
}

export async function upsertHero(data: {
  subtitle: string;
  heading: string;
  headingHighlight: string;
  description: string;
  logoUrl?: string | null;
  logoMediaFileId?: string | null;
}) {
  const { logoMediaFileId, ...rest } = data;
  const prismaData = {
    ...rest,
    ...(logoMediaFileId
      ? { logoMedia: { connect: { id: logoMediaFileId } } }
      : logoMediaFileId === null
        ? { logoMedia: { disconnect: true } }
        : {}),
  };

  const existing = await prisma.heroSection.findFirst();

  if (existing) {
    return prisma.heroSection.update({
      where: { id: existing.id },
      data: prismaData,
      include: { logoMedia: true },
    });
  }

  return prisma.heroSection.create({
    data: prismaData,
    include: { logoMedia: true },
  });
}

// ── Gallery ─────────────────────────────────────────────────────────

export async function getVisibleGalleryItems() {
  return prisma.galleryItem.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
    include: { mediaFile: true },
  });
}

export async function getAllGalleryItems() {
  return prisma.galleryItem.findMany({
    orderBy: { order: "asc" },
    include: { mediaFile: true },
  });
}

export async function createGalleryItem(data: {
  title: string;
  desc: string;
  imageUrl?: string;
  mediaFileId?: string;
  gradient?: string;
  order?: number;
}) {
  const maxOrder = await prisma.galleryItem.aggregate({ _max: { order: true } });
  const order = data.order ?? (maxOrder._max.order ?? 0) + 1;
  return prisma.galleryItem.create({
    data: {
      title: data.title,
      desc: data.desc,
      imageUrl: data.imageUrl ?? "",
      gradient: data.gradient,
      order,
      ...(data.mediaFileId
        ? { mediaFile: { connect: { id: data.mediaFileId } } }
        : {}),
    },
    include: { mediaFile: true },
  });
}

export async function updateGalleryItem(
  id: string,
  data: {
    title?: string;
    desc?: string;
    imageUrl?: string;
    mediaFileId?: string;
    gradient?: string;
    order?: number;
    visible?: boolean;
  }
) {
  const { mediaFileId, ...rest } = data;
  return prisma.galleryItem.update({
    where: { id },
    data: {
      ...rest,
      ...(mediaFileId
        ? { mediaFile: { connect: { id: mediaFileId } } }
        : {}),
    },
    include: { mediaFile: true },
  });
}

export async function deleteGalleryItem(id: string) {
  return prisma.galleryItem.delete({ where: { id } });
}

// ── Services ────────────────────────────────────────────────────────

export async function getVisibleServiceItems() {
  return prisma.serviceItem.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
  });
}

export async function getAllServiceItems() {
  return prisma.serviceItem.findMany({ orderBy: { order: "asc" } });
}

export async function createServiceItem(data: {
  title: string;
  desc: string;
  iconSvg: string;
  order?: number;
}) {
  const maxOrder = await prisma.serviceItem.aggregate({ _max: { order: true } });
  return prisma.serviceItem.create({
    data: { ...data, order: data.order ?? (maxOrder._max.order ?? 0) + 1 },
  });
}

export async function updateServiceItem(
  id: string,
  data: {
    title?: string;
    desc?: string;
    iconSvg?: string;
    order?: number;
    visible?: boolean;
  }
) {
  return prisma.serviceItem.update({ where: { id }, data });
}

export async function deleteServiceItem(id: string) {
  return prisma.serviceItem.delete({ where: { id } });
}

// ── Hero Carousel ────────────────────────────────────────────────────

export async function getVisibleCarouselImages() {
  return prisma.heroCarouselImage.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
    include: { mediaFile: true },
  });
}

export async function getAllCarouselImages() {
  return prisma.heroCarouselImage.findMany({
    orderBy: { order: "asc" },
    include: { mediaFile: true },
  });
}

export async function createCarouselImage(data: {
  imageUrl?: string;
  mediaFileId?: string;
  alt?: string;
  order?: number;
}) {
  const maxOrder = await prisma.heroCarouselImage.aggregate({ _max: { order: true } });
  const order = data.order ?? (maxOrder._max.order ?? 0) + 1;
  return prisma.heroCarouselImage.create({
    data: {
      imageUrl: data.imageUrl ?? "",
      alt: data.alt,
      order,
      ...(data.mediaFileId
        ? { mediaFile: { connect: { id: data.mediaFileId } } }
        : {}),
    },
    include: { mediaFile: true },
  });
}

export async function updateCarouselImage(
  id: string,
  data: {
    imageUrl?: string;
    mediaFileId?: string;
    alt?: string;
    order?: number;
    visible?: boolean;
  }
) {
  const { mediaFileId, ...rest } = data;
  return prisma.heroCarouselImage.update({
    where: { id },
    data: {
      ...rest,
      ...(mediaFileId
        ? { mediaFile: { connect: { id: mediaFileId } } }
        : {}),
    },
    include: { mediaFile: true },
  });
}

export async function deleteCarouselImage(id: string) {
  return prisma.heroCarouselImage.delete({ where: { id } });
}
