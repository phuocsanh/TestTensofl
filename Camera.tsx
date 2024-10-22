import {useEffect, useRef, useState} from 'react';
import {
  Button,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  PERMISSIONS,
  Permission,
  check as _check,
  request as _request,
  checkNotifications,
  requestNotifications,
} from 'react-native-permissions';
import poseDetection from '@tensorflow-models/pose-detection';
import React from 'react';

export default function CameraScreen() {
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);
  const [model, setModel] = useState<any>(null);
  const [next, setNext] = useState<any>(false);
  const [referenceImage, setReferenceImage] = useState<any>(null);
  const [referencePose, setReferencePose] = useState<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  console.log('🚀 ~ CameraScreen ~ isCameraReady:', isCameraReady);
  const {hasPermission, requestPermission} = useCameraPermission();
  console.log('🚀 ~ CameraScreen ~ hasPermission:', hasPermission);
  useEffect(() => {
    const prepareCamera = async () => {
      try {
        await Camera.requestCameraPermission();
        await Camera.requestMicrophonePermission();
        setIsCameraReady(true);
      } catch (error) {}
    };

    prepareCamera();
  }, []);
  useEffect(() => {
    // loadModel();
  }, []);
  const takeReferenceImage = async () => {
    setNext(true);
    if (cameraRef.current) {
      console.log('🚀 ~ takeReferenceImage ~ cameraRef.current:');
      const photo = await cameraRef.current.takePhoto().catch(e => {
        console.log('err', e);
      });
      console.log('🚀 ~ takeReferenceImage ~ photo:', photo);
      // setReferenceImage(photo.path);
      // console.log('Reference Image:', photo.path);
    }
  };
  const loadModel = async () => {
    const poseModel = await poseDetection.createDetector(
      poseDetection.SupportedModels.BlazePose,
    );
    setModel(poseModel);
  };

  const detectPose = async (imageData: any) => {
    if (model) {
      const poses = await model.estimatePoses(imageData);

      // So sánh tư thế hiện tại với hình mẫu
      if (referenceImage) {
        const isMatching = comparePoses(poses, referencePose);
        if (isMatching) {
          console.log('Pose matches the reference pose!');
        } else {
          console.log('Pose does not match the reference pose.');
        }
      }
    }
  };
  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);
  }, []);

  const comparePoses = (currentPose: any, referencePose: any) => {
    // Ví dụ so sánh đơn giản, bạn có thể thay đổi logic so sánh theo nhu cầu
    if (!currentPose || !referencePose) return false;

    // Lấy tọa độ của các điểm từ pose
    const currentLandmarks =
      currentPose[0]?.keypoints.map((kp: any) => kp.position) || [];
    const referenceLandmarks =
      referencePose[0]?.keypoints.map((kp: any) => kp.position) || [];

    // So sánh các tọa độ (bạn có thể áp dụng ngưỡng so sánh)
    for (let i = 0; i < currentLandmarks.length; i++) {
      const current = currentLandmarks[i];
      const reference = referenceLandmarks[i];
      if (current && reference) {
        const distance = Math.sqrt(
          Math.pow(current.x - reference.x, 2) +
            Math.pow(current.y - reference.y, 2),
        );
        // Kiểm tra xem khoảng cách có nhỏ hơn ngưỡng nhất định hay không
        if (distance > 50) return false; // Ngưỡng 50 pixels (có thể điều chỉnh)
      }
    }
    return true; // Nếu tất cả các điểm đều trong ngưỡng
  };

  return (
    <View style={styles.container}>
      {!hasPermission && (
        <View>
          <Text style={styles.message}>
            We need your permission to show the camera
          </Text>
          <Button
            onPress={() =>
              _request(
                Platform.OS === 'ios'
                  ? 'ios.permission.CAMERA'
                  : 'android.permission.CAMERA',
              )
            }
            title="grant permission"
          />
        </View>
      )}
      <View style={{flex: 0.2}}>
        {!next ? (
          <Pressable style={{marginTop: 40}} onPress={takeReferenceImage}>
            <Text>Chụp ảnh mẫu</Text>
          </Pressable>
        ) : (
          <Pressable style={{marginTop: 40}} onPress={() => setNext(true)}>
            <Text>Next</Text>
          </Pressable>
        )}
      </View>
      <View style={{flex: 1}}>
        {device != null && hasPermission && (
          <>
            <Camera
              style={StyleSheet.absoluteFillObject}
              frameProcessor={frameProcessor}
              device={device}
              isActive
              ref={cameraRef}
            />
            {/* {next ? (
              <Camera
                style={StyleSheet.absoluteFillObject}
                frameProcessor={frameProcessor}
                device={device}
                isActive
                ref={cameraRef}
              />
            ) : (
              <Camera
                style={StyleSheet.absoluteFillObject}
                device={device}
                isActive
                ref={cameraRef}
                photo
              />
            )} */}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 100,
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
