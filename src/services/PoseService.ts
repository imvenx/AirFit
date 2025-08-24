import { Keypoint, Pose } from "@tensorflow-models/pose-detection";
import { poseKeypointName } from "src/models/models";


let isHitting = false
export function triggerPoses(pose: Pose) {
    // Find the left shoulder and left wrist
    const leftShoulder = pose.keypoints.find((kp) => kp.name === poseKeypointName.left_shoulder);
    const leftElbow = pose.keypoints.find((kp) => kp.name === poseKeypointName.left_elbow);
    const leftWrist = pose.keypoints.find((kp) => kp.name === poseKeypointName.left_wrist);

    // Calculate the distance if both keypoints are detected with sufficient confidence
    if (leftShoulder && leftElbow && leftWrist && leftShoulder.score! > 0.1 && leftElbow.score! > 0.1 && leftWrist.score! > 0.1) {
        checkIfIsPunching(leftShoulder, leftElbow, leftWrist)
    }

    const rightShoulder = pose.keypoints.find((kp) => kp.name === poseKeypointName.right_shoulder);
    const rightElbow = pose.keypoints.find((kp) => kp.name === poseKeypointName.right_elbow);
    const rightWrist = pose.keypoints.find((kp) => kp.name === poseKeypointName.right_wrist);

    // Calculate the distance if both keypoints are detected with sufficient confidence
    if (rightShoulder && rightElbow && rightWrist && rightShoulder.score! > 0.1 && rightElbow.score! > 0.1 && rightWrist.score! > 0.1) {
        checkIfIsPunching(rightShoulder, rightElbow, rightWrist)
    }
}

function checkIfIsPunching(leftShoulder: Keypoint, leftElbow: Keypoint, leftWrist: Keypoint) {
    const distance = calculateDistance(leftShoulder, leftWrist);
    const dy = Math.abs(leftShoulder.y - leftWrist.y)
    const dy2 = Math.abs(leftElbow.y - leftWrist.y)

    if (!isHitting && distance > 150 || dy < 60 && dy2 < 60) {
        isHitting = true
        window.dispatchEvent(new CustomEvent('hit'))

    } else if (distance < 100) {
        isHitting = false
    }
}

function calculateDistance(kp1: Keypoint, kp2: Keypoint): number {
    const dx = kp2.x - kp1.x;
    // const dy = kp2.y - kp1.y;
    return Math.abs(dx);
}

// function calculateDistance(kp1: Keypoint, kp2: Keypoint): number {
//     console.log(kp1)
//     const dx = kp2.x - kp1.x;
//     const dy = kp2.y - kp1.y;
//     return Math.sqrt(dx * dx + dy * dy);
// }