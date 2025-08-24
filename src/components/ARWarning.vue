<template>
    <div v-if="showWarning" class="safety-warning-overlay">
        <div class="warning-content">
            <h4>{{ $t('safety.title') }}</h4>
            <p>
                {{ $t('safety.supervision') }}
            </p>
            <p>
                {{ $t('safety.surroundings') }}
            </p>
            <p>
                {{ $t('safety.privacy') }}
            </p>
            <button @click="dismissWarning">{{ $t('safety.understand') }}</button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { appConfig } from 'src/config/appConfig'

const showWarning = ref(!appConfig.value.devMode);

function dismissWarning() {
    showWarning.value = false;
}
</script>

<style scoped>
.safety-warning-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.warning-content {
    text-align: center;
    background: #222;
    padding: 20px;
    font-size: 1.1rem;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
}

button {
    margin-top: 20px;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

button:hover {
    background: #0056b3;
}
</style>