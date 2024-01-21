function otsu(histogram, total) {
  //copy from wiki
  var sum = 0;
  for (var i = 1; i < 256; ++i) sum += i * histogram[i];
  var sumB = 0;
  var wB = 0;
  var wF = 0;
  var mB;
  var mF;
  var max = 0.0;
  var between = 0.0;
  var threshold1 = 0.0;
  var threshold2 = 0.0;
  for (var i = 0; i < 256; ++i) {
    wB += histogram[i];
    if (wB == 0) continue;
    wF = total - wB;
    if (wF == 0) break;
    sumB += i * histogram[i];
    mB = sumB / wB;
    mF = (sum - sumB) / wF;
    between = wB * wF * (mB - mF) * (mB - mF);
    if (between >= max) {
      threshold1 = i;
      if (between > max) {
        threshold2 = i;
      }
      max = between;
    }
  }
  return (threshold1 + threshold2) / 2.0;
}

function calculateHistogram(data) {
  var histogram = new Array(256).fill(0);

  for (var i = 0; i < data.length; i += 4) {
    var grayValue = (data[i] + data[i + 1] + data[i + 2]) / 3;
    histogram[Math.floor(grayValue)]++;
  }

  return histogram;
}

function Contrast(data, histogram, totalPixels) {
  var cdf = new Array(256).fill(0);
  for (var i = 0; i < 256; i++) {
    if (i == 0) {
      cdf[i] = histogram[i] / totalPixels;
    } else {
      cdf[i] = histogram[i] / totalPixels + cdf[i - 1];
    }
  }
  for (var i = 0; i < data.length; i += 4) {
    data[i] = cdf[data[i]] * 255;
    data[i + 1] = cdf[data[i + 1]] * 255;
    data[i + 2] = cdf[data[i + 2]] * 255;
  }
}
function binarizeImage(data, threshold) {
  for (var i = 0; i < data.length; i += 4) {
    var binaryValue = data[i] < threshold ? 0 : 255;

    data[i] = binaryValue;
    data[i + 1] = binaryValue;
    data[i + 2] = binaryValue;
  }
}

function grayer(data) {
  for (var i = 0; i < data.length; i += 4) {
    var grayValue = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = grayValue;
    data[i + 1] = grayValue;
    data[i + 2] = grayValue;
  }
}

function generateDownloadLink(data) {
  var binaryCanvas = document.getElementById("binaryCanvas");
  var downloadLink = document.getElementById("downloadLink");

  var ctx = binaryCanvas.getContext("2d");
  ctx.putImageData(data, 0, 0);

  var imageDataURL = binaryCanvas.toDataURL("image/png");

  downloadLink.href = imageDataURL;
  downloadLink.onclick = function () {
    var a = document.createElement("a");
    a.href = imageDataURL;
    a.download = "processed_image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  downloadLink.style.display = "block";
}

function sharpener(data, imageWidth, imageHeight) {
  var originalData = new Uint8ClampedArray(data);
  for (var i = 0; i < data.length; i += 4) {
    var filter08 = 0;
    var filter04 = 0;
    var filter05 = originalData[i];
    var filter06 = 0;
    var filter02 = 0;
    if (data[i - imageWidth * 4] != null) {
      filter08 = -originalData[i - imageWidth * 4];
    }
    if (data[i - 4] != null) {
      filter04 = -originalData[i - 4];
    }
    if (data[i + 4] != null) {
      filter06 = -originalData[i + 4];
    }
    if (data[i + imageWidth * 4] != null) {
      filter02 = -originalData[i + imageWidth * 4];
    }

    filtered = filter05 * 5 + filter02 + filter04 + filter06 + filter08;
    data[i] = filtered;
    data[i + 1] = filtered;
    data[i + 2] = filtered;
  }
}

function guassianFilter(data, imageWidth) {
  var guassianfilter = [
    1 / 16,
    1 / 8,
    1 / 16 /* 1 , 2 , 1 */,
    1 / 8 /*  2 , 4 , 2 */,
    1 / 4 /*  1 , 2 , 1 */,
    1 / 8,
    1 / 16,
    1 / 8,
    1 / 16,
  ];
  var G_filtered;
  var originalData = new Uint8ClampedArray(data);

  for (var index = 0; index < data.length; index += 4) {
    for (var row = -1; row <= 1; row++) {
      for (var col = -1; col <= 1; col++) {
        var pixelIndex = index + row * imageWidth * 4 + col * 4;
        if (originalData[pixelIndex] != undefined) {
          G_filtered +=
            originalData[pixelIndex] *
            guassianfilter[(row + 1) * 3 + (col + 1)];
        }
      }
    }
    data[index] = G_filtered;
    data[index + 1] = G_filtered;
    data[index + 2] = G_filtered;
    G_filtered = 0;
  }
}

var imageUpload = document.getElementById("imageUpload");
var originalImage = document.getElementById("originalImage");
var binaryCanvas = document.getElementById("binaryCanvas");
var ctx = binaryCanvas.getContext("2d");

imageUpload.addEventListener("change", function () {
  var file = imageUpload.files[0];

  if (file) {
    var reader = new FileReader();

    reader.onload = function (e) {
      var imageDataUrl = e.target.result;
      originalImage.src = imageDataUrl;

      originalImage.onload = function () {
        var imageWidth = originalImage.width;
        binaryCanvas.width = imageWidth;
        var imageHeight = originalImage.height;
        binaryCanvas.height = imageHeight;
        var totalPixels = imageWidth * imageHeight;

        ctx.drawImage(originalImage, 0, 0, imageWidth, imageHeight);

        var imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
        var data = imageData.data;

        var histogram = calculateHistogram(data);

        var threshold = otsu(histogram, totalPixels);
        grayer(data);
        guassianFilter(data, imageWidth);
        sharpener(data, imageWidth, imageHeight, threshold);
        // Contrast(data, histogram, totalPixels);
        binarizeImage(data, threshold);
        generateDownloadLink(imageData);
        ctx.putImageData(imageData, 0, 0); //
        const img = binaryCanvas.toDataURL("image/png");
        document.getElementById("originalImage").src = img;
      };
    };

    reader.readAsDataURL(file);
  }
});
