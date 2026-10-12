import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Takes a fileTree array from the blueprint and packages it into a downloadable .zip
 */
export async function downloadProjectZip(projectTitle, fileTree) {
  const zip = new JSZip();
  const folderName = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-project';
  const root = zip.folder(folderName);

  for (const item of fileTree) {
    if (item.type === 'file' && item.content) {
      // Ensure parent directories exist
      const parts = item.path.split('/');
      if (parts.length > 1) {
        parts.pop(); // remove filename
        root.folder(parts.join('/'));
      }
      root.file(item.path, item.content);
    }
  }

  // Always include a LICENSE file
  const hasLicense = fileTree.some(f => f.path.toLowerCase().includes('license'));
  if (!hasLicense) {
    root.file('LICENSE', `MIT License

Copyright (c) ${new Date().getFullYear()} ${projectTitle}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`);
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  saveAs(blob, `${folderName}-starter.zip`);
}
