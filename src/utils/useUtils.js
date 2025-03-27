
export const useUtils = () => {
  function base64ToBlob(base64String, mimeType) {
    // 解码 Base64 字符串
        const binaryString = atob(base64String);

    // 转换为 Uint8Array
        const byteArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          byteArray[i] = binaryString.charCodeAt(i);
        }

    // 转换为 Blob
    return new Blob([byteArray], { type: mimeType });
  }
  return {
    base64ToBlob
  }
}
