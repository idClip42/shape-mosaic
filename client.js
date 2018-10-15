function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

let canvas;
let ctx;
let canvas2;
let ctx2;
let images = [];
let imgCount = 0;
let baseImg1;
let baseImg2;
let finalImg;
let baseImg2TransformSet = [];

let deltaTime = 0;
let previousTime = (new Date()).getTime();

let started = false;


const SKIP_SLIDESHOW = false;
const SHOW_FPS = false;
const PICS_AT_ONCE = 3;
const PIC_MULTIPLIER = 2;
const TOTAL_VIDEO_TIME = 174;   // in seconds

// const GET_SINGLE_IMAGE = true;
// const IMG_DIM_X = 6000;
// const IMG_DIM_Y = 4000;






// const CANVAS_WIDTH = 800;
// const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;


let TIME = {
    IMG_ENTER : 0,
    IMG_DISPLAY : 0,
    WAIT : 0,
    PHASE_2_DELAY : 10,
    PHASE_3_DELAY : 10,
    PIC_INTERVAL : 0.25,
    ALPHA_TIME : 1.5,
    FINAL_IMG_DELAY: 1,
    INIT_DELAY: 2,
};
const MOVE_SPEED_PHASE_1 = 0.2;
const MOVE_SPEED_PHASE_2 = 0.01;
const MOVE_SPEED_PHASE_3 = 0.005;
let moveSpeed = MOVE_SPEED_PHASE_1;

const setPicInterval = function(picCount){
    TIME.PIC_INTERVAL = (TOTAL_VIDEO_TIME - TIME.PHASE_2_DELAY - TIME.PHASE_3_DELAY - TIME.FINAL_IMG_DELAY) / (picCount / PICS_AT_ONCE);
    console.log("Pic Interval: " + TIME.PIC_INTERVAL);
};


const Transform = function(x, y, w, h){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.moveTo = function(dest, deltaTime){

        // if(dest.x > 1 || dest.x < 0)
        //     console.log("x", dest.x);
        // if(dest.y > 1 || dest.y < 0)
        //     console.log("y", dest.y);

        // Can we do some pythagoras stuff here? Maybe? Performance issues?
        // Don't need pythagoras - just ratios!
        let keys = ["x", "y", "w", "h"];
        let deltaX = dest.x - this.x;
        let deltaY = dest.y - this.y;
        let deltaW = dest.w - this.w;
        let deltaH = dest.h - this.h;
        let ratios = [1, Math.abs(deltaY/deltaX), 1, Math.abs(deltaH/deltaW)];
        // console.log(dest.y, this.y, deltaTime, moveSpeed, ratios.length);
        for(let k in keys){
            let key = keys[k];
            let ratio = ratios[k];
            if(isNaN(ratio))
                ratio = 1;
            // let ratio = 1;
            if(this[key] < dest[key]){
                this[key] += deltaTime * moveSpeed * ratio;
                if(this[key] > dest[key]) this[key] = dest[key];
                // console.log("a", key, this[key]);
            } else {
                this[key] -= deltaTime * moveSpeed * ratio;
                if(this[key] < dest[key]) this[key] = dest[key];
                // console.log("b", key, this[key]);
            }
        }
        // console.log(this.x, this.y, this.w, this.h);
    };
    this.lerp = function(start, end, perc){
        let keys = ["x", "y", "w", "h"];
        for(let k in keys){
            let key = keys[k];
            // console.log(this, start, end);
            // console.log(perc);
            this[key] = start[key] + (end[key] - start[key]) * perc;
        }
    };
    this.set = function(target){
        this.x = target.x;
        this.y = target.y;
        this.w = target.w;
        this.h = target.h;
    };
    this.compare = function(target){

        // if(this === imagePixels[0].currentPos)
        //     console.log(Math.abs(this.x - target.x), Math.abs(this.y - target.y), Math.abs(this.w - target.w), Math.abs(this.h - target.h));

        let equalish = function(a, b){
            // if(this === imagePixels[0].currentPos)
                // console.log(Math.abs(a-b));
            return Math.abs(a-b) < 0.00001;
        };

        // return (this.x == target.x &&
        // this.y == target.y &&
        // this.w == target.w &&
        // this.h == target.h);

        return (equalish(this.x, target.x) &&
        equalish(this.y, target.y) &&
        equalish(this.w, target.w) &&
        equalish(this.h, target.h));
    };
}

const Image = function(img, x, y, w, h){
    this.image = img;

    this.destPos = new Transform(x,y,w,h);
    this.startPos = new Transform(0,0,1,1);
    this.currentPos = new Transform(0,0,0,0);
    this.currentPos.set(this.destPos);
    this.percentageDist = 0;

    this.visible = false;
    this.alpha = 0;
    // this.stage = 0;         //0 nothing, 1 entry, 2 display, 3 relocate
};
let imagePixels = [];

const init = function(){
    baseImg1 = document.getElementById("base1");
    baseImg2 = document.getElementById("base2");
    finalImg = document.getElementById("final");
    document.getElementById("startButton").onclick = StartButton;
    document.getElementById("imgButton").onclick = singleImage;

    // httpGetAsync("imageList", function(res){
    //     let photoDiv = document.getElementById("photos");
    //     photoDiv.innerHTML = res;
    //     images = photoDiv.getElementsByTagName("img");
    //     imgCount = res.split("src").length - 1;
    //     console.log(imgCount + " images")
    //     initCanvas();
    // });
}
// window.onload = init;
httpGetAsync("imageList", function(res){
    let photoDiv = document.getElementById("photos");
    photoDiv.innerHTML = res;
    images = photoDiv.getElementsByTagName("img");
    imgCount = res.split("src").length - 1;
    console.log(imgCount + " images")

    window.onload = function(){
        let loading = document.getElementById("loading");
        loading.parentElement.removeChild(loading);
        init();
        initCanvas();
    };
});



const GetImagePixelLocations = function(baseImg){
    const CUTOFF = 150;
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    ctx.drawImage(baseImg,0,0,canvas.width,canvas.height);

    const totalPixels = canvas.width * canvas.height;
    let goodPixels = 0;

    for(let y = 0; y < canvas.height; ++y){
        for(let x = 0; x < canvas.width; ++x){
            let pixel = ctx.getImageData(x, y, 1, 1).data; 
            pixel = (pixel[0] + pixel[1] + pixel[2]) / 3;
            if (pixel > CUTOFF)
                ++goodPixels;
        }
    }

    let percentage = goodPixels / totalPixels;
    const imageCount = images.length * PIC_MULTIPLIER;
    const totalNewPix = imageCount / percentage;

    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    const coeff = Math.sqrt(totalNewPix/ratio);
    const newPixColumns = Math.floor(coeff * ratio);
    const newPixRows = Math.floor(coeff);
    const newPixWidth = 1/newPixColumns;
    const newPixHeight = 1/newPixRows;

    let resultArray = [];

    for(let y = 0; y < newPixRows; ++y){
        for(let x = 0; x < newPixColumns; ++x){
            let pixel = ctx.getImageData(
                x/newPixColumns * canvas.width, 
                y/newPixRows * canvas.height,
                1, 1).data;
            pixel = (pixel[0] + pixel[1] + pixel[2]) / 3;

            if (pixel > CUTOFF)
                resultArray.push(new Transform(x * newPixWidth, y * newPixHeight, newPixWidth, newPixHeight));
        }
    }

    return resultArray;
}

const SetUpImagePixels = function(baseImg){
    let imgCounter = 0;
    let transformArray = GetImagePixelLocations(baseImg);   // This just needs more spots
    for(let i in transformArray){
        let img = images[imgCounter];
        let t = transformArray[i];
        imgCounter = (imgCounter + 1) % images.length;
        let imgPx = new Image(img, t.x, t.y, t.w, t.h);
        imgPx.startPos = getImgFullscreenScale(img);
        imagePixels.push(imgPx);
    }

    console.log(imagePixels.length + " Image Pixels vs " + images.length + " input images");
    if(imagePixels.length < images.length)
        console.warn("WARNING! NOT ALL PICTURES USED! RESIZE THE THING!");
    imagePixels = shuffle(imagePixels);
    console.log("image pixels shuffled");

    setPicInterval(imagePixels.length);

    document.getElementById("startButton").disabled = false;
    document.getElementById("imgButton").disabled = false;
};



const initCanvas = function(){
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas2 = document.getElementById("canvas2");
    ctx2 = canvas2.getContext("2d");

    ctx.imageSmoothingEnabled = false;

    SetUpImagePixels(baseImg1);
    baseImg2TransformSet = shuffle(GetImagePixelLocations(baseImg2));

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.imageSmoothingEnabled = true;

    canvas2.width = CANVAS_WIDTH;
    canvas2.height = CANVAS_HEIGHT;
    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    // if(GET_SINGLE_IMAGE === false)
    update();
}

const singleImage = () =>{
    canvas.width = document.getElementById("pic-width").value;
    canvas.height = document.getElementById("pic-height").value;

    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle="black";
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    for(let i in imagePixels){
        let img = imagePixels[i];
        let w = img.currentPos.w * canvas.width;
        let h = img.currentPos.h * canvas.height;
        let x = img.currentPos.x * canvas.width;
        let y = img.currentPos.y * canvas.height;
        try{
            ctx.drawImage(img.image,x,y,w,h);
        } catch(err){
            // console.log(img.image);
        }
    }

    var dataURL = canvas.toDataURL();
    document.getElementById("canvasImg").src = dataURL;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
};

const update = () => {
    requestAnimationFrame(update);
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle="black";
    ctx.globalAlpha = 1;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(canvas2, 0, 0, canvas.width, canvas.height);

    let currentTime = (new Date()).getTime();
    deltaTime = (currentTime - previousTime) / 1000;
    previousTime = currentTime;
    let fps = Math.round(1 / deltaTime);
    
    for(let i in imagePixels){

        // if(imagePixels[i].image === finalImg)
        //     console.log(imagePixels[i].alpha, imagePixels[i].visible);

        if(started === true && imagePixels[i].visible === false)
            continue;

        if(started === true && imagePixels[i].currentPos.compare(imagePixels[i].destPos) &&  (imagePixels[i].alpha === 1))
            continue;

        // console.log(imagePixels[i].alpha);
        if(started === true)
            AnimateImage(imagePixels[i], deltaTime);

        let img = imagePixels[i];
        ctx.globalAlpha = (started) ? img.alpha : 1;
        let w = img.currentPos.w * canvas.width;
        let h = img.currentPos.h * canvas.height;
        let x = img.currentPos.x * canvas.width;
        let y = img.currentPos.y * canvas.height;

        try{
            ctx.drawImage(img.image,x,y,w,h);
        } catch(err){
            // console.log(img.image);
        }

    }

    if(SHOW_FPS){
        ctx.globalAlpha = 1;
        ctx.font="12px Arial";
        ctx.fillStyle="white";
        ctx.fillText(fps,10,10);
    }
};

const StartButton = function(){
    // if(GET_SINGLE_IMAGE === true){
    //     singleImage();
    //     return;
    // }
    started = true;
    document.getElementById("startButton").disabled = true;
    if(SKIP_SLIDESHOW === false)
        // ScheduleImages();
        setTimeout(ScheduleImages, TIME.INIT_DELAY * 1000)
    else{
        for(let i in imagePixels){
            imagePixels[i].visible = true;
            imagePixels[i].alpha = 1;
            imagePixels[i].stage = 3;
        }
        // Phase2();
        setTimeout(Phase2, TIME.INIT_DELAY * 1000)
    }    
};

const AnimateImage = function(imgPx, deltaTime){

    // let percChange = deltaTime / TIME.IMG_ENTER;
    let percChange = deltaTime / TIME.ALPHA_TIME;
    // console.log(percChange);

    // switch (imgPx.stage){
        // case 1:
            let before = imgPx.currentPos.compare(imgPx.destPos) && (imgPx.alpha === 1);
            imgPx.alpha += percChange;
            if(imgPx.alpha > 1) imgPx.alpha = 1;
            // console.log(imgPx.alpha);
            // break;
            imgPx.percentageDist += moveSpeed * deltaTime;
            if(imgPx.percentageDist > 1) imgPx.percentageDist = 1;
        // case 3:
            // imgPx.currentPos.moveTo(imgPx.destPos, deltaTime);
            imgPx.currentPos.lerp(imgPx.startPos, imgPx.destPos, imgPx.percentageDist);
            let after = imgPx.currentPos.compare(imgPx.destPos) && (imgPx.alpha === 1);
            if(before === false && after == true)
                DrawToSecondCanvas(imgPx);
            // break;
    // }
};

const DrawToSecondCanvas = function(img){
    let w = img.currentPos.w * canvas.width;
    let h = img.currentPos.h * canvas.height;
    let x = img.currentPos.x * canvas.width;
    let y = img.currentPos.y * canvas.height;
    try{
        ctx2.drawImage(img.image,x,y,w,h);
    } catch(err){
        console.log("Error drawing image");
        console.log(img.image);
    }
    img.alpha = 1;
};

const ScheduleImages = function(){
    let counter = 0;
    let loop;
    // const totalTime = TIME.IMG_ENTER + TIME.IMG_DISPLAY + TIME.WAIT;
    loop = setInterval(function(){

        for(let atOnce = 0; atOnce < PICS_AT_ONCE; ++atOnce){
            let img = imagePixels[counter];
            ++counter;

            img.visible = true;
            img.currentPos.set(img.startPos);
            // img.alpha = 0;
            // ++img.stage;
            // setTimeout(function(){
            //     ++img.stage;
            //     setTimeout(function(){
            //         ++img.stage;
            //     }, TIME.IMG_DISPLAY * 1000);
            // }, TIME.IMG_ENTER * 1000);

            if(counter >= imagePixels.length){
                clearInterval(loop);
                setTimeout(Phase2, TIME.PHASE_2_DELAY * 1000);
                break;
            }
        }
    // }, totalTime * 1000);
    }, TIME.PIC_INTERVAL * 1000);
};

const Phase2 = function(){

    moveSpeed = MOVE_SPEED_PHASE_2;

    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    for(let i in imagePixels){
        let img = imagePixels[i];
        let tr = baseImg2TransformSet[i % baseImg2TransformSet.length];
        img.destPos = tr;
        img.startPos = img.currentPos;
        img.percentageDist = 0;
    }

    setTimeout(Phase3, TIME.PHASE_3_DELAY * 1000);
};

const Phase3 = function(){

    moveSpeed = MOVE_SPEED_PHASE_3;

    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    for(let i in imagePixels){
        let img = imagePixels[i];
        let angle = Math.random()*Math.PI*2;
        let radius = 2;
        // let rX = (Math.random() - 0.25);
        // rX += (rX > 0) ? 1 : 0;
        // rX *= 2;
        let rX = Math.cos(angle)*radius;
        // let rY = (Math.random() - 0.25);
        // rY += (rY > 0) ? 1 : 0;
        // rY *= 2;
        let rY = Math.sin(angle)*radius;
        
        let tr = new Transform(rX, rY, img.currentPos.w, img.currentPos.h);
        // console.log(rX);
        img.destPos = tr;
        img.startPos = img.currentPos;
        img.percentageDist = 0;
    }
    
    setTimeout(Phase4, TIME.FINAL_IMG_DELAY * 1000);

};

const Phase4 = function(){
    // console.log("Phase 4");

    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    // let img = images[imgCounter];
    // let t = transformArray[i];
    // imgCounter = (imgCounter + 1) % images.length;
    let t = getImgFullscreenScale(finalImg, false);
    t.x += t.w / 6;
    let imgPx = new Image(finalImg, t.x, t.y, t.w, t.h);
    imgPx.startPos = imgPx.destPos
    imgPx.currentPos = imgPx.destPos;
    imgPx.visible = true;
    imagePixels.push(imgPx);
};

// Switch to different image, then have everyone fly away

const shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

const getImgFullscreenScale = function(img, random = true){
    let w = img.width;
    let h = img.height;
    // let ratio = Math.max(w, h) / Math.min(w, h);
    // let coeff = 1;
    // let canvasRatio = Math.max(canvas.width, canvas.height) / Math.min(canvas.width, canvas.height);
    // let canvasCoeff = 1;
    let finalWidth = 1;
    let finalHeight = 1;
    let randomX = 0;
    let randomY = 0;

    // console.log(ratio, coeff, canvasRatio, canvasCoeff);

    // if(h > w){
    //     finalHeight = 1;
    //     // finalWidth = 
    //     // final width will be 50% of 150%, so math that out
    // }

    finalWidth = (w/h) / (CANVAS_WIDTH/CANVAS_HEIGHT);

    if(random){
        finalHeight *= 1/2;
        finalWidth *= 1/2;
        randomX = Math.random() * (1 - finalWidth);
        randomY = Math.random() * (1 - finalHeight);
    }

    // console.log((w/h), CANVAS_WIDTH, CANVAS_HEIGHT, (CANVAS_WIDTH/CANVAS_HEIGHT), finalWidth);


    let transform = new Transform(randomX,randomY,finalWidth,finalHeight);
    return transform;
};