<template>
    <div
        style="display: flex; flex-direction: column; justify-content: center;
       align-items: center; z-index: 999; position: absolute; left: 0; right: 0%; top: 0; bottom: 0; background-color: cadetblue;">
        <div style="max-width: 90%;">
            <div :style="`visibility:${isGameSceneReady ? 'hidden' : 'visible'}`">
                <div class="text-h2 fadeLoopAnim">
                    {{ $t('game.loading') }}
                </div>
                <hr style="color: azure;" class="fadeLoopAnim">
            </div>
            <div class="text-h5 tipsTextCont" style="text-align: left; color: azure; display: grid;">
                <div style="display: flex; align-items: center; gap: .5rem;">
                    <q-icon name="warning_amber"></q-icon>
                    {{ $t('game.allowCamera') }}
                </div>
                <div style="display: flex; align-items: center; gap: .5rem;">
                    <q-icon name="lightbulb"></q-icon>
                    {{ $t('game.goodIllumination') }}
                </div>
                <div style="display: flex; align-items: center; gap: .5rem;">
                    <q-icon name="laptop"></q-icon>
                    {{ $t('game.takeDistance') }}
                </div>
                <div>
                    <hr style="color: azure;">
                </div>
                {{ $t('game.gameRules') }}
                <div style="display: flex; align-items: center; gap: .5rem;">
                    <div>
                        <q-icon name="back_hand"></q-icon>
                        <q-icon name="bubble_chart"></q-icon>
                    </div>
                    {{ $t('game.popBubbles') }}
                </div>
                <div style="display: flex; align-items: center; gap: .5rem;">
                    <q-icon name="dangerous"></q-icon>
                    <!-- <q-icon name="bubble_chart"></q-icon> -->
                    {{ $t('game.avoidBombs') }}
                </div>
            </div>
            <br>
            <q-btn @click="startGame" class="fadeLoopAnimFast"
                :style="`visibility:${!isGameSceneReady ? 'hidden' : 'visible'}`" style="width: 80%;" size="xl" outline>
                {{ $t('game.start') }}
            </q-btn>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { playGameMusic, stopMainMenuMusic } from 'src/scripts/Audio/AudioUtils';
import { isGameStarted } from 'src/scripts/GameManager';
import { showBubbleBg } from 'src/scripts/UIStore';
import { onMounted } from 'vue';


const props = defineProps<{ isGameSceneReady: boolean }>()

onMounted(() => {
    showBubbleBg.value = true
})

async function startGame() {
    showBubbleBg.value = false
    isGameStarted.value = true

    stopMainMenuMusic()
    await playGameMusic()
}

</script>

<style scoped>
@keyframes fadeLoopAnim {
    50% {
        opacity: .1;
    }
}

.fadeLoopAnim {
    animation: fadeLoopAnim 1s ease-in-out infinite
}

@keyframes fadeLoopAnimFast {
    50% {
        opacity: .5;
    }
}

.fadeLoopAnimFast {
    animation: fadeLoopAnimFast .6s ease-in-out infinite
}

@media (orientation: portrait) {
    .tipsTextCont {
        font-size: 1.2rem;
    }
}
</style>