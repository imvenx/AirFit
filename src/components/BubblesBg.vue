<template>
    <!-- <canvas ref="canvasEl"
        style="pointer-events: none; width: 100%; height: 100%; z-index: 999; border: 10px solid red; position: absolute; top: 0%; bottom: 0%; left: 0; right: 0;"></canvas> -->
    <div class="bubble-background"
        style="pointer-events: none; position: absolute; z-index: 999; top: 0; bottom: 0; right: 0; left: 0">
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>
    </div>

</template>

<script lang="ts" setup>

</script>

<style scoped>
/* Bubble background styling */
.bubble-background {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
}

/* Bubble styling */
.bubble {
    position: absolute;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1));
    border-radius: 50%;
    opacity: 0.6;
    animation: float 20s infinite ease-in-out;
    animation-delay: calc(-3s * var(--i));
}

/* Float animation */
@keyframes float {

    0%,
    100% {
        transform: translateY(0) translateX(0) scale(1);
    }

    50% {
        transform: translateY(-35px) translateX(35px) scale(1.1);
    }
}

/* Generate multiple bubbles with varying positions across full screen */
.bubble:nth-child(1) {
    --i: 1;
    left: 8%;
    top: 5%;
    width: 60px;
    height: 60px;
}

.bubble:nth-child(2) {
    --i: 2;
    left: 25%;
    top: 15%;
    width: 80px;
    height: 80px;
}

.bubble:nth-child(3) {
    --i: 3;
    left: 45%;
    top: 8%;
    width: 70px;
    height: 70px;
}

.bubble:nth-child(4) {
    --i: 4;
    left: 65%;
    top: 20%;
    width: 90px;
    height: 90px;
}

.bubble:nth-child(5) {
    --i: 5;
    left: 85%;
    top: 12%;
    width: 75px;
    height: 75px;
}

.bubble:nth-child(6) {
    --i: 6;
    left: 12%;
    top: 45%;
    width: 85px;
    height: 85px;
}

.bubble:nth-child(7) {
    --i: 7;
    left: 35%;
    top: 55%;
    width: 65px;
    height: 65px;
}

.bubble:nth-child(8) {
    --i: 8;
    left: 58%;
    top: 40%;
    width: 95px;
    height: 95px;
}

.bubble:nth-child(9) {
    --i: 9;
    left: 78%;
    top: 65%;
    width: 70px;
    height: 70px;
}

.bubble:nth-child(10) {
    --i: 10;
    left: 92%;
    top: 35%;
    width: 80px;
    height: 80px;
}

.bubble:nth-child(11) {
    --i: 11;
    left: 18%;
    top: 75%;
    width: 75px;
    height: 75px;
}

.bubble:nth-child(12) {
    --i: 12;
    left: 40%;
    top: 85%;
    width: 85px;
    height: 85px;
}

.bubble:nth-child(13) {
    --i: 13;
    left: 62%;
    top: 78%;
    width: 65px;
    height: 65px;
}

.bubble:nth-child(14) {
    --i: 14;
    left: 80%;
    top: 88%;
    width: 90px;
    height: 90px;
}

.bubble:nth-child(15) {
    --i: 15;
    left: 5%;
    top: 25%;
    width: 70px;
    height: 70px;
}
</style>