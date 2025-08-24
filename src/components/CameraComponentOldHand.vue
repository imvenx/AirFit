<template>
  <div>
    <video ref="video" width="640" height="480" autoplay playsinline style="display: none;"></video>
    <canvas ref="canvas" width="640" height="480" style="background-color: gray;"></canvas>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { setBackend } from '@tensorflow/tfjs';
// import { Keypoint, Pose, PoseDetector, SupportedModels, createDetector, movenet, util } from '@tensorflow-models/pose-detection';
import { triggerPoses } from 'src/services/PoseService';
import { handKeypointName, poseKeypointName } from 'src/models/models';
import { Hand, createDetector, SupportedModels, HandDetector } from '@tensorflow-models/hand-pose-detection';
import { Keypoint, PoseDetector } from '@tensorflow-models/pose-detection';

// import '@tensorflow/tfjs-backend-webgl';

const video = ref<any>(null);
const canvas = ref<HTMLCanvasElement>();

let ctx: any = null;
let detector: HandDetector | null = null;


let animationFrameId: any = null;

onMounted(async () => {
  await setBackend('webgl');


  detector = await createDetector(
    SupportedModels.MediaPipeHands,
    {
      runtime: 'tfjs',
      modelType: 'lite'
    }
  );

  await setupCamera();

  ctx = canvas.value!.getContext('2d');

  detectHands();
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (detector) {
    detector.dispose();
  }
});

async function setupCamera() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    video.value.srcObject = stream;
    return new Promise((resolve) => {
      video.value.onloadedmetadata = () => {
        video.value.play();
        resolve(video.value);
      };
    });
  } else {
    alert('Camera not available.');
  }
}

function drawBalloon(x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, 2 * Math.PI);
  ctx.stroke();
}

async function detectHands() {
  animationFrameId = requestAnimationFrame(detectHands);

  if (video.value.readyState < 2) {
    return;
  }

  const hands = await detector?.estimateHands(video.value);

  ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
  ctx.drawImage(video.value, 0, 0, canvas.value!.width, canvas.value!.height);

  console.log(hands?.[0])
  if (hands && hands.length > 0) {
    drawResult(hands[0]);
    // triggerPoses(hands[0])
  }
}

function drawResult(hands: Hand) {
  if (hands.keypoints) {
    drawKeypoints(hands.keypoints);
    // drawSkeleton(pose.keypoints);
  }
}

// function drawKeypoints(keypoints: Keypoint[]) {
//   const radius = 5;
//   keypoints.forEach((keypoint: Keypoint) => {
//     if (keypoint.score && keypoint.score > 0.1) {
//       const { x, y } = keypoint;
//       ctx.beginPath();
//       ctx.arc(x, y, radius, 0, 2 * Math.PI);
//       ctx.fillStyle = 'blue'; // Change color for hand keypoints
//       ctx.fill();
//     }
//   });
// }

function drawKeypoints(keypoints: Keypoint[]) {
  const radius = 5;

  keypoints.forEach((keypoint: Keypoint) => {
    if (keypoint.name == handKeypointName.middle_finger_mcp) {
      drawBalloon(keypoint.x, keypoint.y)
    }
    if (keypoint.score && keypoint.score > 0.1) {
      const { x, y } = keypoint;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  });
}

// function drawSkeleton(keypoints: Keypoint[]) {
//   const adjacentPairs = util.getAdjacentPairs(
//     SupportedModels.MoveNet
//   );

//   ctx.strokeStyle = 'green';
//   ctx.lineWidth = 2;

//   adjacentPairs.forEach(([i, j]) => {
//     const kp1 = keypoints[i];
//     const kp2 = keypoints[j];

//     if (kp1.score && kp2.score &&
//       kp1.score > 0.5 && kp2.score > 0.5) {
//       ctx.beginPath();
//       ctx.moveTo(kp1.x, kp1.y);
//       ctx.lineTo(kp2.x, kp2.y);
//       ctx.stroke();
//     }
//   });
// }
</script>

<style scoped>
canvas {
  border: 1px solid black;

  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  -moz-transform: rotateY(180deg);
}
</style>
