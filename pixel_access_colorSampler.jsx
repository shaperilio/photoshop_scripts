function PixelSampler(doc) {
    this.doc = doc
    this.doc.colorSamplers.removeAll();
    this.sampler = this.doc.colorSamplers.add([0, 0]);
}

// Return an array of R, G, B pixel values for a particular coordinate.
PixelSampler.prototype.get = function (x, y) {
    this.sampler.move([x, y]);
    const R = this.sampler.color.rgb.red;
    const G = this.sampler.color.rgb.green;
    const B = this.sampler.color.rgb.blue;
    return [R, G, B];
}

////////////////////////////////////////////////////////
/// SOME TESTS /////////////////////////////////////////
////////////////////////////////////////////////////////

const p = new PixelSampler(app.activeDocument);
alert("Pixel 0 =\n\n" + p.get(0, 0));

$.hiresTimer;
var n = 1000; //p.width * p.height;
for (var i = 0; i < n; i++) p.get(i, 0);
sec = ($.hiresTimer / 1000 / 1000);
alert("Got " + (n / 1000) + " kilopixels in " + sec.toFixed(2) + " seconds.");
// I get 10 seconds per kilopixels sampled.