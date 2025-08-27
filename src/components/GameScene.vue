  <template>
    <div class="video-container">
      <LoadingComp v-if="!isGameOver && !isGameStarted" :is-game-scene-ready="isGameSceneReady" />
      <GameOver v-if="isGameOver" />
      <video ref="videoEl" autoplay playsinline style="transform: rotateY(180deg); position: absolute;"
        :class="{ 'blur': isGameOver }"></video>
      <canvas ref="canvasEl" :class="{ 'blur': isGameOver }" style="position: absolute;"></canvas>
    </div>
  </template>

<script lang="ts" setup>
import { DrawingUtils, FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { GameManager, gameSceneSize, isGameStarted, isGameOver } from 'src/scripts/GameManager';
import { onMounted, ref, watch } from 'vue';
import LoadingComp from './LoadingComp.vue';
import GameOver from './GameOver.vue';

// let gestureRecognizer: GestureRecognizer;
let handLandmarker: HandLandmarker;
const videoEl = ref<HTMLVideoElement>()
const canvasEl = ref<HTMLCanvasElement>()
let canvasCtx: CanvasRenderingContext2D;

let runningMode: 'IMAGE' | 'VIDEO' = "IMAGE";
let gameManager: GameManager

const isGameSceneReady = ref(false)

onMounted(async () => {

  canvasCtx = canvasEl.value?.getContext('2d')!
  if (!canvasCtx) {
    alert('error when trying to set canvas context')
  }

  await createHandLandmarker()

  enableCam()

  window.addEventListener('resize', setGameScreenSize)
  videoEl.value!.addEventListener("loadeddata", setGameScreenSize);

})

watch(() => isGameStarted.value, (isGameStarted) => {
  if (isGameStarted) {
    gameManager = new GameManager(canvasCtx)
    gameManager.addBubbleLoop()
  }
})

async function createHandLandmarker() {
  // download url: https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/
  const vision = await FilesetResolver.forVisionTasks(
    "models/tasks-vision@0.10.18"
  );

  // download url: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `models/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 20
  });
}

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

let mediaTrackSettings: MediaTrackSettings
let webcamRunning = false;
// Enable the live webcam view and start detection.
async function enableCam() {

  if (!hasGetUserMedia()) {
    console.log('no webcam detected')
    alert('no webcam detected')
    return
  }

  if (!handLandmarker) {
    console.log("Please wait for handLandmarker to load");
    alert("Please wait for handLandmarker to load");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    // enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    // enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });

  const videoTrack = stream.getVideoTracks()[0];
  mediaTrackSettings = videoTrack.getSettings();

  // console.log(aspectRatio, width, height)

  // const maxWidth = width! / document.body.clientWidth
  const { aspectRatio, width, height } = mediaTrackSettings
  // console.log(maxWidth)

  // const videoRect = videoEl.value?.getBoundingClientRect()
  // canvasEl.value!.style.width = videoRect?.width + 'px';
  // canvasEl.value!.style.height = videoRect?.height + 'px';
  // canvasEl.value!.style.left = videoRect?.left + 'px'

  // Activate the webcam stream.
  videoEl.value!.srcObject = stream;
  videoEl.value?.play()
  // videoEl.value!.addEventListener("loadeddata", predictWebcam);
  videoEl.value!.addEventListener("loadeddata", () => {
    window.requestAnimationFrame(predictWebcam);
  });
}

function setGameScreenSize() {
  const videoElRect = videoEl.value?.getBoundingClientRect();

  // Update canvas internal dimensions to match displayed size
  canvasEl.value!.width = videoEl.value!.videoWidth;
  canvasEl.value!.height = videoEl.value!.videoHeight;

  gameSceneSize.value.width = videoEl.value!.videoWidth;
  gameSceneSize.value.height = videoEl.value!.videoHeight;


  isGameSceneReady.value = true;
}

let lastVideoTime = -1;
let results: HandLandmarkerResult;
// const videoHeight = "480px";
// const videoWidth = "640px";
async function predictWebcam(timestamp: number) {
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let nowInMs = Date.now();
  if (videoEl.value!.currentTime !== lastVideoTime) {
    lastVideoTime = videoEl.value!.currentTime;
    results = handLandmarker.detectForVideo(videoEl.value!, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasEl.value!.width, canvasEl.value!.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  // gameManager.airBalloons.forEach(airBalloon => {
  //   drawBalloon(airBalloon.position)
  // })

  // results.landmarks.forEach(landmarks => landmarks.forEach(landmark => checkIfIsHit(landmark)))

  let landmarksForGameLoop: NormalizedLandmark[][] = []
  if (results.landmarks) {
    let i = 0
    for (const landmarks of results.landmarks) {


      // if landmark touches smt then trigger it
      // landmarks.forEach(landmark => checkIfIsHit(landmark))

      // console.log(landmarks[0].x * 640)
      // console.log(landmarks[0].y)
      // const asd = isPointInCircle({ x: landmarks[0].x, y: landmarks[0].y }, { x: 0.2, y: 0.2 }, 0.4)
      // console.log(asd)
      // if (!asd) {
      //   drawBalloon(50, 50)
      // }
      // drawingUtils.drawConnectors(
      //   landmarks,
      //   GestureRecognizer.HAND_CONNECTIONS,
      //   {
      //     color: "#00FF00",
      //     lineWidth: 5
      //   }
      // );
      // console.log(landmarks)

      // const landmark = [landmarks[8]]
      const landmarksToUse = landmarks.filter((_, index) => [8, 12, 16, 20].includes(index))
      landmarksForGameLoop.push(landmarksToUse)
      drawingUtils.drawLandmarks(landmarksToUse, {
        color: "#FF0000",
        lineWidth: 2
      });
    }
  }

  gameManager?.runGameLoop(timestamp, landmarksForGameLoop)

  canvasCtx.restore();

  // if (results.gestures.length > 0) {
  //   gestureOutput.style.display = "block";
  //   gestureOutput.style.width = videoWidth;
  //   const categoryName = results.gestures[0][0].categoryName;
  //   const categoryScore = parseFloat(
  //     results.gestures[0][0].score * 100
  //   ).toFixed(2);
  //   const handedness = results.handednesses[0][0].displayName;
  //   gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
  // } else {
  //   gestureOutput.style.display = "none";
  // }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: cadetblue;
  text-align: center;
  overflow: hidden;
}

.video-container video,
.video-container canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-container video {
  transform: rotateY(180deg);
}

.video-container canvas {
  transform: rotateY(180deg);
}

.blur {
  filter: blur(20px);
  transition: 4s all;
}
</style>
