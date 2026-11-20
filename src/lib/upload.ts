export async function uploadToImgBB(imageSource: File | string): Promise<string> {
  const apiKey = (import.meta as any).env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('Missing IMGBB API Key');
  }

  const formData = new FormData();
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    const base64Data = imageSource.split(',')[1];
    formData.append('image', base64Data);
  } else {
    formData.append('image', imageSource);
  }

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error(data.error.message || 'IMG BB Upload Failed');
  }
}
