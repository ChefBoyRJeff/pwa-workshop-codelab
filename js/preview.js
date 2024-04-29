import { openDB } from 'idb';
import { marked } from 'marked';

window.addEventListener('DOMContentLoaded', async () => {
  const preview = document.querySelector('.preview');
  const db = await openDB('settings-store');
  const content = (await db.get('settings', 'content')) || '';

  preview.innerHTML = marked(content);
});