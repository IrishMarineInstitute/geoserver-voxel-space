// see https://www.mapbox.com/bites/00009/hillshade.js
function raster2dem(data, width, height, zFactor) {
	zFactor = zFactor || 0.12;
	var values = new Uint16Array(width * height),
			dem = new Float32Array(width * height * 2);

	var x, y, dx, dy, i, j;

	for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
					i = x + y * width;
					j = i * 4;
					values[i] = data[j] + data[j + 1] * 2 + data[j + 2] * 3;
			}
	}

	for (x = 1; x < width-1; x++) {
			for (y = 1; y < height-1; y++) {

					i = y * width + x;

					dx = ((values[i - width - 1] + 2 * values[i + 1]   + values[i + width + 1]) -
								(values[i - width + 1] + 2 * values[i - 1]   + values[i + width - 1])) / 8;
					dy = ((values[i + width - 1] + 2 * values[i + width] + values[i + width + 1]) -
								(values[i - width + 1] + 2 * values[i - width] + values[i - width - 1])) / 8;

					j = (y * width + x) * 2;

					dem[j] = Math.atan(zFactor * Math.sqrt(dx * dx + dy * dy)); // slope

					dem[j + 1] = dx !== 0 ?
							Math.atan2(dy, -dx) :
							Math.PI / 2 * (dy > 0 ? 1 : -1); // aspect
			}
	}

	return dem;
}
// see https://www.mapbox.com/bites/00009/hillshade.js
function hillshade(dem, altitude, azimuth, shadows, highlights, width, height) {
	var px = new Uint8ClampedArray(width * height * 4),
			a = - azimuth - Math.PI / 2,
			z = Math.PI / 2 - altitude,
			cosZ = Math.cos(z),
			sinZ = Math.sin(z),
			neutral = cosZ,
			x, y, i, sl, asp, hillshade, alpha;
	for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
					// pad dem borders
					i = ((y === 0 ? 1 : y === height-1 ? y-1 : y) * width +
							 (x === 0 ? 1 : x === width -1 ? x-1 : x)) * 2;
					sl  = dem[i]; // slope
					asp = dem[i + 1]; //aspect
					if (!sl) continue;
					hillshade = cosZ * Math.cos(sl) + sinZ * Math.sin(sl) * Math.cos(a - asp);
					if (hillshade < 0) {
							hillshade /= 2;
					}
					alpha = neutral - hillshade;
					i = (y * width + x) * 4;
					if (neutral > hillshade) { // shadows
							px[i]     = 20;
							px[i + 1] = 0;
							px[i + 2] = 30;
							px[i + 3] = Math.round(255 * alpha * shadows);
					} else { // highlights
							alpha = Math.min(-alpha * cosZ * highlights / (1 - hillshade), highlights);
							px[i]     = 255;
							px[i + 1] = 255;
							px[i + 2] = 230;
							px[i + 3] = Math.round(255 * alpha);
					}
			}
	}

	return px;
}
var getImageData = function(image,width,height){
	var tempcanvas = document.createElement("canvas");
	var tempcontext = tempcanvas.getContext("2d");
	tempcanvas.width = width;
	tempcanvas.height = height;
	tempcontext.drawImage(image, 0, 0, width, height);
	return tempcontext.getImageData(0, 0, width, height).data;
}
var getHillshadedImageData = function(surface,depth,width,height,options){
	options = options || {};
	var altitude = (options.altitude === undefined? 60 : options.altitude) * Math.PI / 180;
	var azimuth = (options.azimuth === undefined? 135 : options.azimuth) * Math.PI / 180;
	var zfactor = options.zfactor === undefined? 0.3 : options.zfactor;
	var shadows = options.shadows === undefined? 0.45 : options.shadows;
	var highlights = options.hightlights === undefined? 0.45 : options.hightlights;
	var dem = raster2dem(depth,width,height,zfactor);
	var hs = hillshade(dem, altitude, azimuth, shadows, highlights, width, height);
	var tempcanvas = document.createElement("canvas");
	var tempcontext = tempcanvas.getContext("2d");
	tempcanvas.width = width;
	tempcanvas.height = height;
	tempcontext.putImageData(new ImageData(surface,width,height), 0, 0);

	var tempcanvas2 = document.createElement("canvas");
	var tempcontext2 = tempcanvas2.getContext("2d");
	tempcanvas2.width = width;
	tempcanvas2.height = height;
	tempcontext2.putImageData(new ImageData(hs,width,height), 0, 0);
	tempcontext.drawImage(tempcanvas2,0,0);
	return tempcontext.getImageData(0, 0, width, height).data;
}

var getImageDataMirroredBothWays = function(image,width,height){
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	canvas.width = image.naturalWidth * 2;
	canvas.height = image.naturalHeight * 2;
	ctx.drawImage(image, image.naturalWidth, image.naturalHeight);
	ctx.scale(-1,1);
	ctx.drawImage(image, 0, image.naturalHeight,image.naturalWidth*-1,image.naturalHeight);
	ctx.scale(-1,-1);
	ctx.drawImage(image, image.naturalWidth, 0,image.naturalWidth,image.naturalHeight*-1);
	ctx.scale(-1,1);
	ctx.drawImage(image, 0,0,image.naturalWidth*-1, image.naturalHeight*-1);
	var canvas2 = document.createElement("canvas");
	var ctx2 = canvas2.getContext("2d");
	canvas2.width = width;
	canvas2.height = height;
	ctx2.drawImage(canvas,0,0,width,height);
	return ctx2.getImageData(0, 0, width, height).data;
}
