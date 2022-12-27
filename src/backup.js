/* global chrome, LZString, idbKeyval, app */
{
    const util = window.util;
    const backup = {};

    backup.storageSyncChunkedWrite = (key, value) => {
        // chrome storage will count these characters as 1 byte:
        // !#$%&\'( )*+,-./0123456789:;=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~
        // these and any other characters (i think) will be counted as more than 1 byte: \"<
        const valueToStore = LZString.compressToBase64(JSON.stringify(value));
        const maxChunkSize = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - key.length - 4;
        const numChunks = Math.ceil(valueToStore.length / maxChunkSize);
        const storageObj = {};
        storageObj[key + '#'] = numChunks;
        for (let i = 0; i < numChunks; i++) {
            storageObj[key + i] = valueToStore.substring(i * maxChunkSize, i * maxChunkSize + maxChunkSize);
        }
        return chrome.storage.sync.set(storageObj);
    };

    backup.storageSyncChunkedRead = async (key) => {
        const numChunksKey = key + '#';
        const numChunksData = await chrome.storage.sync.get(numChunksKey);
        const numChunks = numChunksData[numChunksKey];
        const chunkKeys = [];
        for (let i = 0; i < numChunks; i++) {
            chunkKeys.push(key + i);
        }
        const chunkData = await chrome.storage.sync.get(chunkKeys);
        const chunks = [];
        for (let i = 0; i < numChunks; i++) {
            chunks.push(chunkData[key + i]);
        }
        const fullValue = chunks.join('');
        return fullValue ? JSON.parse(LZString.decompressFromBase64(fullValue)) : undefined;
    };

    backup.storageSyncChunkedDelete = async (key) => {
        const numChunksKey = key + '#';
        const numChunksData = await chrome.storage.sync.get(numChunksKey);
        const numChunks = numChunksData[numChunksKey];
        const chunkKeys = [numChunksKey];
        for (let i = 0; i < numChunks; i++) {
            chunkKeys.push(key + i);
        }
        return chrome.storage.sync.remove(chunkKeys);
    };

    const makeBookmarkIdToBookmarkMap = async () => {
        const bookmarkTree = await app.getBookmarkTree();
        const idToBookmark = {};
        const traverseBookmarkTree = (node) => {
            idToBookmark[node.id] = node;
            if (node.children) {
                node.children.forEach((child) => {
                    traverseBookmarkTree(child);
                });
            }
        };
        traverseBookmarkTree(bookmarkTree[0]);
        return idToBookmark;
    };

    const getBookmarkHash = (bookmark) => {
        let title = bookmark.title;
        if (bookmark.parentId === '0') {
            // I guess default root folder names can differ in case??? chrome pls.
            title = title.toLowerCase();
        }
        // Cant use dateAdded cause even that can differ apparently (on folders for some reason)
        return util.simpleHash(bookmark.url + '|' + title);
    };

    const makeBookmarkHashToBookmarkMap = async (bookmarkIds) => {
        const idToBookmark = await makeBookmarkIdToBookmarkMap();
        if (!bookmarkIds) {
            bookmarkIds = Object.keys(idToBookmark);
        }

        const hashToBookmark = {};
        bookmarkIds.forEach((id) => {
            const bookmark = idToBookmark[id];
            if (bookmark) {
                const hash = getBookmarkHash(bookmark);
                hashToBookmark[hash] = bookmark;
            }
        });
        return hashToBookmark;
    };

    const makeBookmarkHashToLocationMap = async (idToLocationMap) => {
        const hashToBookmark = await makeBookmarkHashToBookmarkMap(Object.keys(idToLocationMap));
        const hashToLocation = {};
        Object.keys(hashToBookmark).forEach((hash) => {
            const bookmark = hashToBookmark[hash];
            hashToLocation[hash] = idToLocationMap[bookmark.id];
        });
        return hashToLocation;
    };

    const saveBrowserSyncData = async () => {
        if (!localStorage.browserSync) {
            return;
        }

        const appData = JSON.parse(localStorage.data || '{}');
        const icons = appData.icons || {};
        // We cant use bookmark IDs, as they are only consistent per local chrome profile.
        // So we have to make up our own IDs based on the bookmark data.
        const bookmarkHashToLocation = await makeBookmarkHashToLocationMap(icons);
        const bookmarkIdToBookmark = await makeBookmarkIdToBookmarkMap();
        const openedWindows = JSON.parse(localStorage.openedWindows || '[]');
        openedWindows.forEach((openedWindow) => {
            openedWindow.hash = getBookmarkHash(bookmarkIdToBookmark[openedWindow.id]);
        });

        const syncData = {
            version: 1,
            widgets: JSON.parse(localStorage.widgets || '[]'),
            rememberWindows: localStorage.rememberWindows,
            windowCloseRight: localStorage.windowCloseRight,
            userStyles: (localStorage.userStyles || '').substring(0, 30000),
            bookmarkHashToLocation,
            hideBookmarksBarBookmarks: localStorage.hideBookmarksBarBookmarks,
            hideBookmarkSearchButton: localStorage.hideBookmarkSearchButton,
            openedWindows: openedWindows.length ? openedWindows : undefined,
            useDoubleClicks: localStorage.useDoubleClicks,
            backgrounds: appData.backgrounds,
            random: appData.random,
            rotateMinutes: appData.rotateMinutes,
        };
        window.ignoreNextSyncOnChanged = true;
        return backup.storageSyncChunkedWrite('sync', syncData);
    };

    let lastSaveTime = 0;
    const saveCooldown = 3000;
    let cooldownTimeout;
    let dedupCallsTimeout;
    backup.saveBrowserSyncData = async () => {
        if (!localStorage.browserSync) {
            return;
        }
        const now = Date.now();
        const deltaTime = now - lastSaveTime;
        const cooldownTimeLeft = saveCooldown - deltaTime;
        if (cooldownTimeLeft > 0) {
            clearTimeout(cooldownTimeout);
            cooldownTimeout = setTimeout(backup.saveBrowserSyncData, cooldownTimeLeft);
            return util.sleep(cooldownTimeLeft);
        }

        clearTimeout(dedupCallsTimeout);
        dedupCallsTimeout = setTimeout(() => {
            lastSaveTime = now;
            saveBrowserSyncData().catch(e => console.error(e));
        }, 10);
    };

    const syncBackgroundSettings = (incomingBackgrounds, existingData) => {
        const existingBackgrounds = existingData.backgrounds;
        const incomingSubredditRandIds = {};
        incomingBackgrounds.forEach(bgData => {
            if (bgData.type === 'subredditRandomizer') {
                const newBgSubredditsString = (bgData.subreddits || []).join('|');
                incomingSubredditRandIds[newBgSubredditsString] = true;
                const existingSubredditBg = existingBackgrounds.find(bg => bg.type === 'subredditRandomizer' &&
                    (bg.subreddits || []).join('|') === newBgSubredditsString);
                if (!existingSubredditBg) {
                    let newBg = util.createSubredditRandomizerBg(bgData.subreddits);
                    newBg = { ...newBg, ...bgData, id: newBg.id, default: false, type: 'subredditRandomizer' };
                    existingBackgrounds.push(newBg);
                } else {
                    Object.assign(existingSubredditBg,
                        { ...bgData, id: existingSubredditBg.id, default: false, type: 'subredditRandomizer' });
                }
            } else if (bgData.default) {
                const existingSubredditBg = existingBackgrounds.find(bg => bg.image === bgData.image) || {};
                Object.assign(existingSubredditBg,
                    { ...bgData, id: existingSubredditBg.id, default: true, type: 'image' });
            }
        });
        existingData.backgrounds = existingBackgrounds.filter(bg => bg.type !== 'subredditRandomizer' ||
            incomingSubredditRandIds[(bg.subreddits || []).join('|')]);
    };

    backup.loadBrowserSyncData = async () => {
        const data = await backup.storageSyncChunkedRead('sync');
        if (data) {
            localStorage.widgets = JSON.stringify(data.widgets);
            localStorage.rememberWindows = data.rememberWindows || '';
            localStorage.windowCloseRight = data.windowCloseRight || '';
            localStorage.userStyles = data.userStyles || '';
            localStorage.hideBookmarksBarBookmarks = data.hideBookmarksBarBookmarks || '';
            localStorage.hideBookmarkSearchButton = data.hideBookmarkSearchButton || '';
            localStorage.useDoubleClicks = data.useDoubleClicks || '';

            const bookmarkHashToBookmark = await makeBookmarkHashToBookmarkMap();
            (data.openedWindows || []).forEach(openedWindow => {
                openedWindow.id = (bookmarkHashToBookmark[openedWindow.hash] || openedWindow).id;
            });
            localStorage.openedWindows = data.openedWindows ? JSON.stringify(data.openedWindows) : '';

            const localData = JSON.parse(localStorage.data || '{}');

            localData.icons = localData.icons || [];
            const remoteHashToLocation = data.bookmarkHashToLocation || {};
            Object.keys(remoteHashToLocation).forEach((remoteHash) => {
                const localBookmark = bookmarkHashToBookmark[remoteHash];
                if (localBookmark) {
                    localData.icons[localBookmark.id] = remoteHashToLocation[remoteHash];
                }
            });

            localData.locations = {};
            localData.random = data.random || '';
            localData.rotateMinutes = data.rotateMinutes || 20;
            // fill in location data
            Object.keys(localData.icons).forEach(key => {
                const pos = localData.icons[key];
                localData.locations[`${pos.x},${pos.y}`] = key;
            });

            // import subreddit randomizer backgrounds and settings for default bgs
            localData.backgrounds = localData.backgrounds || [];
            syncBackgroundSettings(data.backgrounds || [], localData);

            localStorage.data = JSON.stringify(localData);
        }
    };

    backup.exportBackupFile = async () => {
        const appData = JSON.parse(localStorage.data);

        const basicExportData = [
            'sbdbackup:1',
            'localStorage',
            JSON.stringify({
                widgets: localStorage.widgets,
                rememberWindows: localStorage.rememberWindows,
                windowCloseRight: localStorage.windowCloseRight,
                userStyles: localStorage.userStyles,
                hideBookmarksBarBookmarks: localStorage.hideBookmarksBarBookmarks,
                hideBookmarkSearchButton: localStorage.hideBookmarkSearchButton,
                openedWindows: localStorage.openedWindows,
                useDoubleClicks: localStorage.useDoubleClicks,
                backgrounds: appData.backgrounds,
                random: appData.random,
                rotateMinutes: appData.rotateMinutes,
            }),
            'end',
            'positions'
        ];

        // prepare bookmark lookup datastructure
        const bookmarkTree = await app.getBookmarkTree();
        const bookmarkIdToInfo = {};
        const traverseBookmarkTree = (node) => {
            let type = 'bookmark';
            if (!node.url) {
                type = 'folder';
            }
            if (app.isValidDocument(node.url)) {
                type = 'document';
            }
            bookmarkIdToInfo[node.id] = {
                type,
                url: node.url,
                title: node.title,
            };
            if (node.children) {
                node.children.forEach((child) => {
                    traverseBookmarkTree(child);
                });
            }
        };
        traverseBookmarkTree(bookmarkTree[0]);

        // backup positions
        const iconPositions = JSON.parse(localStorage.data || '{}').icons;
        Object.keys(iconPositions).forEach((key) => {
            const pos = iconPositions[key];
            const iconInfo = bookmarkIdToInfo[key];
            // making the backup not rely on bookmark ids being the same.
            const backupId = iconInfo.type === 'bookmark' ? iconInfo.url : iconInfo.title;
            basicExportData.push(`${iconInfo.type}|${JSON.stringify(pos)}|${backupId}`);
        });
        basicExportData.push('end', 'icons', '');

        // backup icons
        let exportBlob = new Blob([basicExportData.join('\n')], {type: 'octet/stream'});
        const dbKeys = await idbKeyval.keys();
        const iconKeys = dbKeys.filter((key) => !key.startsWith('b'));
        for (let x = 0, len = iconKeys.length; x < len; x++) {
            const key = iconKeys[x];
            const iconInfo = bookmarkIdToInfo[key];
            const backupId = iconInfo.type === 'bookmark' ? iconInfo.url : iconInfo.title;
            const imageBlob = await idbKeyval.get(key);
            exportBlob = new Blob([exportBlob, `${iconInfo.type}|${imageBlob.size}|${backupId}\n`, imageBlob, '\n'],
                {type: 'octet/stream'});
        }
        exportBlob = new Blob([exportBlob, 'end\nbackgrounds\n'], {type: 'octet/stream'});

        // backup backgrounds
        const backgroundKeys = dbKeys.filter((key) => key.startsWith('b'));
        for (let x = 0, len = backgroundKeys.length; x < len; x++) {
            const key = backgroundKeys[x];
            const imageBlob = await idbKeyval.get(key);
            exportBlob = new Blob([exportBlob, `${key}|${imageBlob.size}\n`, imageBlob, '\n'], {type: 'octet/stream'});
        }
        exportBlob = new Blob([exportBlob, 'end\n'], {type: 'octet/stream'});

        const now = new Date();
        const url = window.URL.createObjectURL(exportBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SuperBookmarkDesktopBackup.${now.getFullYear()}.${
            String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.dat`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    backup.importBackupFile = async (buffer) => {
        let cursor = 0;
        const findNextByte = (byte) => {
            let findCursor = cursor + 1;
            while (findCursor < buffer.length) {
                if (buffer[findCursor] === byte) {
                    break;
                }
                findCursor++;
            }
            return findCursor;
        };
        const getNextLineString = () => {
            const nextEndline = findNextByte(0x0A);
            const line = new TextDecoder().decode(buffer.subarray(cursor, nextEndline));
            cursor = nextEndline;
            return line;
        };

        // prepare bookmark lookup datastructures
        const bookmarkTree = await app.getBookmarkTree();
        const urlToBookmarkId = {};
        const titleToBookmarkId = {};
        const traverseBookmarkTree = (node) => {
            urlToBookmarkId[node.url] = node.id;
            titleToBookmarkId[node.title] = node.id;
            if (node.children) {
                node.children.forEach((child) => {
                    traverseBookmarkTree(child);
                });
            }
        };
        traverseBookmarkTree(bookmarkTree[0]);

        const data = JSON.parse(localStorage.data || '{}');
        data.backgrounds = data.backgrounds || [];
        const iconPositions = data.icons;
        let importedBackgroundData;

        const backupLine = getNextLineString();
        if (!backupLine.startsWith('sbdbackup:')) {
            await app.confirm('Invalid backup file!', [{ text: 'OK', default: true }]);
            return;
        }
        // const backupVersion = backupLine.split(':')[1];
        let currentSection;
        const visitedSections = {};
        while (cursor < buffer.length) {
            if (!currentSection) {
                currentSection = getNextLineString().trim();
            }
            if (currentSection === 'localStorage') {
                visitedSections.localStorage = true;
                const localStorageData = JSON.parse(getNextLineString());
                localStorage.widgets = localStorageData.widgets || [];
                localStorage.rememberWindows = localStorageData.rememberWindows || '';
                localStorage.windowCloseRight = localStorageData.windowCloseRight || '';
                localStorage.userStyles = localStorageData.userStyles || '';
                localStorage.hideBookmarksBarBookmarks = localStorageData.hideBookmarksBarBookmarks || '';
                localStorage.hideBookmarkSearchButton = localStorageData.hideBookmarkSearchButton || '';
                localStorage.openedWindows = localStorageData.openedWindows || '[]';
                localStorage.useDoubleClicks = localStorageData.useDoubleClicks || '';
                data.random = localStorageData.random || '';
                data.rotateMinutes = localStorageData.rotateMinutes || 20;
                importedBackgroundData = localStorageData.backgrounds || [];

                getNextLineString(); // end
                currentSection = undefined;
                continue;
            }
            if (currentSection === 'positions') {
                visitedSections.positions = true;
                cursor++;
                const nextLine = getNextLineString();
                if (nextLine === 'end') {
                    currentSection = undefined;
                    continue;
                }
                const lineParts = nextLine.split('|');
                const iconType = lineParts.shift();
                const position = lineParts.shift();
                const backupId = lineParts.join('|');

                const bookmarkId = iconType === 'bookmark' ? urlToBookmarkId[backupId] : titleToBookmarkId[backupId];
                if (bookmarkId) {
                    iconPositions[bookmarkId] = JSON.parse(position);
                }
                continue;
            }
            if (currentSection === 'icons') {
                visitedSections.icons = true;
                cursor++;
                const nextLine = getNextLineString();
                if (nextLine === 'end') {
                    currentSection = undefined;
                    continue;
                }
                const lineParts = nextLine.split('|');
                const iconType = lineParts.shift();
                const blobSize = parseInt(lineParts.shift());
                const backupId = lineParts.join('|');
                const bookmarkId = iconType === 'bookmark' ? urlToBookmarkId[backupId] : titleToBookmarkId[backupId];
                cursor++; // align to image
                if (bookmarkId) {
                    const imageBlob = new Blob([buffer.subarray(cursor, cursor + blobSize)]);
                    idbKeyval.set(bookmarkId, imageBlob);
                }
                cursor += blobSize;
                continue;
            }
            if (currentSection === 'backgrounds') {
                visitedSections.backgrounds = true;
                cursor++;
                const nextLine = getNextLineString();
                if (nextLine === 'end') {
                    currentSection = undefined;
                    continue;
                }
                const lineParts = nextLine.split('|');
                const bgId = lineParts.shift().replace('b', '');
                const backgroundSettings = importedBackgroundData.find(bgData => bgData.id === bgId) || {};
                const blobSize = parseInt(lineParts.shift());
                cursor++; // align to image
                const imageBlob = new Blob([buffer.subarray(cursor, cursor + blobSize)]);
                let newBg = util.createBG();
                newBg = { ...newBg, ...backgroundSettings, id: newBg.id, default: false, type: 'image' };
                idbKeyval.set('b' + newBg.id, imageBlob);
                data.backgrounds.push(newBg);
                cursor += blobSize;
                continue;
            }
            currentSection = undefined;
            cursor++;
        }

        // import subreddit randomizer backgrounds and settings for default bgs
        syncBackgroundSettings(importedBackgroundData, data);

        // fill in location data
        data.locations = {};
        Object.keys(data.icons).forEach(key => {
            const pos = data.icons[key];
            data.locations[`${pos.x},${pos.y}`] = key;
        });

        localStorage.data = JSON.stringify(data);

        app.messageActions.reload();
        app.rerenderOptions();
        const numSectionsVisited = Object.keys(visitedSections).length;
        if (numSectionsVisited >= 4) {
            backup.saveBrowserSyncData();
            app.confirm('Import complete!', [{ text: 'Awesome', default: true }]);
        } else if (numSectionsVisited === 0) {
            app.confirm('Import failed! Bad backup file?', [{ text: 'OK', default: true }]);
        } else {
            app.confirm('Import incomplete! Only some things were able to be imported.',
                [{ text: 'OK', default: true }]);
        }
    };

    app.backup = backup;
}
