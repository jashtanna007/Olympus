export const MAX_SOURCE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_FINAL_PHOTO_BYTES = 700 * 1024;
export const MAX_PHOTO_DIMENSION = 1000;

const QUALITY_STEPS = [0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve({ image, objectUrl });

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "This image format could not be processed. Please use JPG, PNG, or WebP."
        )
      );
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function encodeCanvas(canvas, quality) {
  const webpBlob = await canvasToBlob(canvas, "image/webp", quality);

  if (webpBlob?.type === "image/webp") {
    return webpBlob;
  }

  return canvasToBlob(canvas, "image/jpeg", quality);
}

function fileExtensionForType(type) {
  return type === "image/webp" ? "webp" : "jpg";
}

export async function prepareProfilePhoto(originalFile) {
  if (!originalFile?.type?.startsWith("image/")) {
    throw new Error("Please select a valid image.");
  }

  if (originalFile.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error("Original photo must be under 5 MB.");
  }

  const { image, objectUrl } = await loadImage(originalFile);

  try {
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (!originalWidth || !originalHeight) {
      throw new Error("Could not read the selected photo.");
    }

    const dimensionsAlreadyValid =
      originalWidth <= MAX_PHOTO_DIMENSION &&
      originalHeight <= MAX_PHOTO_DIMENSION;

    // Preserve an already optimized image without recompressing it.
    if (
      originalFile.size <= MAX_FINAL_PHOTO_BYTES &&
      dimensionsAlreadyValid
    ) {
      return {
        file: originalFile,
        wasCompressed: false,
        originalSize: originalFile.size,
        finalSize: originalFile.size,
        width: originalWidth,
        height: originalHeight,
      };
    }

    const initialScale = Math.min(
      1,
      MAX_PHOTO_DIMENSION / Math.max(originalWidth, originalHeight)
    );

    let width = Math.max(1, Math.round(originalWidth * initialScale));
    let height = Math.max(1, Math.round(originalHeight * initialScale));

    for (let dimensionPass = 0; dimensionPass < 5; dimensionPass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Photo processing is not supported by this browser.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await encodeCanvas(canvas, quality);

        if (!blob) {
          continue;
        }

        if (blob.size <= MAX_FINAL_PHOTO_BYTES) {
          const extension = fileExtensionForType(blob.type);
          const baseName =
            originalFile.name.replace(/\.[^.]+$/, "") || "profile-photo";

          return {
            file: new File([blob], `${baseName}.${extension}`, {
              type: blob.type,
              lastModified: Date.now(),
            }),
            wasCompressed: true,
            originalSize: originalFile.size,
            finalSize: blob.size,
            width,
            height,
          };
        }
      }

      width = Math.max(400, Math.round(width * 0.88));
      height = Math.max(400, Math.round(height * 0.88));
    }

    throw new Error(
      "The photo could not be reduced below 700 KB. Please choose another image."
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
