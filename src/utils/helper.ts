export function getFilenameFromUrl(url: string) {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  const filenameWithToken = pathParts[pathParts.length - 1];
  const filename = decodeURIComponent(filenameWithToken.split("?")[0]).split(
    "/"
  )[2];
  return filename;
}