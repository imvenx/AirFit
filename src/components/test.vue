<template>
    <div class="video-container">
        <video ref="videoRef" autoplay playsinline muted></video>
        <canvas ref="canvasEl"></canvas>
    </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount, onMounted } from 'vue';

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;

onMounted(() => {
    startWebcam();

    // Add event listener for window resize to handle orientation changes
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    // Cleanup event listener
    window.removeEventListener('resize', handleResize);

    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (mediaRecorder) {
        mediaRecorder.stop();
    }
});

const startWebcam = async () => {
    try {
        // Request access to the webcam
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (videoRef.value) {
            videoRef.value.srcObject = mediaStream;

            // Wait for the video metadata to be loaded to get video dimensions
            videoRef.value.onloadedmetadata = () => {
                updateCanvasDimensions();
                drawOnCanvas();
            };

            try {
                await videoRef.value.play();
            } catch (error: any) {
                console.error('Error playing video:', error);
            }
        }

        // Start recording chunks if needed
        startRecordingChunks(mediaStream);
    } catch (error: any) {
        console.error('Error accessing webcam:', error);
    }
};

const handleResize = () => {
    // Update canvas dimensions on window resize
    updateCanvasDimensions();
    drawOnCanvas();
};

const updateCanvasDimensions = () => {
    if (canvasEl.value && videoRef.value) {
        // Set the canvas dimensions to match the video's dimensions
        canvasEl.value.width = videoRef.value.videoWidth;
        canvasEl.value.height = videoRef.value.videoHeight;
    }
};

const drawOnCanvas = () => {
    if (canvasEl.value) {
        const ctx = canvasEl.value.getContext('2d');
        if (ctx) {
            // Clear the canvas
            ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height);

            // Draw a rectangle covering the entire canvas
            ctx.strokeStyle = 'lime';
            ctx.lineWidth = 5;
            ctx.strokeRect(0, 0, canvasEl.value.width, canvasEl.value.height);
        }
    }
};

const startRecordingChunks = (stream: MediaStream) => {
    try {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                // Handle data chunks here if needed
            }
        };

        mediaRecorder.start(500); // Collect chunks every 500ms
    } catch (error: any) {
        console.error('Error creating MediaRecorder:', error);
    }
};
</script>

<style scoped>
/* Ensure the parent elements fill the viewport */
html,
body,
#app {
    height: 100%;
    margin: 0;
}

.video-container {

    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;

    /* Center content */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Debug border */
    border: 3px solid red;
}

.video-container video,
.video-container canvas {
    /* Allow elements to fill the container */
    width: 100%;
    height: 100%;

    /* Maintain aspect ratio */
    object-fit: contain;

    /* Debug border */
    border: 3px solid blue;
}

.video-container canvas {
    /* Position the canvas over the video */
    position: absolute;
    top: 0;
    left: 0;

    /* Debug border */
    border: 3px solid green;
}

video {
    transform: rotateY(180deg);
}
</style>