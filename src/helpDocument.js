/* global chrome, app */
{
    const {addNewNodeId} = app.util;

    const helpBookmarkName = 'Bookmark Desktop Help.txt';
    const searchForHelpBookmark = () => {
        return new Promise((res) => {
            chrome.bookmarks.search(helpBookmarkName, res);
        });
    };

    app.helpMarkup = `<!--sbd-doc-->
        <h1>Super Bookmark Desktop Help</h1>
        <hr>
        <div>
            Hey thanks for trying out <b>Super Bookmark Desktop</b> - the bookmark manager that acts like
            your computer desktop!<br>You should see your bookmarks that belong in your "Bookmarks Bar" and
            "Other Bookmarks" folders on your desktop now (the desktop represents both folders, though this can be
            changed). To make the best use out of this extension, pretend that this is just like your normal
            desktop. This means you can do things you are familiar with like:
        </div>
        <div>
            <ul>
                <li><i>Click and Drag</i> icons to move them around the desktop or into folders.</li>
                <li>
                    Create a selection of multiple items by starting a <i>Click and Drag</i> off an icon
                    (then try moving all of them).
                </li>
                <li>Hold down Ctrl, Shift, or Command and then click an icon to multi-select icons.</li>
                <li>
                    <i>Right Click</i> the desktop create bookmarks or to change backgrounds and
                    set background settings.
                </li>
                <li><i>Right Click</i> icons to edit or delete them (editing and deleting affects the actual chrome bookmark).</li>
                <li>
                    Create text files (like this one) that sync like a normal bookmark.
                    Good for making quick reminders!
                </li>
            </ul>
            <div>
                There's quite a bit to explore! Just try things out to see what they do. I recommend adjusting your
                icons to be where you want them so you can find your most common bookmarks fast!
            </div><br>
            <div>
                Just a reminder that the desktop represents both the "Bookmarks Bar" and "Other Bookmarks" folders.
                However, if you move a bookmark from a folder to the desktop, it will be placed in "Other Bookmarks".
                You can hide "Bookmarks Bar" bookmarks by going into the options (right click somewhere on the desktop
                and click Options).
            </div>
        </div>
        <h2>Quick Search:</h2>
        <div>
            When you open a new browser tab, you can press your keyboard tab key (1-2 times depending on your OS) to
            activate the quick search feature. This feature lets you type to find the bookmark you are looking for
            using a few characters. You can use the arrow keys to navigate up and down the list and the enter key
            to select a bookmark.
        </div>
        <br>
        <div>
            You can also use the spacebar key to open the quick search at any time when you've already clicked in
            the new brwoser tab.
        </div>
        <h2>Some Notes on Background Settings:</h2>
        <div>
            Reach background settings by <i>Right Clicking</i> anywhere on the desktop (not on an icon).
            Then click on <i>Desktop Properties</i>.
        </div>
        <br>
        <div>
            Backgrounds are set up by default to change every 20 minutes. Only backgrounds with a &#10004;
            (check-mark) on them will be in the background <i>rotation</i>. You can check the <i>shuffle</i> check
            box to make the next background rotation random. You can also change the time interval of how fast
            backgrounds change next to that check box. If you click on a background on the right, you can edit
            background settings <b>for that specific background</b> on the left such as:
        </div>
        <div>
            <ul>
                <li>Background color</li>
                <li>
                    Overlay color filter (Good for dimming backgrounds that are too bright and make
                    text hard to read).
                </li>
                <li>Background fitting options (fill, tile, fit, center)</li>
            </ul>
            <div>Just play around with the settings and I'm sure you will get it.</div>
        </div>
        <br>
        <div>
            <div><b>Subreddit Randomizers</b></div>
            <br>
            <div>
                In "Desktop Properties", you might notice the "Add Subreddit Randomizer" button near the bottom.
                This feature allows you to specify <a href="https://reddit.com">reddit.com</a> subreddits as an image
                source for Super Bookmark Desktop to pick from randomly. You can enter multiple subreddits in the same
                randomizer so that their results are mixed, but you may want to make a separate randomizer for each
                subreddit so that all subreddits have an equal chance to be used when picking an image.
            </div>
        </div>
        <h2>Find a bug / Request a feature / Just want to say thanks?</h2>
        <div>
            For bugs or features, you can open a github issue here:
            <a href="https://github.com/kylepaulsen/SuperBookmarkDesktop/issues">
                https://github.com/kylepaulsen/SuperBookmarkDesktop/issues
            </a>
        </div>
        <div>Otherwise feel free to say hi or thanks at: <b>kyle.a.paulsen@gmail.com</b></div>
        <br>
        <div><b>Anyway thanks again! Have fun!</b></div><br>
    `.replace(/ {2,}/g, '');

    const makeHelpDocument = async () => {
        if (localStorage.madeHelp) {
            return;
        }
        localStorage.madeHelp = '1';
        app.firstTimeUse = true;

        const dataUriStartString = 'data:text/html;charset=UTF-8;base64,';
        const newDocUrl = dataUriStartString + btoa(unescape(encodeURIComponent(app.helpMarkup)));

        const results = await searchForHelpBookmark() || [];

        if (results.length < 1) {
            chrome.bookmarks.create({
                parentId: '2',
                title: helpBookmarkName,
                url: newDocUrl
            }, (newNode) => {
                addNewNodeId(newNode.id);
                app.data.icons[newNode.id] = {x: 0, y: 0};
                app.data.locations['0,0'] = true;
            });
        }
    };

    app.makeHelpDocument = makeHelpDocument;
}
