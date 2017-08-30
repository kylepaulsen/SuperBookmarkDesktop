{
    const markup = `
        <div class="bookmarkProperties" data-id="bookmarkProperties">
            <div class="row">
                <div class="iconManagement">
                    <div class="icon" data-id="iconBtn">
                        <img src="" data-id="icon" alt="">
                    </div>
                    <button class="iconBtn" data-id="changeIconBtn">Change Icon</button>
                    <button class="iconBtn" data-id="revertIconBtn">Revert Icon</button>
                </div>
                <div class="data">
                    <div class="label">Bookmark Name</div>
                    <input data-id="bmName" placeholder="Bookmark Name" class="input">
                    <div class="label">Bookmark URL</div>
                    <input data-id="bmUrl" placeholder="Bookmark URL" class="input">
                </div>
            </div>
        </div>
        <div class="buttons" data-id="buttons" data-display="flex">
            <button class="cancelBtn btn" data-id="cancelBtn">Cancel</button>
            <button class="applyBtn btn" data-id="applyBtn">Apply</button>
        </div>
    `;
}
