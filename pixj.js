/*
 *      _      _ 
 *  ___|_|_ _ |_|
 * | . | |_'_|| |  - Pixel Image manupulation Library in js
 * |  _|_|_,_|| |
 * |_|        |_|
 * ****************************************************************************
 * Author : Christian '@neu3no' Neubauer
 * Website: http://neu3no.de/pixj/
 * ****************************************************************************
 * This code is licenced under cc-by-nc-sa 3.0 
 * 														http://creativecommons.org/licenses/by-nc-sa/3.0/ 
 *  You are free:
 * 		- to Share — to copy, distribute and transmit the work
 *		- to Remix — to adapt the work
 *  Under the following conditions:
 * 		- Attribution — You must attribute the work in the manner specified by 
 * 			the author or licensor (but not in any way that suggests that they 
 * 			endorse you or your use of the work).
 *  	- Noncommercial — You may not use this work for commercial purposes.
 * 		- Share Alike — If you alter, transform, or build upon this work, you 
 * 			may distribute the resulting work only under the same or similar 
 * 			license to this one.
 */

imagecache = [];

function pixjObj() {
};

pixjObj.prototype.loadImage = function(source, callback) {
	var imgObj = new Image();
	if (!imagecache[source]) {
		imgObj.onload = function() {
			callback(imgObj);
			imagecache[source] = imgObj;
		};
		imgObj.src = source;
	} else {
		callback(imagecache[source]);
	}
};

pixjObj.prototype.posterize = function(imgO, colorsteps, blackandwhite, callback) {
	var dataURL;
	var imgObj;
	var imageData;
	var w = imgO.width;
	var h = imgO.height;
	// create a invisible, temporarly canvas / context for processing
	var tcanvas = $("<canvas/>", {
		width : w,
		height : h
	});
	var tcontext = tcanvas[0].getContext('2d');

	// set the size of the canvas to the size of the image
	tcanvas[0].width = w;
	tcanvas[0].height = h;

	// draw the image on the invisible canvas to read back the pixeldata
	tcontext.drawImage(imgO, 0, 0);

	// read the pixeldata from canvas where image is drawes on.
	imageData = tcontext.getImageData(0, 0, w, h);

	// 2 for loops for running over all pixels
	for ( y = 0; y < h; y++) {
		for ( x = 0; x < w; x++) {
			// calculate the index of the pixel in the array pos pixels
			// each pixel has 4 bytes for rgba.
			i = y * w * 4 + 4 * x;
			// [--row--]   [column]

			s = colorsteps;

			if (blackandwhite) {
				// using the brightest pixel. this might not be the most
				// precise solution, maybe i shall use the luminance
				// calculated by 0.2126r + 0.7152g + 0.0722b
				m = Math.max(imageData.data[0 + i], imageData.data[1 + i], imageData.data[2 + i]);
				// by dividing the value with 's' which contains the value of
				// colorsteps and using math.round the function reduces to 4
				// possible values. those need to be normalized back to 0-255
				r = g = b = Math.round(m / (255 / s)) * (255 / s);
			} else {
				r = Math.round(imageData.data[0 + i] / (255 / s)) * (255 / s);
				g = Math.round(imageData.data[1 + i] / (255 / s)) * (255 / s);
				b = Math.round(imageData.data[2 + i] / (255 / s)) * (255 / s);
			}

			// use calculated values as color values of the pixel. alpha is
			// taken from the original value.
			imageData.data[i + 0] = r;
			imageData.data[i + 1] = g;
			imageData.data[i + 2] = b;
			imageData.data[i + 3] = imageData.data[3 + i + 16];
		}
	}

	tcontext.putImageData(imageData, 0, 0);
	dataURL = tcanvas[0].toDataURL();

	imgObj = new Image();
	imgObj.src = dataURL;
	imgObj.onload = function() {
		callback(imgObj);
	};
};

/* -------------------------------------------------------------------------- //
 // imgO			:=  image Object to transform
 // points 		:=  the for edges of the target shape CCW from top left
 // 							pairwise as one-dimensional Array[ax,ay,bx,by,…,dx,dy]
 // callback	:=callback function(imgObject) is called when processing finished
 // -------------------------------------------------------------------------- */
pixjObj.prototype.freeTransform = function(imgO, points, quality, callback) {
	var i, ys, slices, th, sh, w;
	var tolerance = 2;
	var tcanvas = $("<canvas/>", {
		width : 400,
		height : 400
	});
	var tcontext = tcanvas[0].getContext('2d');
	tcanvas[0].width = Math.max(points[4], points[6]);
	tcanvas[0].height = Math.max(points[3], points[5]);

	// generic linear func, where a:=first point, b:=second point, xs:=x
	var linFaceY = function(xs, a, b) {
		return a[1] + (b[1] - a[1]) * ((xs - a[0]) / (b[0] - a[0]));
	};

	var linFaceX = function(ys, a, b) {
		return (b[0] - a[0]) * ((ys - a[1]) / (b[1] - a[1]) ) + a[0];
	};

	// it should be 4 points
	if (points.length != 8){
		throw "an array with 8 values for 4 points needed.";
	}
	
	// points should not fore rotation
	if ( 
			points[0] + 8 > points[6] ||
			points[2] + 8 > points[4]
		)
		throw "mirroring / rotating not allowed.";

	// check the points for not crossing the diagonal
	for ( i = 0; i < points.length; i += 2) {

		var pointBefore = points.slice((i - 2 < 0 ? i - 2 + points.length : i - 2), (i - 2 < 0 ? i - 2 + points.length : i - 2) + 2);

		var pointAfter = points.slice((i + 2 >= points.length ? i + 2 - points.length : i + 2), (i + 2 >= points.length ? i + 2 - points.length : i + 2) + 2);

		console.log();

		var ly = linFaceY(points[i], pointBefore, pointAfter);

		// if x_n-x_(n+1) > 0 => step right, p must be below
		// if x_n-x_(n+1) < 0 => step left , p must be above
		if ((pointBefore[0] - pointAfter[0] < 0 && ly - points[i + 1] > 0) || (pointBefore[0] - pointAfter[0] > 0 && ly - points[i + 1] < 0)) {
			throw "Point (" + points[i] + "," + points[i + 1] + ") is inside!";
		}
	}
	

	if (!quality || quality < 0 || quality > 1)
		quality = 1;
	
	slices = Math.max(points[3] - points[1], points[5] - points[7]) * quality;

	th = Math.max(points[3] - points[1], points[5] - points[7]) / slices + 1;

	sh = imgO.height / slices;
	w = imgO.width;

	// 'draw' the target shape and clip the image to it's bounds
	// just to reduce steps on border.
	tcontext.beginPath();
	tcontext.moveTo(points[0] + tolerance, points[1] + tolerance);
	tcontext.lineTo(points[2] + tolerance, points[3] - tolerance);
	tcontext.lineTo(points[4] - tolerance, points[5] - tolerance);
	tcontext.lineTo(points[6] - tolerance, points[7] + tolerance);
	tcontext.closePath();

	if (quality <= 0.0625) {
		tcontext.stroke();
	} else {
		tcontext.clip();

		for ( i = 0; i < slices - 1; i++) {
			var sy = i * imgO.height / slices;
			var ty = points[1] + ((points[3] - points[1]) / slices) * i;
			var y2 = points[7] + i * (points[5] - points[7]) / slices;

			var x2 = linFaceX(y2, points.slice(4, 6), points.slice(6, 8));
			var tx = linFaceX(ty, points.slice(0, 2), points.slice(2, 4));

			var tw = Math.sqrt(Math.pow(y2 - ty, 2) + Math.pow(x2 - tx, 2));

			var sin = (y2 - ty) / (x2 - tx);
			if (sin>1 || sin<=-1){
				throw "angle too big.";
			}
			var rot = Math.asin((y2 - ty) / (x2 - tx));
			tcontext.save();
			
			// to reset rotation save the context matrix
			tcontext.translate(tx, ty);
			tcontext.rotate(rot);

			tcontext.drawImage(
				imgO, // source picture
				0, 		// x-coord. in source picture to start at
				sy, 	// y-coord. in source picture to start at
				w, 		// width of the slice to read from source
				sh, 	// height -,,-
				0, 		// target x on context
				0, 		// target y -,,-
				tw, 	// target width -,,-
				th
			);

			tcontext.restore();
		}
	}


	// convert the new generated image to dataurl format
	// (http://en.wikipedia.org/wiki/Data_URI_scheme)
	dataURL = tcanvas[0].toDataURL();

	// create new image object and set the dataurl as source
	imgObj = new Image();
	imgObj.src = dataURL;

	imgObj.onload = function() {
		callback(imgObj);
	}
};

var pixj = new pixjObj(); 