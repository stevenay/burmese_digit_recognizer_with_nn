// Credited to http://myselph.de/neuralNet.html
var preprocessing = true
var scaleStrokeWidth = true

var canvas
var ctx

var prevX = 0
var currX = 0
var prevY = 0
var currY = 0
var paths = [] // recording paths
var paintFlag = false
var color = 'black'
var lineWidth = 20

var clearBeforeDraw = false // controls whether canvas will be cleared on next mousedown event. Set to true after digit recognition

// computes center of mass of digit, for centering
// note 1 stands for black (0 white) so we have to invert.
function centerImage(img) {
    var meanX = 0
    var meanY = 0
    var rows = img.length
    var columns = img[0].length
    var sumPixels = 0
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < columns; x++) {
            var pixel = 1 - img[y][x] // invert the image
            sumPixels += pixel
            meanY += y * pixel
            meanX += x * pixel
        }
    }
    meanX /= sumPixels
    meanY /= sumPixels

    var dY = Math.round(rows / 2 - meanY)
    var dX = Math.round(columns / 2 - meanX)
    return { transX: dX, transY: dY }
}

// given grayscale image, find bounding rectangle of digit defined
// by above-threshold surrounding
function getBoundingRectangle(img, threshold) {
    var rows = img.length
    var columns = img[0].length
    var minX = columns
    var minY = rows
    var maxX = -1
    var maxY = -1
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < columns; x++) {
            if (img[y][x] < threshold) {
                if (minX > x) minX = x
                if (maxX < x) maxX = x
                if (minY > y) minY = y
                if (maxY < y) maxY = y
            }
        }
    }
    return { minY: minY, minX: minX, maxY: maxY, maxX: maxX }
}

// take canvas image and convert to grayscale. Mainly because my
// own functions operate easier on grayscale, but some stuff like
// resizing and translating is better done with the canvas functions
function imageDataToGrayscale(imgData) {
    var grayscaleImg = []
    for (var y = 0; y < imgData.height; y++) {
        grayscaleImg[y] = []
        for (var x = 0; x < imgData.width; x++) {
            var offset = y * 4 * imgData.width + 4 * x
            var alpha = imgData.data[offset + 3]
            // weird: when painting with stroke, alpha == 0 means white;
            // alpha > 0 is a grayscale value; in that case I simply take the R value
            if (alpha == 0) {
                imgData.data[offset] = 255
                imgData.data[offset + 1] = 255
                imgData.data[offset + 2] = 255
            }
            imgData.data[offset + 3] = 255
            // simply take red channel value. Not correct, but works for
            // black or white images.
            // normalize the color units
            grayscaleImg[y][x] = imgData.data[y * 4 * imgData.width + x * 4 + 0] / 255
        }
    }
    return grayscaleImg
}

// takes the image in the canvas, centers & resizes it, then puts into 10x10 px bins
function recognize() {
    var t1 = new Date();

    // convert RGBA image to a grayscale array, then compute bounding rectangle and center of mass  
    var imgData = ctx.getImageData(0, 0, 280, 280);
    grayscaleImg = imageDataToGrayscale(imgData); // change to grayscale and normalized it
    var boundingRectangle = getBoundingRectangle(grayscaleImg, 0.01);
    var trans = centerImage(grayscaleImg); // [dX, dY] to center of mass and inverse the colors

    // copy image to hidden canvas, translate to center-of-mass, then
    // scale to fit into a 200x200 box (see MNIST calibration notes on
    // Yann LeCun's website)
    var canvasCopy = document.createElement("canvas");
    // document.body.append(canvasCopy);
    canvasCopy.width = imgData.width;
    canvasCopy.height = imgData.height;
    var copyCtx = canvasCopy.getContext("2d");
    var brW = boundingRectangle.maxX + 1 - boundingRectangle.minX;
    var brH = boundingRectangle.maxY + 1 - boundingRectangle.minY;
    var scaling = 190 / (brW > brH ? brW : brH);
    console.log(scaling)

    // scale
    copyCtx.translate(canvas.width / 2, canvas.height / 2);
    copyCtx.scale(scaling, scaling);
    copyCtx.translate(-canvas.width / 2, -canvas.height / 2);

    // translate to center of mass
    copyCtx.translate(trans.transX, trans.transY);

    if (scaleStrokeWidth) {
        // redraw the image with a scaled lineWidth first.
        // not this is a bit buggy; the bounding box we computed above (which contributed to "scaling") is not valid anymore because
        // the line width has changed. This is mostly a problem for extreme cases (very small digits) where the rescaled digit will
        // be smaller than the bounding box. I could change this but it'd screw up the code.
        for (var p = 0; p < paths.length; p++) {
            for (var i = 0; i < paths[p][0].length - 1; i++) {
                var x1 = paths[p][0][i];
                var y1 = paths[p][1][i];
                var x2 = paths[p][0][i + 1];
                var y2 = paths[p][1][i + 1];
                draw(copyCtx, color, lineWidth / scaling, x1, y1, x2, y2);
            }
        }
    } else {
        // default take image from original canvas
        copyCtx.drawImage(ctx.canvas, 0, 0);
    }


    // now bin image into 10x10 blocks (giving a 28x28 image)
    imgData = copyCtx.getImageData(0, 0, 280, 280);
    grayscaleImg = imageDataToGrayscale(imgData);
    var nnInput = new Array(784);
    for (var y = 0; y < 28; y++) {
        for (var x = 0; x < 28; x++) {
            var mean = 0;
            for (var v = 0; v < 10; v++) {
                for (var h = 0; h < 10; h++) {
                    mean += grayscaleImg[x * 10 + v][y * 10 + h];
                }
            }
            mean = (1 - mean / 100); // average
            nnInput[x * 28 + y] = mean;
        }
    }

    // for visualization/debugging: paint the input to the neural net.
    if (preprocessing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(copyCtx.canvas, 0, 0);
        for (var x = 0; x < 28; x++) {
            for (var y = 0; y < 28; y++) {
                var block = ctx.getImageData(x, y, 1, 1);
                var newVal = 255 * (nnInput[y * 28 + x]);
                for (var i = 0; i < 4; i += 4) {
                    block.data[i] = newVal;
                    block.data[i + 1] = newVal;
                    block.data[i + 2] = newVal;
                    block.data[i + 3] = 255;
                }
                ctx.putImageData(block, x, y);
            }
        }
    }

    //for copy & pasting the digit into matlab
    document.getElementById('nnInput').innerHTML = JSON.stringify(nnInput);
    var maxIndex = 0;

    var nnOutput = networkActivate(nnInput);
    nnOutput.reduce(function (p, c, i) { if (p < c) { maxIndex = i; return c; } else return p; });
    document.getElementById('nnOut').innerHTML = maxIndex;

    clearBeforeDraw = true;
    var dt = new Date() - t1;
    console.log('recognize time: ' + dt + 'ms');
}

function init() {
    canvas = document.getElementById('can');
    ctx = canvas.getContext("2d");

    canvas.addEventListener("mousemove", function (e) {
        findxy('move', e)
    }, false);
    canvas.addEventListener("mousedown", function (e) {
        findxy('down', e)
    }, false);
    canvas.addEventListener("mouseup", function (e) {
        findxy('up', e)
    }, false);
    canvas.addEventListener("mouseout", function (e) {
        findxy('out', e)
    }, false);
}

// draws a line from (x1, y1) to (x2, y2) with nice rounded caps
function draw(ctx, color, lineWidth, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

function erase() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('nnOut').innerHTML = '';
}

function findxy(res, e) {
    if (res == 'down') {
        if (clearBeforeDraw == true) {
          ctx.clearRect(0,0,canvas.width,canvas.height);
          document.getElementById('nnInput').innerHTML='';
        //   document.getElementById('nnOut').innerHTML='';
          paths = [];
          clearBeforeDraw = false;
        }
        
        if (e.pageX != undefined && e.pageY != undefined) {
          currX = e.pageX-canvas.offsetLeft;
          currY = e.pageY-canvas.offsetTop;
        } else {
          currX = e.clientX + document.body.scrollLeft
                  + document.documentElement.scrollLeft
                  - canvas.offsetLeft;
          currY = e.clientY + document.body.scrollTop
                  + document.documentElement.scrollTop
                  - canvas.offsetTop;
        }
        //draw a circle
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.arc(currX,currY,lineWidth/2,0,2*Math.PI);
        ctx.stroke();
        ctx.closePath();
        ctx.fill();
        
        paths.push([[currX], [currY]]);
        paintFlag = true;
    }
    if (res == 'up' || res == "out") {
        paintFlag = false;
        //console.log(paths);
    }
    
    if (res == 'move') {
        if (paintFlag) {
            // draw a line to previous point
            prevX = currX;
            prevY = currY;
            if (e.pageX != undefined && e.pageY != undefined) {
              currX = e.pageX-canvas.offsetLeft;
              currY = e.pageY-canvas.offsetTop;
            } else {
              currX = e.clientX + document.body.scrollLeft
                      + document.documentElement.scrollLeft
                      - canvas.offsetLeft;
              currY = e.clientY + document.body.scrollTop
                      + document.documentElement.scrollTop
                      - canvas.offsetTop;
            }
            currPath = paths[paths.length-1];
            currPath[0].push(currX);
            currPath[1].push(currY);
            paths[paths.length-1] = currPath;
            draw(ctx, color, lineWidth, prevX, prevY, currX, currY);
        }
    }
}