// Adapted from https://community.adobe.com/t5/photoshop/get-index-of-each-pixel/td-p/10022899?page=1
// The purpose is to query (and change) pixel values quickly.
//
// The secret to speed is doing everything on the script side rather than ask Photoshop to do things.
// We use files on disk as an intermiedary; on the script side, we read / write it as a binary file; on the
// Photoshop side, we save / open it as a raw bitmap.
//
// Only works on RGB 8bpp images, but this could be easily extended to support others.
function RawPixels(doc) {
    this.doc = doc;
    this.pixels = null;

    const currentActiveDoc = app.activeDocument;

    // Obtain the width and height in pixels of the desired document.
    const currentRulerUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.activeDocument = doc;
    this.width = Number(doc.width.value);
    this.height = Number(doc.height.value);
    this.length = this.width * this.height;
    this.pixelData = "";

    // Return the ruler to its previous state.
    app.preferences.rulerUnits = currentRulerUnits;

    try {
        // We're going to save this document as a raw bitmap to be able to read back in the pixel values
        // themselves.
        const file = new File(Folder.temp.fsName + "/" + Math.random().toString().substr(2) + ".raw");

        // Set up the save action.
        // See https://helpx.adobe.com/photoshop/using/file-formats.html#photoshop_raw_format for some info,
        // and more technical at https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
        var rawFormat = new ActionDescriptor();
        rawFormat.putString(stringIDToTypeID("fileCreator"), "8BIM");
        rawFormat.putBoolean(stringIDToTypeID("channelsInterleaved"), true);
        
        var saveAction = new ActionDescriptor();
        saveAction.putObject(stringIDToTypeID("as"), stringIDToTypeID("rawFormat"), rawFormat);
        saveAction.putPath(stringIDToTypeID("in"), file);
        saveAction.putBoolean(stringIDToTypeID("copy"), false);
        executeAction(stringIDToTypeID("save"), saveAction, DialogModes.NO);

        // File is saved; now read it back in as raw bytes.
        file.open("r");
        file.encoding = "BINARY";
        this.pixelData = file.read();

        const err = file.error;
        file.close();
        file.remove();
        file = null;
        if (err) alert(err);
    }
    catch (e) { alert(e); }

    // Return focus to whatever the user had.
    app.activeDocument = currentActiveDoc;
}

// Calculate offset from x, y coordinates. Does not check for valid bounds.
getOffset = function(x, y) {
    if (y == undefined) {
        // allow linear indices too
        y = Math.floor(x / this.width); 
        x = x - y * this.width;
    }
    return (y * this.width + x) * 3;
}

// Return an array of R, G, B pixel values for a particular coordinate.
RawPixels.prototype.get = function (x, y) {
    const off = getOffset(x, y);
    const R = this.pixelData.charCodeAt(off + 0);
    const G = this.pixelData.charCodeAt(off + 1);
    const B = this.pixelData.charCodeAt(off + 2);
    return [R, G, B];
}

// Set the pixel at x, y to the values in RGB.
RawPixels.prototype.set = function (RGB, x, y) {
    const off = getOffset(x, y);
    // note: note checking that length of p = 3!
    const R = String.fromCharCode(RGB[0]);
    const G = String.fromCharCode(RGB[1]);
    const B = String.fromCharCode(RGB[2]);

    this.pixelData = this.pixelData.substr(0, off) + R + G + B + this.pixelData.substr(off + 3);
}

// If any changes were made to the pixels, we need to save them to disk and have Photoshop read that file back in.
// We do that by creating a new layer in the desired document.
RawPixels.prototype.create_layer = function () {
    try {
        const file = new File(Folder.temp.fsName + "/" + Math.random().toString().substr(2) + ".raw");
        file.open("w");
        file.encoding = "BINARY";
        file.write(this.pixelData);

        const err = file.error;
        file.close();
        if (err) { file.remove(); alert(err); return; }

        var rawFormat = new ActionDescriptor();
        rawFormat.putInteger(stringIDToTypeID("width"), this.width);
        rawFormat.putInteger(stringIDToTypeID("height"), this.height);
        rawFormat.putInteger(stringIDToTypeID("channels"), 3);
        rawFormat.putBoolean(stringIDToTypeID("channelsInterleaved"), true);
        rawFormat.putInteger(stringIDToTypeID("depth"), 8);

        var openAction = new ActionDescriptor();
        openAction.putPath(stringIDToTypeID("null"), file);
        openAction.putObject(stringIDToTypeID("as"), stringIDToTypeID("rawFormat"), rawFormat);
        executeAction(stringIDToTypeID("open"), openAction, DialogModes.NO);
        file.remove();

        // The new active document is the file we just opened. Duplicate its contents into 
        // a new layer in our desired document, then close this temporary file.
        app.activeDocument.activeLayer.duplicate(this.doc.layers[0], ElementPlacement.PLACEBEFORE);
        const tempDoc = app.activeDocument;
        app.activeDocument = this.doc;
        this.doc.layers[0].name = "Pixels";
        app.activeDocument = tempDoc;
        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = this.doc;
    }
    catch (e) { alert(e); }
}

////////////////////////////////////////////////////////
/// SOME TESTS /////////////////////////////////////////
////////////////////////////////////////////////////////

$.hiresTimer;
const p = new RawPixels(app.activeDocument);
var sec = ($.hiresTimer / 1000 / 1000);
alert("Init RawPixels in " + sec.toFixed(2) + " seconds");

alert("Pixel 0 =\n\n" + p.get(0));
var a = new Array();
for (var i = 0; i < 100; i++) a.push(p.get(i));
alert("Pixel 0-99 = \n\n" + a.toSource());

p.set(0, [1, 200, 3]);
alert("New Pixel 0=\n\n" + p.get(0));

$.hiresTimer;
var n = p.width * p.height;
for (var i = 0; i < n; i++) p.get(i);
sec = ($.hiresTimer / 1000 / 1000);
alert("Got " + (n / 1000 / 1000) + " megapixels in " + sec.toFixed(2) + " seconds.");

$.hiresTimer;
n = 10;
for (var i = 0; i < n; i++) p.set([255, i * 20, i * 10], 1 + i * 2);
sec = ($.hiresTimer / 1000 / 1000);
//alert("Set " + n + " pixels in " + sec.toFixed(2) + " seconds");

p.create_layer();
alert("New layer created  with new pixels");