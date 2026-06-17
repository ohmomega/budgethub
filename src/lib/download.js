export const downloadFileViaServer = (content, filename, mimeType) => {
  let blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (typeof content === 'string') {
    const base64Data = content.includes(',') ? content.split(',')[1] : content;
    const binary = atob(base64Data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    blob = new Blob([array], { type: mimeType });
  }

  if (blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
};
