import { Alert } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GLView } from 'expo-gl';
import * as tf from '@tensorflow/tfjs';
import * as tfReactNative from '@tensorflow/tfjs-react-native';

const DEFAULT_BLOCK_THRESHOLD = 0.6;
const MODEL_INPUT_SIZE = 224;
const FAIL_OPEN_WHEN_SCAN_UNAVAILABLE = __DEV__;
const NSFW_CLASS_NAMES = ['Drawing', 'Hentai', 'Neutral', 'Porn', 'Sexy'];
const CLASS_BLOCK_THRESHOLDS = Object.freeze({
  Porn: 0.5,
  Hentai: 0.5,
  Sexy: 0.6,
});
const COMBINED_EXPLICIT_THRESHOLD = 0.75;
const NSFW_LOCAL_MODEL_JSON = require('../../assets/models/nsfw_mobilenet_v2/model.json');
const NSFW_LOCAL_WEIGHT_BIN = require('../../assets/models/nsfw_mobilenet_v2/group1-shard1of1.bin');
const CLASSIFICATION_CACHE_LIMIT = 40;

let tfReadyPromise = null;
let modelPromise = null;
const classificationCache = new Map();

const getCachedClassification = (imageUri) => {
  const cachedPredictions = classificationCache.get(imageUri);
  if (!cachedPredictions) {
    return null;
  }

  // Refresh insertion order so recently used entries stay hot.
  classificationCache.delete(imageUri);
  classificationCache.set(imageUri, cachedPredictions);
  return cachedPredictions;
};

const cacheClassification = (imageUri, predictions) => {
  if (!imageUri || !Array.isArray(predictions)) {
    return;
  }

  if (classificationCache.has(imageUri)) {
    classificationCache.delete(imageUri);
  }

  classificationCache.set(imageUri, predictions);

  if (classificationCache.size > CLASSIFICATION_CACHE_LIMIT) {
    const firstKey = classificationCache.keys().next().value;
    if (firstKey !== undefined) {
      classificationCache.delete(firstKey);
    }
  }
};

const createModerationError = (code, details = {}) => {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  return error;
};

// eslint-disable-next-line no-unused-vars
const logNsfwDebug = (_message, _details) => {};
// eslint-disable-next-line no-unused-vars
const logNsfwError = (_message, _details) => {};

const ensureTfBackendReady = async () => {
  if (!tfReadyPromise) {
    tfReadyPromise = (async () => {
      logNsfwDebug('Initializing TensorFlow backend');
      await tf.ready();

      const hasExpoGl = !!GLView;
      const preferredBackend = hasExpoGl ? 'rn-webgl' : 'cpu';
      logNsfwDebug('Selected preferred backend', {
        hasExpoGl,
        preferredBackend,
        currentBackend: tf.getBackend(),
      });

      if (tf.getBackend() !== preferredBackend) {
        try {
          await tf.setBackend(preferredBackend);
          logNsfwDebug('Backend set successfully', {
            backend: preferredBackend,
          });
        } catch (error) {
          logNsfwDebug('Preferred backend failed, attempting cpu fallback', {
            preferredBackend,
            error: error?.message || 'unknown',
          });
          if (preferredBackend !== 'cpu') {
            await tf.setBackend('cpu');
            logNsfwDebug('CPU backend fallback succeeded');
          } else {
            throw error;
          }
        }
      }

      await tf.ready();
      logNsfwDebug('TensorFlow backend ready', {
        activeBackend: tf.getBackend(),
      });
    })();
  }

  return tfReadyPromise;
};

const loadModel = async () => {
  logNsfwDebug('Loading bundled NSFW MobileNetV2 layers model');

  const modelIOHandler = tfReactNative.bundleResourceIO(
    NSFW_LOCAL_MODEL_JSON,
    NSFW_LOCAL_WEIGHT_BIN
  );
  const loadedModel = await tf.loadLayersModel(modelIOHandler);

  logNsfwDebug('Bundled NSFW MobileNetV2 model loaded successfully');
  return loadedModel;
};

const ensureModelLoaded = async () => {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureTfBackendReady();
      return loadModel();
    })();
  }

  return modelPromise;
};

const decodeImageUriToTensor = async (imageUri) => {
  logNsfwDebug('Decoding image uri to tensor', {
    imageUriPreview: String(imageUri || '').slice(0, 120),
  });

  const imageData = await manipulateAsync(
    imageUri,
    [
      {
        resize: {
          width: MODEL_INPUT_SIZE,
          height: MODEL_INPUT_SIZE,
        },
      },
    ],
    {
      compress: 1,
      format: SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!imageData?.base64) {
    throw createModerationError('NSFW_SCAN_FAILED');
  }

  const imageBytes = tf.util.encodeString(imageData.base64, 'base64');
  logNsfwDebug('Image decoded to base64 successfully', {
    base64Length: imageData.base64.length,
  });
  return tfReactNative.decodeJpeg(imageBytes, 3);
};

const translate = (t, key) => (typeof t === 'function' ? t(key) : key);

const shouldShowAlert = (t) => typeof t === 'function';

export const isLikelyImageFile = ({ mimeType = '', fileName = '' } = {}) => {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (normalizedMimeType.startsWith('image/')) {
    return true;
  }

  const loweredName = String(fileName || '').toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/.test(loweredName);
};

export const classifyImageNsfw = async ({ imageUri }) => {
  if (!imageUri) {
    throw createModerationError('NSFW_SCAN_FAILED');
  }

  const cachedPredictions = getCachedClassification(imageUri);
  if (cachedPredictions) {
    logNsfwDebug('Using cached NSFW classification', {
      imageUriPreview: String(imageUri || '').slice(0, 120),
      topPrediction: cachedPredictions[0] || null,
    });
    return cachedPredictions;
  }

  logNsfwDebug('Starting NSFW classification', {
    imageUriPreview: String(imageUri || '').slice(0, 120),
  });

  await ensureTfBackendReady();
  const model = await ensureModelLoaded();
  const tensor = await decodeImageUriToTensor(imageUri);
  const expandedTensor = tensor.expandDims(0);
  const normalizedTensor = expandedTensor.toFloat().div(255);

  try {
    const rawPrediction = model.predict(normalizedTensor);
    const outputTensor = Array.isArray(rawPrediction) ? rawPrediction[0] : rawPrediction;

    const scores = Array.from(await outputTensor.data());
    const predictions = scores
      .map((probability, index) => ({
        className: NSFW_CLASS_NAMES[index] || `Unknown_${index}`,
        probability,
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    logNsfwDebug('Classification finished', {
      topPrediction: predictions?.[0] || null,
    });

    cacheClassification(imageUri, predictions);

    if (outputTensor !== rawPrediction && Array.isArray(rawPrediction)) {
      rawPrediction.forEach((predictionTensor) => {
        if (predictionTensor && typeof predictionTensor.dispose === 'function') {
          predictionTensor.dispose();
        }
      });
    } else if (rawPrediction && typeof rawPrediction.dispose === 'function') {
      rawPrediction.dispose();
    }

    return predictions;
  } finally {
    normalizedTensor.dispose();
    expandedTensor.dispose();
    tensor.dispose();
  }
};

export const warmupNsfwModel = async () => {
  logNsfwDebug('Warmup started');
  await ensureTfBackendReady();
  const model = await ensureModelLoaded();

  // Run one lightweight inference to compile kernels before first real user upload.
  const warmupInput = tf.zeros([1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3]);
  const warmupPrediction = model.predict(warmupInput);

  if (Array.isArray(warmupPrediction)) {
    warmupPrediction.forEach((predictionTensor) => {
      if (predictionTensor && typeof predictionTensor.dispose === 'function') {
        predictionTensor.dispose();
      }
    });
  } else if (warmupPrediction && typeof warmupPrediction.dispose === 'function') {
    warmupPrediction.dispose();
  }

  warmupInput.dispose();
  logNsfwDebug('Warmup completed');
};

export const enforceNsfwImagePolicy = async ({
  imageUri,
  t,
  threshold = DEFAULT_BLOCK_THRESHOLD,
} = {}) => {
  try {
    logNsfwDebug('Enforcing NSFW policy', {
      imageUriPreview: String(imageUri || '').slice(0, 120),
      threshold,
    });

    const predictions = await classifyImageNsfw({ imageUri });
    const probabilityByClass = predictions.reduce((accumulator, prediction) => {
      const className = String(prediction?.className || '');
      accumulator[className] = Number(prediction?.probability || 0);
      return accumulator;
    }, {});

    const explicitScore =
      Number(probabilityByClass.Porn || 0) +
      Number(probabilityByClass.Hentai || 0) +
      Number(probabilityByClass.Sexy || 0);

    const violatingPrediction = predictions.find((prediction) => {
      const probability = Number(prediction?.probability || 0);
      const classThreshold = CLASS_BLOCK_THRESHOLDS[prediction?.className];

      if (typeof classThreshold !== 'number') {
        return false;
      }

      const effectiveThreshold = Math.min(threshold, classThreshold);
      return probability >= effectiveThreshold;
    });

    const combinedExplicitViolation = explicitScore >= COMBINED_EXPLICIT_THRESHOLD;

    if (violatingPrediction || combinedExplicitViolation) {
      if (shouldShowAlert(t)) {
        Alert.alert(
          translate(t, 'moderation.nsfwBlockedTitle'),
          translate(t, 'moderation.nsfwBlockedMessage')
        );
      }

      const violationClassName = violatingPrediction
        ? violatingPrediction.className
        : 'CombinedExplicit';
      const violationProbability = violatingPrediction
        ? Number(violatingPrediction.probability || 0)
        : explicitScore;

      throw createModerationError('NSFW_IMAGE_BLOCKED', {
        className: violationClassName,
        probability: violationProbability,
        explicitScore,
        predictions,
      });
    }

    logNsfwDebug('Image passed NSFW policy', {
      threshold,
      topPrediction: predictions[0] || null,
    });

    return {
      allowed: true,
      predictions,
    };
  } catch (error) {
    const failureDetails = {
      code: error?.code || 'UNKNOWN',
      message: error?.message || 'unknown',
      details: error?.details || null,
      imageUriPreview: String(imageUri || '').slice(0, 120),
    };

    logNsfwError('NSFW policy check failed', failureDetails);

    const underlyingErrorMessage =
      error?.details?.originalError ||
      error?.details?.message ||
      error?.message ||
      'unknown';

    if (error?.code === 'NSFW_IMAGE_BLOCKED') {
      throw error;
    }

    if (shouldShowAlert(t)) {
      const debugSuffix = __DEV__
        ? `\n\nDebug: ${underlyingErrorMessage}`
        : '';

      Alert.alert(
        translate(t, 'moderation.nsfwScanUnavailableTitle'),
        `${translate(t, 'moderation.nsfwScanUnavailableMessage')}${debugSuffix}`
      );
    }

    if (FAIL_OPEN_WHEN_SCAN_UNAVAILABLE) {
      logNsfwError('Fail-open enabled for development: allowing image despite scan failure', {
        reason: underlyingErrorMessage,
      });

      return {
        allowed: true,
        predictions: [],
        scanSkipped: true,
        scanFailureReason: underlyingErrorMessage,
      };
    }

    throw createModerationError('NSFW_SCAN_FAILED', {
      originalError: underlyingErrorMessage,
      diagnostics: failureDetails,
    });
  }
};
