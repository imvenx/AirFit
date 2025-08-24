<template>
  <div>
    <video ref="video" autoplay playsinline style="display: none;"></video>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, onBeforeMount } from 'vue';
import { setBackend } from '@tensorflow/tfjs';
import { Keypoint, Pose, PoseDetector, SupportedModels, createDetector, movenet, util } from '@tensorflow-models/pose-detection';
import { poseKeypointName } from 'src/models/models';
import { triggerPoses } from 'src/services/PoseService';
// import '@tensorflow/tfjs-backend-webgl';
// import { BlazePose } from '@tensorflow-models/pose-detection';


const video = ref<any>(null);
const canvas = ref<any>(null);
let ctx: any = null;
let detector: PoseDetector | null = null;
onBeforeMount(async () => {
  detector = await createDetector(SupportedModels.BlazePose, {
    runtime: 'tfjs', // or 'mediapipe' if you prefer
    modelType: 'full', // 'lite', 'full', or 'heavy' (full and heavy support 3D)
    enableSmoothing: true,
  });
})

let animationFrameId: any = null;

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

async function detectPose() {
  animationFrameId = requestAnimationFrame(detectPose);

  if (video.value.readyState < 2) {
    return;
  }

  const poses = await detector?.estimatePoses(video.value);

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);

  if (poses && poses.length > 0) {
    drawResult(poses[0]);
    triggerPoses(poses[0])
  }
}

function drawResult(pose: Pose) {
  if (pose.keypoints) {
    drawKeypoints(pose.keypoints);
    drawSkeleton(pose.keypoints);
  }
}

function drawKeypoints(keypoints: Keypoint[]) {
  const radius = 5;
  keypoints.forEach((keypoint: Keypoint) => {
    // if (keypoint.name == keypointName.left_wrist) {
    //   console.log(keypoint.score)
    // }
    if (keypoint.score && keypoint.score > 0.1) {
      const { x, y } = keypoint;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  });
}

function drawSkeleton(keypoints: Keypoint[]) {
  const adjacentPairs = util.getAdjacentPairs(
    SupportedModels.MoveNet
  );

  ctx.strokeStyle = 'green';
  ctx.lineWidth = 2;

  adjacentPairs.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    if (kp1.score && kp2.score &&
      kp1.score > 0.5 && kp2.score > 0.5) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
}

onMounted(async () => {
  await setBackend('webgl');

  // Load the MoveNet model
  detector = await createDetector(
    SupportedModels.MoveNet,
    {
      modelType: movenet.modelType.SINGLEPOSE_LIGHTNING,
    }
  );

  // Initialize the camera
  await setupCamera();

  ctx = canvas.value.getContext('2d');

  // Start the pose detection loop
  detectPose();
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (detector) {
    detector.dispose();
  }
});
</script>

<style scoped>
canvas {
  border: 1px solid black;
}
</style>
