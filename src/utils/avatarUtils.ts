/**
 * Avatar Utilities for Initials and Profile Photo Processing
 * Provides deterministic initial avatars and client-side photo compression.
 */

// Color palette for initials avatars
const DEPARTMENT_COLORS: Record<string, string> = {
  'Produksi Export': '#1877F2', // Corporate Blue
  'HA Export': '#D97706',       // Amber / Gold
  'VCFP Export': '#0284C7',     // Sky Blue
  'QAM': '#059669',             // Emerald Green
  'Engineering': '#7C3AED',     // Violet
  'Staff': '#4B5563',           // Cool Gray
  'Administration': '#0891B2',  // Cyan
  'Human Resource': '#DC2626',  // Rose / Crimson
};

const FALLBACK_PALETTE = [
  '#1877F2',
  '#059669',
  '#7C3AED',
  '#D97706',
  '#0284C7',
  '#DC2626',
  '#4B5563',
  '#0D9488',
];

/**
 * Extract 1 or 2 uppercase initials from full name
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministically get a background color based on department or name
 */
export function getAvatarBgColor(name: string, department?: string): string {
  if (department && DEPARTMENT_COLORS[department]) {
    return DEPARTMENT_COLORS[department];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}

/**
 * Generate a standalone SVG Data URI with the user's initials.
 * Avoids any external placeholder or network dependency.
 */
export function generateInitialsAvatar(name: string, department?: string): string {
  const initials = getInitials(name);
  const bgColor = getAvatarBgColor(name, department);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="64" fill="${bgColor}"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle" letter-spacing="1">
      ${initials}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Compress an uploaded user profile photo to a maximum dimension
 * and export as a clean, compact JPEG Base64 Data URL.
 */
export function compressAndReadImage(file: File, maxDimension = 360, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Format file harus berupa gambar (JPG, PNG, WEBP).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memproses gambar yang diunggah.'));
      img.onload = () => {
        let { width, height } = img;

        // Crop square from center or scale proportionally
        const minDim = Math.min(width, height);
        const sourceX = (width - minDim) / 2;
        const sourceY = (height - minDim) / 2;

        const targetDim = Math.min(minDim, maxDimension);

        const canvas = document.createElement('canvas');
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped square
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          minDim,
          minDim,
          0,
          0,
          targetDim,
          targetDim
        );

        // Convert to web-friendly JPEG data url
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an uploaded post image preserving aspect ratio to fit safely within
 * cloud database document constraints while maintaining crisp high resolution.
 */
export function compressPostImage(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Format file harus berupa gambar (JPG, PNG, WEBP).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memproses gambar yang diunggah.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
