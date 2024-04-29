/*
 Copyright 2021 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

export class Actions {
  constructor() {
    // Open the settings-store database
    this.setupHandler();

    // Close this.previewWindow during the beforeunload event
    window.addEventListener('beforeunload', () => {
      if (this.previewWindow) {
        this.previewWindow.close();
        this.previewWindow = null;
      }
    });
  }

  async setupHandler() {
    // Open the settings-store database
    const db = await idb.openDB('settings-store', 1);

    // Get the saved handler from the settings object store
    const handler = await db.get('settings', 'fileHandler');

    if (handler) {
      // Set this.handler to the retrieved value
      this.handler = handler;

      // Set the title of the page to the handler's file name (plus PWA Edit)
      document.title = `${handler.name} - PWA Edit`;
    }
  }

  /**
   * Function to call when the open button is triggered
   */
  async open() {
    // Open file picker
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.md, .markdown';

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        // Set page title
        document.title = `${file.name} - PWA Edit`;

        // Store file handler
        this.handler = file;

        // Set content of the editor
        const reader = new FileReader();
        reader.onload = async () => {
          // Set content of the editor
          const editor = document.getElementById('editor');
          editor.value = reader.result;

          // Save handler to IndexedDB
          const db = await idb.openDB('settings-store', 1, {
            upgrade(db) {
              db.createObjectStore('settings');
            },
          });
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(this.handler, 'fileHandler');
        };
        reader.readAsText(file);
      }
    });

    fileInput.click();
  }

  /**
   * Function to call when the save button is triggered
   */
  async save() {
    if (!this.handler) {
      // If there's no handler, prompt user to save as
      await this.saveAs();
      return;
    }

    // Write content to the file
    const writable = await this.handler.createWritable();
    await writable.write(document.getElementById('editor').value);
    await writable.close();
  }

  /**
   * Function to call when the duplicate/save as button is triggered
   */
  async saveAs() {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'Untitled.md',
      types: [{
        description: 'Markdown File',
        accept: {'text/markdown': ['.md']}
      }]
    });

    // Set handler
    this.handler = fileHandle;

    // Save handler to IndexedDB
    await this.saveHandlerToDatabase();

    // Save content to the new file
    await this.save();
  }

  /**
   * Reset the editor and file handler
   */
  async reset() {
    // Set the document title to PWA Edit
    document.title = 'PWA Edit';

    // Set the editor's content to an empty string
    const editor = document.getElementById('editor');
    editor.value = '';

    // Set this.handler to null
    this.handler = null;

    // Open the settings-store database
    const db = await idb.openDB('settings-store', 1);

    // Delete the saved handler from the settings object store
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').delete('fileHandler');
  }

  async getSavedHandler() {
    // Retrieve saved handler from the database
    const db = await idb.openDB('settings-store', 1);
    return await db.get('settings', 'fileHandler');
  }

  async saveHandlerToDatabase() {
    // Save handler to the settings object store
    const db = await idb.openDB('settings-store', 1);
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put(this.handler, 'fileHandler');
  }


  /**
   * Function to call when the preview button is triggered
   */
  async preview() {
    // Check if previewWindow exists and close it if it does
    if (this.previewWindow) {
      this.previewWindow.close();
      this.previewWindow = null;
      return;
    }

    // Get the screens currently available
    const screens = await navigator.windowPlacement.getScreens();

    // Filter the screens to find the primary screen
    const primaryScreen = screens.find(screen => screen.isPrimary);

    // Open a window for /preview with specified options
    this.previewWindow = window.open('/preview', 'Markdown preview', `
    width=${primaryScreen.width / 2},
    height=${primaryScreen.height},
    top=0,
    left=${primaryScreen.width / 2},
    menubar=no,
    toolbar=no,
    status=no,
    location=no
  `);
  }

  /**
   * Function to call when the focus button is triggered
   */
  async focus() {
    // Check if the document has a full-screen element
    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (fullscreenElement) {
      // If there is a full-screen element, exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }

      // If this.wakeLock exists, release the wake lock and reset this.wakeLock
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } else {
      // Request a wake lock sentinel and set it to this.wakeLock
      this.wakeLock = await navigator.wakeLock.request('screen');

      // Request that the document's body go full screen
      const body = document.body;
      if (body.requestFullscreen) {
        body.requestFullscreen();
      } else if (body.webkitRequestFullscreen) {
        body.webkitRequestFullscreen();
      } else if (body.mozRequestFullScreen) {
        body.mozRequestFullScreen();
      } else if (body.msRequestFullscreen) {
        body.msRequestFullscreen();
      }
    }
  }
}
