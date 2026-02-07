export const compressImage = async (file: File, quality: number = 0.75): Promise<File> => {
  // SVGなどは圧縮せずにそのまま返す
  if (file.type === 'image/svg+xml') return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (e) => reject(e);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);

      // WebP変換
      // qualityは 0.0 〜 1.0 なので、入力(50-100)を100で割る
      const q = quality > 1 ? quality / 100 : quality;

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        const newFile = new File([blob], newName, { type: 'image/webp' });
        resolve(newFile);
      }, 'image/webp', q);
    };

    reader.readAsDataURL(file);
  });
};