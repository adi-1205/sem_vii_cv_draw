import cv2
import mediapipe as mp
import asyncio
import websockets
import json

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands()
mp_drawing = mp.solutions.drawing_utils

# WebSocket server
async def hand_landmark_server(websocket):
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    while True:
        ret, frame = cap.read()

        if not ret:
            print("Error: Could not read frame.")
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb_frame)

        keypoints = []
        if result.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(result.multi_hand_landmarks, result.multi_handedness):
                hand_label = handedness.classification[0].label  # 'Left' or 'Right'
                hand_data = []
                for landmark in hand_landmarks.landmark:
                    hand_data.append({
                        'x': landmark.x,
                        'y': landmark.y,
                        'z': landmark.z,
                        'hand': hand_label
                    })
                keypoints.append(hand_data)
        
        if keypoints:
            await websocket.send(json.dumps(keypoints))
        else:
            await websocket.send(json.dumps([]))

        await asyncio.sleep(0.016)

    cap.release()

async def start_server():
    async with websockets.serve(hand_landmark_server, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(start_server())